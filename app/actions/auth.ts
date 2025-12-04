'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { signIn } from '@/auth';

const updateProfileSchema = z.object({
  name: z.string().min(1, 'نام الزامی است').optional(),
  family: z.string().optional(),
  email: z.string().email('ایمیل معتبر نیست').optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  height: z.number().int().positive().optional().or(z.literal('')),
});

export type AuthActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

/**
 * Complete user registration/profile after OTP verification
 */
export async function completeRegistration(
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const userId = formData.get('userId') as string;
    if (!userId) {
      return {
        success: false,
        error: 'شناسه کاربری یافت نشد',
      };
    }

    const rawData = {
      name: formData.get('name') as string,
      family: formData.get('family') as string,
      email: formData.get('email') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
      gender: formData.get('gender') as string,
      height: formData.get('height') as string,
    };

    const validatedData = updateProfileSchema.parse({
      name: rawData.name || undefined,
      family: rawData.family || undefined,
      email: rawData.email || undefined,
      dateOfBirth: rawData.dateOfBirth || undefined,
      gender: rawData.gender || undefined,
      height: rawData.height ? parseInt(rawData.height) : undefined,
    });

    // Check if email is already taken by another user
    if (validatedData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'این ایمیل قبلاً ثبت شده است',
        };
      }
    }

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: validatedData.name,
        family: validatedData.family,
        email: validatedData.email || null,
        dateOfBirth: validatedData.dateOfBirth
          ? new Date(validatedData.dateOfBirth)
          : null,
        gender: validatedData.gender,
        height: validatedData.height,
        emailVerified: validatedData.email ? true : undefined,
      },
    });

    return {
      success: true,
      message: 'اطلاعات با موفقیت ثبت شد',
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
      error: 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید',
    };
  }
}

/**
 * Sign in user after OTP verification
 */
export async function signInUser(userId: string): Promise<AuthActionResult> {
  try {
    await signIn('credentials', {
      userId,
      redirect: false,
    });

    return {
      success: true,
      message: 'ورود با موفقیت انجام شد',
    };
  } catch (error) {
    return {
      success: false,
      error: 'خطا در ورود. لطفاً دوباره تلاش کنید',
    };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const userId = formData.get('userId') as string;
    if (!userId) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    const rawData = {
      name: formData.get('name') as string,
      family: formData.get('family') as string,
      email: formData.get('email') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
      gender: formData.get('gender') as string,
      height: formData.get('height') as string,
    };

    const validatedData = updateProfileSchema.parse({
      name: rawData.name || undefined,
      family: rawData.family || undefined,
      email: rawData.email || undefined,
      dateOfBirth: rawData.dateOfBirth || undefined,
      gender: rawData.gender || undefined,
      height: rawData.height ? parseInt(rawData.height) : undefined,
    });

    // Check if email is already taken by another user
    if (validatedData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'این ایمیل قبلاً ثبت شده است',
        };
      }
    }

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: validatedData.name,
        family: validatedData.family,
        email: validatedData.email || null,
        dateOfBirth: validatedData.dateOfBirth
          ? new Date(validatedData.dateOfBirth)
          : null,
        gender: validatedData.gender,
        height: validatedData.height,
      },
    });

    return {
      success: true,
      message: 'پروفایل با موفقیت به‌روزرسانی شد',
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
      error: 'خطا در به‌روزرسانی پروفایل. لطفاً دوباره تلاش کنید',
    };
  }
}

/**
 * Delete user account
 */
export async function deleteAccount(
  userId: string
): Promise<AuthActionResult> {
  try {
    await prisma.user.delete({
      where: { id: userId },
    });

    return {
      success: true,
      message: 'حساب کاربری با موفقیت حذف شد',
    };
  } catch (error) {
    return {
      success: false,
      error: 'خطا در حذف حساب کاربری. لطفاً دوباره تلاش کنید',
    };
  }
}
