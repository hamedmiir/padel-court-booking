import { format, parse, startOfDay, addHours, isWithinInterval } from 'date-fns';
import { prisma } from './prisma';

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  price: number;
}

/**
 * Operating hours for courts
 */
const OPERATING_HOURS = {
  start: 8, // 08:00
  end: 23, // 23:00
};

/**
 * Slot duration in minutes
 */
const SLOT_DURATION_MINUTES = 60;

/**
 * Get available time slots for a court on a specific date
 * @param courtId - The court ID
 * @param date - The date to check availability
 * @returns Array of time slots with availability and pricing
 */
export async function getAvailableSlots(
  courtId: string,
  date: Date
): Promise<TimeSlot[]> {
  // Get court with pricing rules
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { pricingRules: true },
  });

  if (!court) {
    throw new Error('Court not found');
  }

  // Get confirmed bookings for this date
  const dayStart = startOfDay(date);
  const dayEnd = addHours(dayStart, 24);

  const bookings = await prisma.booking.findMany({
    where: {
      courtId,
      status: 'CONFIRMED',
      startTime: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
  });

  // Generate all possible slots for the day
  const slots: TimeSlot[] = [];
  const startHour = OPERATING_HOURS.start;
  const endHour = OPERATING_HOURS.end;

  for (let hour = startHour; hour < endHour; hour++) {
    const slotStart = addHours(dayStart, hour);
    const slotEnd = addHours(slotStart, 1);

    // Check if slot overlaps with any booking
    const isBlocked = bookings.some((booking) => {
      return (
        slotStart < booking.endTime && slotEnd > booking.startTime
      );
    });

    // Calculate price based on pricing rules
    const price = calculateSlotPrice(
      court.basePricePerHour,
      court.pricingRules,
      slotStart
    );

    slots.push({
      start: slotStart,
      end: slotEnd,
      available: !isBlocked,
      price: Number(price),
    });
  }

  return slots;
}

/**
 * Calculate price for a time slot based on base price and pricing rules
 * @param basePrice - Base price per hour
 * @param pricingRules - Array of pricing rules
 * @param slotStart - Start time of the slot
 * @returns Calculated price
 */
function calculateSlotPrice(
  basePrice: number | string,
  pricingRules: Array<{ startTime: string; endTime: string; multiplier: number }>,
  slotStart: Date
): number {
  const base = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice;
  
  // Parse slot time to HH:mm format
  const slotTimeStr = format(slotStart, 'HH:mm');
  const slotTime = parse(slotTimeStr, 'HH:mm', new Date());

  // Check if slot falls within any pricing rule
  for (const rule of pricingRules) {
    const ruleStart = parse(rule.startTime, 'HH:mm', new Date());
    const ruleEnd = parse(rule.endTime, 'HH:mm', new Date());

    // Handle case where end time is next day (e.g., 23:00 - 01:00)
    let ruleEndTime = ruleEnd;
    if (ruleEnd <= ruleStart) {
      ruleEndTime = addHours(ruleEnd, 24);
    }

    if (
      isWithinInterval(slotTime, {
        start: ruleStart,
        end: ruleEndTime,
      }) ||
      (ruleEnd <= ruleStart && // Handle overnight rules
        (slotTime >= ruleStart || slotTime <= ruleEnd))
    ) {
      return base * rule.multiplier;
    }
  }

  return base;
}

/**
 * Check if a time slot is available
 * @param courtId - The court ID
 * @param startTime - Start time of the slot
 * @param endTime - End time of the slot
 * @returns True if available, false otherwise
 */
export async function isSlotAvailable(
  courtId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      courtId,
      status: 'CONFIRMED',
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

  return !conflictingBooking;
}

