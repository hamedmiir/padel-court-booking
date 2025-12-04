'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { initiatePayment } from '@/lib/payment';

/**
 * Get user's wallet balance
 */
export async function getWalletBalance() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    let wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    });

    // Create wallet if it doesn't exist
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: session.user.id,
          balance: 0,
        },
      });
    }

    return {
      success: true,
      balance: Number(wallet.balance),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت موجودی کیف پول',
    };
  }
}

/**
 * Charge wallet with custom amount
 */
const chargeWalletSchema = z.object({
  amount: z.number().min(1000, 'حداقل مبلغ شارژ ۱۰۰۰ تومان است'),
});

export async function chargeWallet(
  formData: FormData
): Promise<
  | { success: true; transactionId: string; message: string }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    const rawData = {
      amount: formData.get('amount') as string,
    };

    const validatedData = chargeWalletSchema.parse({
      amount: parseFloat(rawData.amount),
    });

    // Process payment via gateway
    const paymentResult = await initiatePayment(validatedData.amount, 'wallet-charge');

    if (!paymentResult.success) {
      return {
        success: false,
        error: 'پرداخت ناموفق بود',
      };
    }

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: session.user.id,
          balance: 0,
        },
      });
    }

    // Add transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: validatedData.amount,
        type: 'CHARGE',
        description: `شارژ کیف پول به مبلغ ${validatedData.amount.toLocaleString('fa-IR')} تومان`,
        status: 'COMPLETED',
      },
    });

    // Update wallet balance
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: validatedData.amount,
        },
      },
    });

    return {
      success: true,
      transactionId: paymentResult.transactionId,
      message: `کیف پول شما به مبلغ ${validatedData.amount.toLocaleString('fa-IR')} تومان شارژ شد`,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'اطلاعات وارد شده معتبر نیست',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در شارژ کیف پول',
    };
  }
}

/**
 * Get wallet transactions
 */
export async function getWalletTransactions() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
      },
    });

    if (!wallet) {
      return {
        success: true,
        transactions: [],
      };
    }

    return {
      success: true,
      transactions: wallet.transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت تراکنش‌ها',
    };
  }
}

/**
 * Pay from wallet
 */
export async function payFromWallet(
  amount: number,
  bookingId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    let wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: session.user.id,
          balance: 0,
        },
      });
    }

    if (Number(wallet.balance) < amount) {
      return {
        success: false,
        error: 'موجودی کیف پول کافی نیست',
      };
    }

    // Create transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        bookingId,
        amount: -amount, // Negative for payment
        type: 'PAYMENT',
        description: `پرداخت رزرو به مبلغ ${amount.toLocaleString('fa-IR')} تومان`,
        status: 'COMPLETED',
      },
    });

    // Update wallet balance
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در پرداخت از کیف پول',
    };
  }
}

/**
 * Refund to wallet (for cancellations)
 */
export async function refundToWallet(
  userId: string,
  amount: number,
  bookingId: string,
  description?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    // Create transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        bookingId,
        amount,
        type: 'CANCELLATION_REFUND',
        description: description || `بازگشت وجه لغو رزرو به مبلغ ${amount.toLocaleString('fa-IR')} تومان`,
        status: 'COMPLETED',
      },
    });

    // Update wallet balance
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در بازگشت وجه',
    };
  }
}

/**
 * Deduct from field owner wallet (for refunds)
 */
export async function deductFromFieldOwnerWallet(
  fieldOwnerId: string,
  amount: number,
  bookingId: string,
  description?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId: fieldOwnerId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: fieldOwnerId,
          balance: 0,
        },
      });
    }

    // Check if field owner has enough balance
    if (Number(wallet.balance) < amount) {
      return {
        success: false,
        error: 'موجودی کیف پول صاحب زمین کافی نیست',
      };
    }

    // Create transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        bookingId,
        amount: -amount, // Negative for deduction
        type: 'REFUND',
        description: description || `بازگشت وجه به کاربر به مبلغ ${amount.toLocaleString('fa-IR')} تومان`,
        status: 'COMPLETED',
      },
    });

    // Update wallet balance
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در کسر از کیف پول',
    };
  }
}

