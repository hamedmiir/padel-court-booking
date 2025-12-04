'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const sendOtpSchema = z.object({
  identifier: z.string().min(1, 'ایمیل یا شماره تلفن الزامی است'),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(1, 'ایمیل یا شماره تلفن الزامی است'),
  code: z.string().length(6, 'کد باید ۶ رقم باشد'),
});

/**
 * Generate a 6-digit OTP code
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if identifier is email or phone
 */
function isEmail(identifier: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

/**
 * Send OTP code (mock implementation for MVP)
 * TODO: Integrate with SMS/Email service
 */
export async function sendOtp(
  formData: FormData
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const rawData = {
      identifier: formData.get('identifier') as string,
    };

    const validatedData = sendOtpSchema.parse(rawData);
    const identifier = validatedData.identifier.trim();

    // Generate OTP
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Check if identifier is email or phone
    const isEmailIdentifier = isEmail(identifier);

    // Delete old OTPs for this identifier
    await prisma.otpCode.deleteMany({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
      },
    });

    // Create new OTP
    await prisma.otpCode.create({
      data: {
        phone: isEmailIdentifier ? '' : identifier,
        email: isEmailIdentifier ? identifier : null,
        code,
        expiresAt,
      },
    });

    // TODO: Send SMS or Email
    // For MVP, we'll log it (in production, remove this)
    console.log(`OTP for ${identifier}: ${code}`);

    return {
      success: true,
      message: `کد تأیید به ${isEmailIdentifier ? 'ایمیل' : 'شماره تلفن'} شما ارسال شد`,
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
      error: 'خطا در ارسال کد تأیید. لطفاً دوباره تلاش کنید',
    };
  }
}

/**
 * Verify OTP and sign in/up user
 */
export async function verifyOtp(
  formData: FormData
): Promise<
  | { success: true; userId: string; isNewUser: boolean }
  | { success: false; error: string }
> {
  try {
    const rawData = {
      identifier: formData.get('identifier') as string,
      code: formData.get('code') as string,
    };

    const validatedData = verifyOtpSchema.parse(rawData);
    const identifier = validatedData.identifier.trim();
    const code = validatedData.code;

    const isEmailIdentifier = isEmail(identifier);

    // Find OTP
    const otp = await prisma.otpCode.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
        code,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otp) {
      return {
        success: false,
        error: 'کد تأیید معتبر نیست',
      };
    }

    // Check if expired
    if (new Date() > otp.expiresAt) {
      await prisma.otpCode.delete({
        where: { id: otp.id },
      });
      return {
        success: false,
        error: 'کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید',
      };
    }

    // Mark OTP as verified
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
      },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          phone: isEmailIdentifier ? null : identifier,
          email: isEmailIdentifier ? identifier : null,
          phoneVerified: !isEmailIdentifier,
          emailVerified: isEmailIdentifier,
        },
      });
    } else {
      // Update verification status
      await prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: !isEmailIdentifier || user.phoneVerified,
          emailVerified: isEmailIdentifier || user.emailVerified,
        },
      });
    }

    // Clean up old OTPs
    await prisma.otpCode.deleteMany({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
        verified: true,
        createdAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000), // Older than 10 minutes
        },
      },
    });

    return {
      success: true,
      userId: user.id,
      isNewUser,
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
      error: 'خطا در تأیید کد. لطفاً دوباره تلاش کنید',
    };
  }
}

