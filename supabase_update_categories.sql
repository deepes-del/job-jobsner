-- =========================================================================
-- JOBSNER: Add 'Drivers', 'Warehouse', 'Picker & Packer', 'Other Jobs'
-- Supabase SQL Migration Script
-- Run this in your Supabase Project -> SQL Editor
-- =========================================================================

-- 1. Ensure category and job_category columns exist with default value 'Drivers'
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Drivers';
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS job_category TEXT DEFAULT 'Drivers';

-- 2. If an ENUM type is used in Supabase for category, add the new values safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_category_enum') THEN
    ALTER TYPE job_category_enum ADD VALUE IF NOT EXISTS 'Drivers';
    ALTER TYPE job_category_enum ADD VALUE IF NOT EXISTS 'Warehouse';
    ALTER TYPE job_category_enum ADD VALUE IF NOT EXISTS 'Picker & Packer';
    ALTER TYPE job_category_enum ADD VALUE IF NOT EXISTS 'Other Jobs';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_category') THEN
    ALTER TYPE job_category ADD VALUE IF NOT EXISTS 'Drivers';
    ALTER TYPE job_category ADD VALUE IF NOT EXISTS 'Warehouse';
    ALTER TYPE job_category ADD VALUE IF NOT EXISTS 'Picker & Packer';
    ALTER TYPE job_category ADD VALUE IF NOT EXISTS 'Other Jobs';
  END IF;
END $$;

-- 3. Drop any restrictive CHECK constraints on category (if any were created previously)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'jobs'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) ILIKE '%category%'
  ) LOOP
    EXECUTE 'ALTER TABLE jobs DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 4. Categorize existing jobs into the 4 standard categories:

-- (A) Drivers: Any job with driver, rider, delivery, fleet, courier, van, bike
UPDATE jobs
SET category = 'Drivers',
    job_category = 'Drivers'
WHERE LOWER(title) LIKE '%driver%'
   OR LOWER(title) LIKE '%rider%'
   OR LOWER(title) LIKE '%delivery%'
   OR LOWER(title) LIKE '%fleet%'
   OR LOWER(title) LIKE '%courier%'
   OR LOWER(category) LIKE '%delivery%'
   OR LOWER(category) LIKE '%driver%'
   OR LOWER(category) LIKE '%fleet%';

-- (B) Picker & Packer: Any job with picker, packer, packing, sorting
UPDATE jobs
SET category = 'Picker & Packer',
    job_category = 'Picker & Packer'
WHERE LOWER(title) LIKE '%picker%'
   OR LOWER(title) LIKE '%packer%'
   OR LOWER(title) LIKE '%packing%'
   OR LOWER(category) LIKE '%picker%'
   OR LOWER(category) LIKE '%packer%';

-- (C) Warehouse: Any job with warehouse, inventory, store, facility (excluding pure picker/packer)
UPDATE jobs
SET category = 'Warehouse',
    job_category = 'Warehouse'
WHERE (LOWER(title) LIKE '%warehouse%' OR LOWER(category) LIKE '%warehouse%' OR LOWER(title) LIKE '%inventory%')
  AND LOWER(title) NOT LIKE '%picker%'
  AND LOWER(title) NOT LIKE '%packer%';

-- (D) Other Jobs: Any other or unclassified jobs
UPDATE jobs
SET category = 'Other Jobs',
    job_category = 'Other Jobs'
WHERE category IS NULL
   OR (category NOT IN ('Drivers', 'Warehouse', 'Picker & Packer'));

-- 5. Add performance indexes for category & status filtering
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_job_category ON jobs (job_category);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);

-- 6. Verification Query
SELECT category, count(*) AS job_count 
FROM jobs 
GROUP BY category 
ORDER BY job_count DESC;
