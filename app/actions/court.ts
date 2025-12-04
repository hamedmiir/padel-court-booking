'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const createCourtSchema = z.object({
  name: z.string().min(1, 'نام زمین الزامی است'),
  type: z.enum(['OPEN', 'CLOSE', 'SALON'], {
    errorMap: () => ({ message: 'نوع زمین باید باز، بسته یا سالن باشد' }),
  }),
  basePricePerHour: z.number().positive('قیمت باید مثبت باشد'),
});

const createPricingRuleSchema = z.object({
  courtId: z.string().uuid('شناسه زمین معتبر نیست'),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'فرمت زمان باید HH:mm باشد'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'فرمت زمان باید HH:mm باشد'),
  multiplier: z.number().positive('ضریب باید مثبت باشد'),
});

/**
 * Check if user is admin or field owner
 */
async function checkAdminOrFieldOwner() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('لطفاً ابتدا وارد شوید');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'FIELD_OWNER')) {
    throw new Error('شما اجازه دسترسی به این بخش را ندارید');
  }

  return { userId: session.user.id, role: user.role };
}

/**
 * Check if user is admin
 */
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('لطفاً ابتدا وارد شوید');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== 'ADMIN') {
    throw new Error('شما اجازه دسترسی به این بخش را ندارید');
  }

  return session.user.id;
}

/**
 * Create a new court (Admin or Field Owner)
 */
export async function createCourt(
  formData: FormData
): Promise<
  | { success: true; courtId: string; message: string }
  | { success: false; error: string }
> {
  try {
    const { userId, role } = await checkAdminOrFieldOwner();

    const rawData = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      basePricePerHour: formData.get('basePricePerHour') as string,
      sportsClubId: formData.get('sportsClubId') as string,
    };

    const validatedData = createCourtSchema.parse({
      name: rawData.name,
      type: (rawData.type || 'OPEN') as 'OPEN' | 'CLOSE' | 'SALON',
      basePricePerHour: parseFloat(rawData.basePricePerHour),
    });

    // If field owner, verify they own the sports club
    if (role === 'FIELD_OWNER' && rawData.sportsClubId) {
      const club = await prisma.sportsClub.findUnique({
        where: { id: rawData.sportsClubId },
      });

      if (!club || club.ownerId !== userId) {
        return {
          success: false,
          error: 'شما صاحب این باشگاه نیستید',
        };
      }
    }

    if (!rawData.sportsClubId) {
      return {
        success: false,
        error: 'باشگاه ورزشی الزامی است',
      };
    }

    const court = await prisma.court.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        basePricePerHour: validatedData.basePricePerHour,
        ownerId: role === 'FIELD_OWNER' ? userId : null,
        sportsClubId: rawData.sportsClubId,
      } as any,
    });

    return {
      success: true,
      courtId: court.id,
      message: 'زمین با موفقیت ایجاد شد',
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
      error: error instanceof Error ? error.message : 'خطا در ایجاد زمین',
    };
  }
}

/**
 * Add or update pricing rule for a court (Admin or Field Owner)
 */
export async function updatePricing(
  formData: FormData
): Promise<
  | { success: true; ruleId: string; message: string }
  | { success: false; error: string }
> {
  try {
    const { userId, role } = await checkAdminOrFieldOwner();

    const rawData = {
      courtId: formData.get('courtId') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      multiplier: formData.get('multiplier') as string,
    };

    const validatedData = createPricingRuleSchema.parse({
      courtId: rawData.courtId,
      startTime: rawData.startTime,
      endTime: rawData.endTime,
      multiplier: parseFloat(rawData.multiplier),
    });

    // Check if court exists
    const court = await prisma.court.findUnique({
      where: { id: validatedData.courtId },
    });

    if (!court) {
      return {
        success: false,
        error: 'زمین یافت نشد',
      };
    }

    // If field owner, verify they own the court
    if (role === 'FIELD_OWNER' && (court as any).ownerId !== userId) {
      return {
        success: false,
        error: 'شما صاحب این زمین نیستید',
      };
    }

    const rule = await prisma.pricingRule.create({
      data: {
        courtId: validatedData.courtId,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        multiplier: validatedData.multiplier,
      },
    });

    return {
      success: true,
      ruleId: rule.id,
      message: 'قانون قیمت‌گذاری با موفقیت اضافه شد',
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
      error: error instanceof Error ? error.message : 'خطا در افزودن قانون قیمت‌گذاری',
    };
  }
}

/**
 * Get all courts (for admin/field owner)
 */
export async function getAllCourts() {
  try {
    const courts = await prisma.court.findMany({
      include: {
        pricingRules: true,
        sportsClub: {
          include: {
            city: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      courts: courts.map((court) => ({
        id: court.id,
        name: court.name,
        type: (court as any).type || 'OPEN',
        basePricePerHour: Number(court.basePricePerHour),
        clubName: court.sportsClub.name,
        cityName: court.sportsClub.city.name,
        pricingRules: court.pricingRules.map((rule) => ({
          id: rule.id,
          startTime: rule.startTime,
          endTime: rule.endTime,
          multiplier: rule.multiplier,
        })),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت زمین‌ها',
    };
  }
}

/**
 * Get all bookings (Admin only)
 */
export async function getAllBookings(startDate?: string, endDate?: string) {
  try {
    await checkAdmin();

    // Build where clause
    const whereClause: any = {};
    
    // Add date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of day
        whereClause.createdAt.lte = endDateObj;
      }
    }

    const bookings = await prisma.booking.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        court: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        userName: booking.user.name || booking.user.email,
        userEmail: booking.user.email,
        courtName: booking.court.name,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        totalPrice: Number(booking.totalPrice),
        status: booking.status,
        createdAt: booking.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت رزروها',
    };
  }
}

