'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { refundToWallet, deductFromFieldOwnerWallet } from '@/app/actions/wallet';

/**
 * Create or update cancellation policy for a court
 */
const cancellationPolicySchema = z.object({
  courtId: z.string().uuid('شناسه زمین معتبر نیست'),
  hoursBeforeStart: z.number().int().min(0, 'ساعات قبل از شروع باید مثبت باشد'),
  refundPercentage: z.number().int().min(0).max(100, 'درصد بازگشت باید بین ۰ تا ۱۰۰ باشد'),
  description: z.string().optional(),
});

export async function setCancellationPolicy(
  formData: FormData
): Promise<
  | { success: true; policyId: string; message: string }
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
      courtId: formData.get('courtId') as string,
      hoursBeforeStart: formData.get('hoursBeforeStart') as string,
      refundPercentage: formData.get('refundPercentage') as string,
      description: formData.get('description') as string,
    };

    const validatedData = cancellationPolicySchema.parse({
      courtId: rawData.courtId,
      hoursBeforeStart: parseInt(rawData.hoursBeforeStart, 10),
      refundPercentage: parseInt(rawData.refundPercentage, 10),
      description: rawData.description,
    });

    // Check if user owns the court or is admin
    const court = await prisma.court.findUnique({
      where: { id: validatedData.courtId },
    });

    if (!court) {
      return {
        success: false,
        error: 'زمین یافت نشد',
      };
    }

    if (court.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return {
        success: false,
        error: 'شما اجازه تنظیم سیاست لغو برای این زمین را ندارید',
      };
    }

    // Create or update policy
    const policy = await prisma.cancellationPolicy.upsert({
      where: { courtId: validatedData.courtId },
      update: {
        hoursBeforeStart: validatedData.hoursBeforeStart,
        refundPercentage: validatedData.refundPercentage,
        description: validatedData.description || null,
      },
      create: {
        courtId: validatedData.courtId,
        hoursBeforeStart: validatedData.hoursBeforeStart,
        refundPercentage: validatedData.refundPercentage,
        description: validatedData.description || null,
      },
    });

    return {
      success: true,
      policyId: policy.id,
      message: 'سیاست لغو با موفقیت تنظیم شد',
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
      error: error instanceof Error ? error.message : 'خطا در تنظیم سیاست لغو',
    };
  }
}

/**
 * Request cancellation for a booking
 */
export async function requestCancellation(
  bookingId: string,
  reason?: string
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: {
          include: {
            cancellationPolicy: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        success: false,
        error: 'رزرو یافت نشد',
      };
    }

    // Check if user owns the booking
    if (booking.userId !== session.user.id) {
      return {
        success: false,
        error: 'شما اجازه لغو این رزرو را ندارید',
      };
    }

    // Check if booking can be cancelled
    if (booking.status !== 'CONFIRMED') {
      return {
        success: false,
        error: 'این رزرو قابل لغو نیست',
      };
    }

    // Check cancellation policy
    const policy = booking.court.cancellationPolicy;
    if (!policy) {
      return {
        success: false,
        error: 'سیاست لغو برای این زمین تنظیم نشده است',
      };
    }

    // Check if cancellation is allowed based on time
    const now = new Date();
    const hoursUntilStart = (booking.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < policy.hoursBeforeStart) {
      return {
        success: false,
        error: `لغو رزرو باید حداقل ${policy.hoursBeforeStart} ساعت قبل از زمان شروع انجام شود`,
      };
    }

    // Update booking status
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLATION_REQUESTED',
        cancellationRequestedAt: new Date(),
        cancellationReason: reason || null,
      },
    });

    return {
      success: true,
      message: 'درخواست لغو با موفقیت ثبت شد. در انتظار تأیید صاحب زمین',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ثبت درخواست لغو',
    };
  }
}

/**
 * Verify cancellation (Field Owner or Admin)
 */
