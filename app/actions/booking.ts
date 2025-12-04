'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAvailableSlots, isSlotAvailable } from '@/lib/booking-utils';
import { initiatePayment } from '@/lib/payment';
import { auth } from '@/auth';
import crypto from 'crypto';

const createBookingSchema = z.object({
  courtId: z.string().min(1, 'شناسه زمین الزامی است'),
  startTime: z.string().datetime('زمان شروع معتبر نیست'),
  endTime: z.string().datetime('زمان پایان معتبر نیست'),
  participants: z.string().optional(), // JSON string of participants array
});

const inviteParticipantSchema = z.object({
  bookingId: z.string().uuid('شناسه رزرو معتبر نیست'),
  name: z.string().min(1, 'نام الزامی است'),
  email: z.string().email('ایمیل معتبر نیست').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
});

/**
 * Generate invite token
 */
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get available slots for a court on a specific date
 */
export async function getAvailableSlotsAction(
  courtId: string,
  date: string
): Promise<
  | { success: true; slots: Array<{ start: string; end: string; available: boolean; price: number }> }
  | { success: false; error: string }
> {
  try {
    const dateObj = new Date(date);
    const slots = await getAvailableSlots(courtId, dateObj);

    return {
      success: true,
      slots: slots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        available: slot.available,
        price: slot.price,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت زمان‌های موجود',
    };
  }
}

/**
 * Check if user has conflicting bookings at the same time
 */
async function hasConflictingBooking(
  userId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const conflicting = await prisma.booking.findFirst({
    where: {
      userId,
      status: 'CONFIRMED',
      NOT: excludeBookingId ? { id: excludeBookingId } : undefined,
      OR: [
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
        },
      ],
    },
  });

  return !!conflicting;
}

/**
 * Create a new booking
 */
export async function createBooking(
  formData: FormData
): Promise<
  | { success: true; bookingId: string; message: string }
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
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      participants: formData.get('participants') as string, // JSON string
    };

    const validatedData = createBookingSchema.parse(rawData);

    const startTime = new Date(validatedData.startTime);
    const endTime = new Date(validatedData.endTime);

    // Validate time range
    if (startTime >= endTime) {
      return {
        success: false,
        error: 'زمان پایان باید بعد از زمان شروع باشد',
      };
    }

    // Check if user has conflicting booking
    const hasConflict = await hasConflictingBooking(
      session.user.id,
      startTime,
      endTime
    );

    if (hasConflict) {
      return {
        success: false,
        error: 'شما در این زمان رزرو دیگری دارید',
      };
    }

    // Check if slot is still available
    const available = await isSlotAvailable(
      validatedData.courtId,
      startTime,
      endTime
    );

    if (!available) {
      return {
        success: false,
        error: 'این زمان در دسترس نیست',
      };
    }

    // Get court to calculate price
    const court = await prisma.court.findUnique({
      where: { id: validatedData.courtId },
      include: { pricingRules: true },
    });

    if (!court) {
      return {
        success: false,
        error: 'زمین یافت نشد',
      };
    }

    // Calculate total price
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const basePrice = Number(court.basePricePerHour);
    
    // Apply pricing rules if applicable
    let pricePerHour = basePrice;
    const slotStart = startTime;
    const slotTimeStr = slotStart.toTimeString().slice(0, 5); // HH:mm

    for (const rule of court.pricingRules) {
      if (slotTimeStr >= rule.startTime && slotTimeStr < rule.endTime) {
        pricePerHour = basePrice * rule.multiplier;
        break;
      }
    }

    const totalPrice = pricePerHour * hours;

    // Parse participants (max 3)
    let participants: Array<{ name: string; email?: string; phone?: string; gender?: string }> = [];
    if (validatedData.participants) {
      try {
        participants = JSON.parse(validatedData.participants);
        if (participants.length > 3) {
          return {
            success: false,
            error: 'حداکثر ۳ نفر می‌توانید دعوت کنید',
          };
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Generate invite token
    const inviteToken = generateInviteToken();

    // Create booking with PENDING status
    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        courtId: validatedData.courtId,
        startTime,
        endTime,
        totalPrice,
        status: 'PENDING',
        inviteToken,
      },
    });

    // Create participants
    for (const participant of participants) {
      await prisma.bookingParticipant.create({
        data: {
          bookingId: booking.id,
          name: participant.name,
          email: participant.email || null,
          phone: participant.phone || null,
          gender: participant.gender || null,
          status: 'PENDING',
        },
      });
    }

    // Process payment (gateway only for MVP)
    const paymentResult = await initiatePayment(totalPrice, booking.id);

    if (!paymentResult.success) {
      // If payment fails, cancel the booking
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      });

      return {
        success: false,
        error: 'پرداخت ناموفق بود',
      };
    }

    // Update booking status to CONFIRMED
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED', transactionId: paymentResult.transactionId },
    });

    // TODO: Send SMS notifications to participants

    return {
      success: true,
      bookingId: booking.id,
      message: 'رزرو با موفقیت انجام شد',
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
      error: error instanceof Error ? error.message : 'خطا در ایجاد رزرو',
    };
  }
}

/**
 * Get user bookings
 */
