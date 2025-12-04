'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * Get current user profile
 */
export async function getUserProfile() {
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
      select: {
        id: true,
        name: true,
        family: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        height: true,
        photo: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'کاربر یافت نشد',
      };
    }

    return {
      success: true,
      profile: {
        name: user.name,
        family: user.family,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth?.toISOString() || null,
        gender: user.gender,
        height: user.height,
        photo: user.photo,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت پروفایل',
    };
  }
}

