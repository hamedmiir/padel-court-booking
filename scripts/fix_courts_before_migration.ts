/**
 * Fix existing courts before migration
 * Run with: npx tsx scripts/fix_courts_before_migration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing existing courts...');

  try {
    // Check if City table exists
    const cityExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'City'
      ) as exists
    `;

    if (!cityExists[0]?.exists) {
      console.log('Creating City table...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "City" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
    }

    // Check if SportsClub table exists
    const clubExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SportsClub'
      ) as exists
    `;

    if (!clubExists[0]?.exists) {
      console.log('Creating SportsClub table...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SportsClub" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "address" TEXT,
          "phone" TEXT,
          "email" TEXT,
          "cityId" TEXT NOT NULL,
          "ownerId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
    }

    // Create default city
    let cityId: string;
    const existingCity = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "City" WHERE name = 'تهران' LIMIT 1
    `;

    if (existingCity.length > 0) {
      cityId = existingCity[0].id;
      console.log('✅ Using existing city:', cityId);
    } else {
      const newCity = await prisma.$executeRaw<{ id: string }>`
        INSERT INTO "City" (id, name, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, 'تهران', NOW(), NOW())
        RETURNING id
      `;
      cityId = (newCity as any)[0]?.id || '';
      console.log('✅ Created default city');
    }

    // Create default sports club
    let clubId: string;
    const existingClub = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "SportsClub" WHERE name = 'باشگاه پیش‌فرض' LIMIT 1
    `;

    if (existingClub.length > 0) {
      clubId = existingClub[0].id;
      console.log('✅ Using existing club:', clubId);
    } else {
      const newClub = await prisma.$executeRaw<{ id: string }>`
        INSERT INTO "SportsClub" (id, name, "cityId", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, 'باشگاه پیش‌فرض', ${cityId}, NOW(), NOW())
        RETURNING id
      `;
      clubId = (newClub as any)[0]?.id || '';
      console.log('✅ Created default sports club');
    }

    // Update courts with NULL sportsClubId
    const result = await prisma.$executeRaw`
      UPDATE "Court"
      SET "sportsClubId" = ${clubId}
      WHERE "sportsClubId" IS NULL
    `;

    console.log(`✅ Updated ${result} courts to use default club`);
    console.log('🎉 Data fix completed!');
  } catch (error) {
    console.error('❌ Error fixing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

