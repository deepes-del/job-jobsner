-- =========================================================================
-- JOBSNER: Supabase SQL Update Script for Job Categories
-- Based directly on your live database schema
-- Run this in Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- =========================================================================

-- Step 1: Set default value for category on public.jobs
ALTER TABLE public.jobs 
  ALTER COLUMN category SET DEFAULT 'Drivers';

-- Step 2: Ensure job_category alias column exists (for backward/API compatibility)
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS job_category text DEFAULT 'Drivers';

-- Step 3: Categorize existing jobs into the 4 standard categories:

-- (A) DRIVERS: Delivery boys, bike riders, van drivers, fleet & logistics couriers
UPDATE public.jobs
SET category = 'Drivers',
    job_category = 'Drivers'
WHERE LOWER(title) LIKE '%driver%'
   OR LOWER(title) LIKE '%rider%'
   OR LOWER(title) LIKE '%delivery%'
   OR LOWER(title) LIKE '%fleet%'
   OR LOWER(title) LIKE '%courier%'
   OR LOWER(title) LIKE '%biker%'
   OR LOWER(title) LIKE '%pilot%'
   OR LOWER(COALESCE(category, '')) LIKE '%delivery%'
   OR LOWER(COALESCE(category, '')) LIKE '%driver%'
   OR LOWER(COALESCE(category, '')) LIKE '%fleet%';

-- (B) PICKER & PACKER: Order pickers, packaging associates, sorters
UPDATE public.jobs
SET category = 'Picker & Packer',
    job_category = 'Picker & Packer'
WHERE LOWER(title) LIKE '%picker%'
   OR LOWER(title) LIKE '%packer%'
   OR LOWER(title) LIKE '%packing%'
   OR LOWER(title) LIKE '%sorting%'
   OR LOWER(COALESCE(category, '')) LIKE '%picker%'
   OR LOWER(COALESCE(category, '')) LIKE '%packer%';

-- (C) WAREHOUSE: Warehouse associates, inventory executive, store helpers
UPDATE public.jobs
SET category = 'Warehouse',
    job_category = 'Warehouse'
WHERE (
    LOWER(title) LIKE '%warehouse%' 
    OR LOWER(title) LIKE '%inventory%' 
    OR LOWER(title) LIKE '%store%' 
    OR LOWER(title) LIKE '%hub%'
    OR LOWER(COALESCE(category, '')) LIKE '%warehouse%'
  )
  AND LOWER(title) NOT LIKE '%picker%'
  AND LOWER(title) NOT LIKE '%packer%';

-- (D) OTHER JOBS: Retail, operations, customer support, security, sales, etc.
UPDATE public.jobs
SET category = 'Other Jobs',
    job_category = 'Other Jobs'
WHERE category IS NULL
   OR category = ''
   OR category NOT IN ('Drivers', 'Warehouse', 'Picker & Packer');

-- Step 4: Synchronize any candidate recent_category records
UPDATE public.candidates
SET recent_category = 'Drivers'
WHERE LOWER(recent_category) LIKE '%delivery%'
   OR LOWER(recent_category) LIKE '%driver%';

UPDATE public.candidates
SET recent_category = 'Warehouse'
WHERE LOWER(recent_category) LIKE '%warehouse%'
  AND LOWER(recent_category) NOT LIKE '%picker%';

UPDATE public.candidates
SET recent_category = 'Picker & Packer'
WHERE LOWER(recent_category) LIKE '%picker%'
   OR LOWER(recent_category) LIKE '%packer%';

-- Step 5: Add performance indexes for category lookups
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