export async function getUserBookings() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          {
            participants: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        court: {
          include: {
            sportsClub: {
              include: {
                city: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            family: true,
            email: true,
            phone: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                family: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return {
      success: true,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        courtName: booking.court.name,
        courtType: (booking.court as any).type || 'OPEN',
        clubName: booking.court.sportsClub.name,
        cityName: booking.court.sportsClub.city.name,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        totalPrice: Number(booking.totalPrice),
        status: booking.status,
        isOwner: booking.userId === session.user.id,
        owner: {
          name: booking.user.name,
          family: booking.user.family,
          email: booking.user.email,
          phone: booking.user.phone,
        },
        participants: booking.participants.map((p) => ({
          id: p.id,
          name: p.name || p.user?.name,
          family: p.user?.family,
          email: p.email || p.user?.email,
          phone: p.phone || p.user?.phone,
          gender: p.gender,
          status: p.status,
          isUser: !!p.userId,
        })),
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

/**
 * Accept or decline booking invitation
 */
export async function respondToInvitation(
  bookingId: string,
  accept: boolean
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    const participant = await prisma.bookingParticipant.findFirst({
      where: {
        bookingId,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return {
        success: false,
        error: 'دعوت یافت نشد',
      };
    }

    await prisma.bookingParticipant.update({
      where: { id: participant.id },
      data: {
        status: accept ? 'ACCEPTED' : 'DECLINED',
      },
    });

    return {
      success: true,
      message: accept ? 'دعوت پذیرفته شد' : 'دعوت رد شد',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در پاسخ به دعوت',
    };
  }
}

/**
 * Update booking: remove/invite participants, change time (if 6h before)
 */
export async function updateBooking(
  formData: FormData
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'لطفاً ابتدا وارد شوید',
      };
    }

    const bookingId = formData.get('bookingId') as string;
    const action = formData.get('action') as string; // 'remove_participant', 'add_participant', 'change_time', 'cancel'

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { participants: true },
    });

    if (!booking) {
      return {
        success: false,
        error: 'رزرو یافت نشد',
      };
    }

    if (booking.userId !== session.user.id) {
      return {
        success: false,
        error: 'شما صاحب این رزرو نیستید',
      };
    }

    if (booking.status !== 'CONFIRMED') {
      return {
        success: false,
        error: 'این رزرو قابل ویرایش نیست',
      };
    }

    // Handle different actions
    if (action === 'remove_participant') {
      const participantId = formData.get('participantId') as string;
      await prisma.bookingParticipant.delete({
        where: { id: participantId },
      });

      return {
        success: true,
        message: 'بازیکن حذف شد',
      };
    }

    if (action === 'add_participant') {
      const rawData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        gender: formData.get('gender') as string,
      };

      const validatedData = inviteParticipantSchema.parse({
        bookingId,
        name: rawData.name,
        email: rawData.email || undefined,
        phone: rawData.phone || undefined,
        gender: rawData.gender || undefined,
      });

      // Check max 3 participants
      const currentCount = booking.participants.filter(
        (p) => p.status === 'ACCEPTED' || p.status === 'PENDING'
      ).length;

      if (currentCount >= 3) {
        return {
          success: false,
          error: 'حداکثر ۳ نفر می‌توانید دعوت کنید',
        };
      }

      await prisma.bookingParticipant.create({
        data: {
          bookingId,
          name: validatedData.name,
          email: validatedData.email || null,
          phone: validatedData.phone || null,
          gender: validatedData.gender || null,
          status: 'PENDING',
        },
      });

      // TODO: Send SMS notification

      return {
        success: true,
        message: 'دعوت ارسال شد',
      };
    }

    if (action === 'change_time') {
      const newStartTime = formData.get('startTime') as string;
      const newEndTime = formData.get('endTime') as string;

      if (!newStartTime || !newEndTime) {
        return {
          success: false,
          error: 'زمان جدید الزامی است',
        };
      }

      const startTime = new Date(newStartTime);
      const endTime = new Date(newEndTime);

      // Check if 6 hours before current start time
      const hoursUntilStart = (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilStart < 6) {
        return {
          success: false,
          error: 'فقط می‌توانید ۶ ساعت قبل از بازی زمان را تغییر دهید',
        };
      }

      // Check if new time is available
      const available = await isSlotAvailable(booking.courtId, startTime, endTime);
      if (!available) {
        return {
          success: false,
          error: 'این زمان در دسترس نیست',
        };
      }

      // Check for conflicts
      const hasConflict = await hasConflictingBooking(
        session.user.id,
        startTime,
        endTime,
        bookingId
      );

      if (hasConflict) {
        return {
          success: false,
          error: 'شما در این زمان رزرو دیگری دارید',
        };
      }

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          startTime,
          endTime,
        },
      });

      // TODO: Notify participants

      return {
        success: true,
        message: 'زمان رزرو تغییر کرد',
      };
    }

    if (action === 'cancel') {
      // Check cancellation policy
      const court = await prisma.court.findUnique({
        where: { id: booking.courtId },
        include: { cancellationPolicy: true },
      });

      if (court?.cancellationPolicy) {
        const hoursUntilStart =
          (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursUntilStart < court.cancellationPolicy.hoursBeforeStart) {
          return {
            success: false,
            error: `فقط می‌توانید ${court.cancellationPolicy.hoursBeforeStart} ساعت قبل از بازی لغو کنید`,
          };
        }
      }

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      // TODO: Process refund based on policy

      return {
        success: true,
        message: 'رزرو لغو شد',
      };
    }

    return {
      success: false,
      error: 'عملیات نامعتبر',
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
      error: error instanceof Error ? error.message : 'خطا در به‌روزرسانی رزرو',
    };
  }
}