export async function verifyCancellation(
  bookingId: string,
  approved: boolean
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: {
          include: {
            cancellationPolicy: true,
            owner: true,
          },
        },
        user: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        error: 'رزرو یافت نشد',
      };
    }

    // Check if court has an owner
    const courtOwnerId = booking.court.ownerId;
    
    if (!courtOwnerId) {
      return {
        success: false,
        error: 'این زمین صاحب ندارد. فقط زمین‌های دارای صاحب می‌توانند لغو و بازگشت وجه داشته باشند',
      };
    }

    // Check if user is the field owner of this court
    // Only the actual field owner can verify cancellations (admins cannot verify for other owners' courts)
    const isFieldOwner = courtOwnerId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isFieldOwner) {
      // Admins can view but not verify cancellations - only field owners can verify
      return {
        success: false,
        error: 'فقط صاحب زمین می‌تواند لغو را تأیید کند',
      };
    }

    if (booking.status !== 'CANCELLATION_REQUESTED') {
      return {
        success: false,
        error: 'این رزرو درخواست لغو ندارد',
      };
    }

    if (approved) {
      // Calculate refund amount
      const policy = booking.court.cancellationPolicy;
      if (!policy) {
        return {
          success: false,
          error: 'سیاست لغو یافت نشد',
        };
      }

      const refundAmount = (Number(booking.totalPrice) * policy.refundPercentage) / 100;

      // Use the court owner ID (already validated above that it exists)
      // This ensures refunds come from the actual field owner's wallet, not admin's wallet
      const fieldOwnerId = courtOwnerId!; // Safe because we checked it's not null above

      // Deduct from field owner wallet (the actual court owner)
      const deductResult = await deductFromFieldOwnerWallet(
        fieldOwnerId,
        refundAmount,
        bookingId,
        `بازگشت وجه لغو رزرو - ${policy.refundPercentage}%`
      );

      if (!deductResult.success) {
        return {
          success: false,
          error: deductResult.error || 'خطا در کسر از کیف پول صاحب زمین',
        };
      }

      // Refund to user wallet
      const refundResult = await refundToWallet(
        booking.userId,
        refundAmount,
        bookingId,
        `بازگشت وجه لغو رزرو - ${policy.refundPercentage}%`
      );

      if (!refundResult.success) {
        return {
          success: false,
          error: refundResult.error || 'خطا در بازگشت وجه به کیف پول کاربر',
        };
      }

      // Update booking status
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLATION_VERIFIED',
          cancellationVerifiedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `لغو رزرو تأیید شد و مبلغ ${refundAmount.toLocaleString('fa-IR')} تومان به کیف پول کاربر بازگشت داده شد`,
      };
    } else {
      // Reject cancellation
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLATION_REJECTED',
          cancellationRejectedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'درخواست لغو رد شد',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در تأیید لغو',
    };
  }
}

/**
 * Get cancellation requests for field owner
 */
export async function getCancellationRequests(
  startDate?: string,
  endDate?: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (user.role !== 'FIELD_OWNER' && user.role !== 'ADMIN')) {
      return {
        success: false,
        error: 'شما اجازه دسترسی به این بخش را ندارید',
      };
    }

    // Build where clause
    const whereClause: any = {
      status: 'CANCELLATION_REQUESTED',
      court: {
        OR: [
          { ownerId: session.user.id },
          ...(user.role === 'ADMIN' ? [{}] : []), // Admin can see all
        ],
      },
    };

    // Add date range filter
    if (startDate || endDate) {
      whereClause.cancellationRequestedAt = {};
      if (startDate) {
        whereClause.cancellationRequestedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of day
        whereClause.cancellationRequestedAt.lte = endDateObj;
      }
    }

    // Get bookings with cancellation requests for courts owned by user
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        court: {
          include: {
            cancellationPolicy: true,
          },
        },
      },
      orderBy: {
        cancellationRequestedAt: 'desc',
      },
    });

    return {
      success: true,
      requests: bookings.map((booking) => ({
        id: booking.id,
        userName: booking.user.name || booking.user.email,
        userEmail: booking.user.email,
        courtName: booking.court.name,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        totalPrice: Number(booking.totalPrice),
        refundAmount: booking.court.cancellationPolicy
          ? (Number(booking.totalPrice) * booking.court.cancellationPolicy.refundPercentage) / 100
          : 0,
        cancellationReason: booking.cancellationReason,
        requestedAt: booking.cancellationRequestedAt?.toISOString(),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت درخواست‌های لغو',
    };
  }
}

