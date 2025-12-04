-- CreateEnumType
CREATE TYPE "CourtType" AS ENUM ('OPEN', 'CLOSE', 'SALON');

-- CreateTable: City
CREATE TABLE IF NOT EXISTS "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SportsClub
CREATE TABLE IF NOT EXISTS "SportsClub" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "cityId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsClub_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OtpCode
CREATE TABLE IF NOT EXISTS "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- Step 1: Create default city and sports club for existing courts (only if Court table exists)
DO $$
DECLARE
    default_city_id TEXT;
    default_club_id TEXT;
    court_table_exists BOOLEAN;
BEGIN
    -- Check if Court table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Court'
    ) INTO court_table_exists;
    
    IF court_table_exists THEN
        -- Get or create default city
        SELECT "id" INTO default_city_id FROM "City" WHERE "name" = 'تهران' LIMIT 1;
        
        IF default_city_id IS NULL THEN
            default_city_id := gen_random_uuid()::text;
            INSERT INTO "City" ("id", "name", "createdAt", "updatedAt")
            VALUES (default_city_id, 'تهران', NOW(), NOW());
        END IF;
        
        -- Get or create default sports club
        SELECT "id" INTO default_club_id FROM "SportsClub" WHERE "name" = 'باشگاه پیش‌فرض' LIMIT 1;
        
        IF default_club_id IS NULL THEN
            default_club_id := gen_random_uuid()::text;
            INSERT INTO "SportsClub" ("id", "name", "cityId", "createdAt", "updatedAt")
            VALUES (default_club_id, 'باشگاه پیش‌فرض', default_city_id, NOW(), NOW());
        END IF;
        
        -- Update existing courts to use default club
        UPDATE "Court"
        SET "sportsClubId" = default_club_id
        WHERE "sportsClubId" IS NULL;
    END IF;
END $$;

-- Step 2: Add new columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "family" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "photo" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 3: Make email optional (remove NOT NULL constraint if exists)
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Step 4: Add phone column if it doesn't exist, make it unique
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'phone') THEN
        ALTER TABLE "User" ADD COLUMN "phone" TEXT;
    END IF;
END $$;

-- Create unique index on phone if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone") WHERE "phone" IS NOT NULL;

-- Step 5: Add type column to Court (rename from sportType or add new)
DO $$
BEGIN
    -- Check if sportType exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Court' AND column_name = 'sportType') THEN
        -- Rename sportType to type and convert values
        ALTER TABLE "Court" RENAME COLUMN "sportType" TO "type";
        -- Update values: PADEL/TENNIS -> OPEN (default)
        UPDATE "Court" SET "type" = 'OPEN' WHERE "type" NOT IN ('OPEN', 'CLOSE', 'SALON');
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Court' AND column_name = 'type') THEN
        -- Add type column if it doesn't exist
        ALTER TABLE "Court" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'OPEN';
    END IF;
END $$;

-- Step 6: Make sportsClubId required (it should already be set from Step 1)
ALTER TABLE "Court" ALTER COLUMN "sportsClubId" SET NOT NULL;

-- Step 7: Add foreign key constraints (drop first if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SportsClub_cityId_fkey') THEN
        ALTER TABLE "SportsClub" DROP CONSTRAINT "SportsClub_cityId_fkey";
    END IF;
END $$;
ALTER TABLE "SportsClub" ADD CONSTRAINT "SportsClub_cityId_fkey" 
    FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SportsClub_ownerId_fkey') THEN
        ALTER TABLE "SportsClub" DROP CONSTRAINT "SportsClub_ownerId_fkey";
    END IF;
END $$;
ALTER TABLE "SportsClub" ADD CONSTRAINT "SportsClub_ownerId_fkey" 
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Court_sportsClubId_fkey') THEN
        ALTER TABLE "Court" DROP CONSTRAINT "Court_sportsClubId_fkey";
    END IF;
END $$;
ALTER TABLE "Court" ADD CONSTRAINT "Court_sportsClubId_fkey" 
    FOREIGN KEY ("sportsClubId") REFERENCES "SportsClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Add unique constraint on City name
CREATE UNIQUE INDEX IF NOT EXISTS "City_name_key" ON "City"("name");

-- Step 9: Remove password column (after ensuring users can login via OTP)
-- Note: This is safe because we're moving to OTP-based auth
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";

-- Step 10: Update Booking table
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;

-- Create unique index on inviteToken if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_inviteToken_key" ON "Booking"("inviteToken") WHERE "inviteToken" IS NOT NULL;

-- Step 11: Create BookingParticipant table if it doesn't exist
CREATE TABLE IF NOT EXISTS "BookingParticipant" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "gender" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingParticipant_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for BookingParticipant
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingParticipant_bookingId_fkey') THEN
        ALTER TABLE "BookingParticipant" DROP CONSTRAINT "BookingParticipant_bookingId_fkey";
    END IF;
END $$;
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_bookingId_fkey" 
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingParticipant_userId_fkey') THEN
        ALTER TABLE "BookingParticipant" DROP CONSTRAINT "BookingParticipant_userId_fkey";
    END IF;
END $$;
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraints for BookingParticipant
CREATE UNIQUE INDEX IF NOT EXISTS "BookingParticipant_bookingId_userId_key" 
    ON "BookingParticipant"("bookingId", "userId") WHERE "userId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "BookingParticipant_bookingId_email_key" 
    ON "BookingParticipant"("bookingId", "email") WHERE "email" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "BookingParticipant_bookingId_phone_key" 
    ON "BookingParticipant"("bookingId", "phone") WHERE "phone" IS NOT NULL;

-- Step 12: Create CancellationPolicy table if it doesn't exist
CREATE TABLE IF NOT EXISTS "CancellationPolicy" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "hoursBeforeStart" INTEGER NOT NULL,
    "refundPercentage" INTEGER NOT NULL DEFAULT 100,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- Add foreign key for CancellationPolicy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CancellationPolicy_courtId_fkey') THEN
        ALTER TABLE "CancellationPolicy" DROP CONSTRAINT "CancellationPolicy_courtId_fkey";
    END IF;
END $$;
ALTER TABLE "CancellationPolicy" ADD CONSTRAINT "CancellationPolicy_courtId_fkey" 
    FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraint on CancellationPolicy courtId
CREATE UNIQUE INDEX IF NOT EXISTS "CancellationPolicy_courtId_key" ON "CancellationPolicy"("courtId");

