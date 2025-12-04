'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const createSportsClubSchema = z.object({
  name: z.string().min(1, 'نام باشگاه الزامی است'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

/**
 * Check if user is field owner or admin
 */
async function checkFieldOwnerOrAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('لطفاً ابتدا وارد شوید');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || (user.role !== 'FIELD_OWNER' && user.role !== 'ADMIN')) {
    throw new Error('شما اجازه دسترسی به این بخش را ندارید');
  }

  return { userId: session.user.id, role: user.role };
}

/**
 * Create a new sports club (Field Owner or Admin)
 */
export async function createSportsClub(
  formData: FormData
): Promise<
  | { success: true; clubId: string; message: string }
  | { success: false; error: string }
> {
  try {
    const { userId, role } = await checkFieldOwnerOrAdmin();

    const rawData = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
    };

    const validatedData = createSportsClubSchema.parse(rawData);

    const club = await prisma.sportsClub.create({
      data: {
        name: validatedData.name,
        address: validatedData.address || null,
        phone: validatedData.phone || null,
        email: validatedData.email || null,
        ownerId: userId, // Both FIELD_OWNER and ADMIN can create clubs and become the owner
      },
    });

    return {
      success: true,
      clubId: club.id,
      message: 'باشگاه با موفقیت ایجاد شد',
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
      error: error instanceof Error ? error.message : 'خطا در ایجاد باشگاه',
    };
  }
}

/**
 * Get sports clubs owned by current user
 */
export async function getMySportsClubs() {
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

    const clubs = await prisma.sportsClub.findMany({
      where: {
        ownerId: session.user.id,
      },
      include: {
        courts: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      clubs: clubs.map((club) => ({
        id: club.id,
        name: club.name,
        address: club.address,
        phone: club.phone,
        email: club.email,
        courtsCount: club.courts.length,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت باشگاه‌ها',
    };
  }
}

/**
 * Get all sports clubs (for selection)
 */
export async function getAllSportsClubs() {
  try {
    const clubs = await prisma.sportsClub.findMany({
      include: {
        courts: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      clubs: clubs.map((club) => ({
        id: club.id,
        name: club.name,
        address: club.address,
        phone: club.phone,
        email: club.email,
        courtsCount: club.courts.length,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت باشگاه‌ها',
    };
  }
}

