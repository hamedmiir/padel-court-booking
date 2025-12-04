'use server';

import { prisma } from '@/lib/prisma';

/**
 * Get all cities
 */
export async function getAllCities() {
  try {
    const cities = await prisma.city.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      cities: cities.map((city) => ({
        id: city.id,
        name: city.name,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت شهرها',
    };
  }
}

/**
 * Get clubs by city
 */
export async function getClubsByCity(cityId: string) {
  try {
    const clubs = await prisma.sportsClub.findMany({
      where: {
        cityId,
      },
      include: {
        courts: {
          include: {
            pricingRules: true,
          },
        },
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
        courts: club.courts.map((court) => ({
          id: court.id,
          name: court.name,
          type: (court as any).type || 'OPEN',
          basePricePerHour: Number(court.basePricePerHour),
          pricingRules: court.pricingRules.map((rule) => ({
            id: rule.id,
            startTime: rule.startTime,
            endTime: rule.endTime,
            multiplier: rule.multiplier,
          })),
        })),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت باشگاه‌ها',
    };
  }
}

