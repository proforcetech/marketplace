-- Ensure PostGIS extension exists
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to users (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'location'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "location" geography(Point, 4326);
    CREATE INDEX "users_location_idx" ON "users" USING GIST ("location");
  END IF;
END $$;

-- Add geography column to listings (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'location'
  ) THEN
    ALTER TABLE "listings" ADD COLUMN "location" geography(Point, 4326);
    CREATE INDEX "listings_location_idx" ON "listings" USING GIST ("location");
  END IF;
END $$;

-- Backfill existing rows that have lat/lng but no geography value
UPDATE "users"
SET "location" = ST_SetSRID(ST_MakePoint("location_lng", "location_lat"), 4326)::geography
WHERE "location_lat" IS NOT NULL
  AND "location_lng" IS NOT NULL
  AND "location" IS NULL;

UPDATE "listings"
SET "location" = ST_SetSRID(ST_MakePoint("location_lng", "location_lat"), 4326)::geography
WHERE "location_lat" IS NOT NULL
  AND "location_lng" IS NOT NULL
  AND "location" IS NULL;
