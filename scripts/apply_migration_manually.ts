/**
 * This script applies the migration manually
 * Run with: npx tsx scripts/apply_migration_manually.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying migration manually...');

  try {
    // Step 1: Create default city
    let city = await prisma.city.findFirst({ where: { name: 'تهران' } });
    if (!city) {
      city = await prisma.city.create({
        data: { name: 'تهران' },
      });
      console.log('✅ Created default city:', city.name);
    } else {
      console.log('✅ City already exists:', city.name);
    }

    // Step 2: Create default sports club
    let club = await prisma.sportsClub.findFirst({ where: { name: 'باشگاه پیش‌فرض' } });
    if (!club) {
      club = await prisma.sportsClub.create({
        data: {
          name: 'باشگاه پیش‌فرض',
          cityId: city.id,
        },
      });
      console.log('✅ Created default sports club:', club.name);
    } else {
      console.log('✅ Sports club already exists:', club.name);
    }

    // Step 3: Update existing courts
    const courtsWithoutClub = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Court" WHERE "sportsClubId" IS NULL
    `;

    if (courtsWithoutClub.length > 0) {
      await prisma.$executeRaw`
        UPDATE "Court" 
        SET "sportsClubId" = ${club.id}
        WHERE "sportsClubId" IS NULL
      `;
      console.log(`✅ Updated ${courtsWithoutClub.length} courts to use default club`);
    } else {
      console.log('✅ All courts already have a sports club');
    }

    console.log('🎉 Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

