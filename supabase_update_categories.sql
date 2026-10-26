-- =========================================================================
-- JOBSNER: Supabase SQL Update Script for 5 Job Categories
-- 1. Delivery & Logistics
-- 2. Warehouse & Packing
-- 3. Drivers
-- 4. Office & Admin
-- 5. Other Jobs
-- Run this in Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- =========================================================================

-- Step 1: Set default value for category on public.jobs
ALTER TABLE public.jobs 
  ALTER COLUMN category SET DEFAULT 'Delivery & Logistics';

-- Step 2: Ensure job_category alias column exists (for API/backward compatibility)
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS job_category text DEFAULT 'Delivery & Logistics';

-- Step 3: Categorize all existing jobs into the 5 standard categories:

-- (A) DRIVERS: Chauffeurs, van drivers, truck drivers, fleet pilots, auto drivers
UPDATE public.jobs
SET category = 'Drivers',
    job_category = 'Drivers'
WHERE LOWER(title) LIKE '%driver%'
   OR LOWER(title) LIKE '%van driver%'
   OR LOWER(title) LIKE '%truck driver%'
   OR LOWER(title) LIKE '%chauffeur%'
   OR LOWER(title) LIKE '%auto driver%'
   OR LOWER(title) LIKE '%cab driver%'
   OR LOWER(COALESCE(category, '')) = 'drivers';

-- (B) WAREHOUSE & PACKING: Warehouse associates, pickers, packers, inventory, sorting
UPDATE public.jobs
SET category = 'Warehouse & Packing',
    job_category = 'Warehouse & Packing'
WHERE LOWER(title) LIKE '%warehouse%'
   OR LOWER(title) LIKE '%picker%'
   OR LOWER(title) LIKE '%packer%'
   OR LOWER(title) LIKE '%packing%'
   OR LOWER(title) LIKE '%inventory%'
   OR LOWER(title) LIKE '%sorting%'
   OR LOWER(COALESCE(category, '')) LIKE '%warehouse%'
   OR LOWER(COALESCE(category, '')) LIKE '%packer%'
   OR LOWER(COALESCE(category, '')) LIKE '%picker%';

-- (C) OFFICE & ADMIN: Back office, telecallers, receptionist, HR, accountant, data entry
UPDATE public.jobs
SET category = 'Office & Admin',
    job_category = 'Office & Admin'
WHERE LOWER(title) LIKE '%admin%'
   OR LOWER(title) LIKE '%office%'
   OR LOWER(title) LIKE '%telecaller%'
   OR LOWER(title) LIKE '%tele-caller%'
   OR LOWER(title) LIKE '%receptionist%'
   OR LOWER(title) LIKE '%accountant%'
   OR LOWER(title) LIKE '%hr%'
   OR LOWER(title) LIKE '%coordinator%'
   OR LOWER(title) LIKE '%data entry%'
   OR LOWER(COALESCE(category, '')) LIKE '%office%'
   OR LOWER(COALESCE(category, '')) LIKE '%admin%';

-- (D) DELIVERY & LOGISTICS: Delivery riders, courier executives, delivery associates
UPDATE public.jobs
SET category = 'Delivery & Logistics',
    job_category = 'Delivery & Logistics'
WHERE (
    LOWER(title) LIKE '%delivery%'
    OR LOWER(title) LIKE '%rider%'
    OR LOWER(title) LIKE '%courier%'
    OR LOWER(title) LIKE '%logistics%'
    OR LOWER(title) LIKE '%biker%'
    OR LOWER(COALESCE(category, '')) LIKE '%delivery%'
    OR LOWER(COALESCE(category, '')) LIKE '%logistics%'
  )
  AND category NOT IN ('Drivers', 'Warehouse & Packing', 'Office & Admin');

-- (E) OTHER JOBS: Retail, sales, security, operations, housekeeping, unclassified
UPDATE public.jobs
SET category = 'Other Jobs',
    job_category = 'Other Jobs'
WHERE category IS NULL
   OR category = ''
   OR category NOT IN ('Delivery & Logistics', 'Warehouse & Packing', 'Drivers', 'Office & Admin');

-- Step 4: Synchronize candidate recent_category records in public.candidates
UPDATE public.candidates
SET recent_category = 'Drivers'
WHERE LOWER(recent_category) LIKE '%driver%';

UPDATE public.candidates
SET recent_category = 'Warehouse & Packing'
WHERE LOWER(recent_category) LIKE '%warehouse%'
   OR LOWER(recent_category) LIKE '%pack%'
   OR LOWER(recent_category) LIKE '%picker%';

UPDATE public.candidates
SET recent_category = 'Office & Admin'
WHERE LOWER(recent_category) LIKE '%office%'
   OR LOWER(recent_category) LIKE '%admin%';

UPDATE public.candidates
SET recent_category = 'Delivery & Logistics'
WHERE LOWER(recent_category) LIKE '%delivery%'
   OR LOWER(recent_category) LIKE '%logistics%';

-- Step 5: Add performance indexes for category & status filtering
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);

-- Step 6: Verification - Check job count by category
SELECT 
  category, 
  COUNT(*) AS total_jobs,
  COUNT(CASE WHEN status = 'Published' THEN 1 END) AS active_jobs
FROM public.jobs
GROUP BY category
ORDER BY total_jobs DESC;
