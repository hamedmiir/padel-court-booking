-- Fix existing data before migration
-- This script handles existing courts with NULL sportsClubId

-- Step 1: Create default city if it doesn't exist
INSERT INTO "City" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'تهران', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "City" WHERE "name" = 'تهران')
LIMIT 1;

-- Step 2: Create default sports club and assign existing courts
DO $$
DECLARE
    default_city_id TEXT;
    default_club_id TEXT;
BEGIN
    -- Get default city
    SELECT "id" INTO default_city_id FROM "City" WHERE "name" = 'تهران' LIMIT 1;
    
    -- Create default club if it doesn't exist
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
    
    RAISE NOTICE 'Updated courts to use default club: %', default_club_id;
END $$;

