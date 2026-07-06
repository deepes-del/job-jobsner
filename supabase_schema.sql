-- ============================================================
-- JobHai Logistics Platform — Supabase SQL Schema Migration
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- ── 1. CANDIDATES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id           TEXT PRIMARY KEY,
  "fullName"   TEXT NOT NULL,
  mobile       TEXT UNIQUE NOT NULL,
  email        TEXT,
  salt         TEXT NOT NULL,
  hash         TEXT NOT NULL,
  profile      JSONB DEFAULT '{}'::jsonb,
  documents    JSONB DEFAULT '[]'::jsonb,
  "createdAt"  TIMESTAMPTZ DEFAULT now()
);

-- ── 2. RECRUITERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruiters (
  id               TEXT PRIMARY KEY,
  "companyName"    TEXT NOT NULL,
  "companyLogo"    TEXT DEFAULT '',
  "companyWebsite" TEXT DEFAULT '',
  "recruiterName"  TEXT NOT NULL,
  designation      TEXT NOT NULL,
  mobile           TEXT UNIQUE NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  salt             TEXT NOT NULL,
  hash             TEXT NOT NULL,
  address          TEXT DEFAULT '',
  city             TEXT DEFAULT '',
  state            TEXT DEFAULT '',
  pincode          TEXT DEFAULT '',
  status           TEXT DEFAULT 'Pending',
  "createdAt"      TIMESTAMPTZ DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ DEFAULT now()
);

-- ── 3. JOBS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                       TEXT PRIMARY KEY,
  "recruiterId"            TEXT REFERENCES recruiters(id) ON DELETE CASCADE,
  "companyName"            TEXT NOT NULL,
  "companyLogo"            TEXT DEFAULT '',
  title                    TEXT NOT NULL,
  category                 TEXT NOT NULL,
  openings                 INTEGER DEFAULT 1,
  "employmentType"         TEXT NOT NULL,
  state                    TEXT NOT NULL,
  city                     TEXT NOT NULL,
  area                     TEXT NOT NULL,
  "workLocation"           TEXT DEFAULT '',
  "minSalary"              NUMERIC DEFAULT 0,
  "maxSalary"              NUMERIC DEFAULT 0,
  "salaryType"             TEXT DEFAULT 'Monthly',
  shift                    TEXT DEFAULT 'Day',
  "experienceRequired"     NUMERIC DEFAULT 0,
  "educationRequired"      TEXT DEFAULT '10th Pass',
  "genderPreference"       TEXT DEFAULT 'Any',
  "ageLimitMin"            INTEGER DEFAULT 18,
  "ageLimitMax"            INTEGER DEFAULT 60,
  "bikeRequired"           TEXT DEFAULT 'No',
  "drivingLicenseRequired" TEXT DEFAULT 'No',
  "immediateJoining"       TEXT DEFAULT 'No',
  description              TEXT DEFAULT '',
  responsibilities         TEXT DEFAULT '',
  benefits                 TEXT DEFAULT '',
  status                   TEXT DEFAULT 'Draft',
  "applicationsCount"      INTEGER DEFAULT 0,
  "viewsCount"             INTEGER DEFAULT 0,
  "createdAt"              TIMESTAMPTZ DEFAULT now(),
  "updatedAt"              TIMESTAMPTZ DEFAULT now()
);

-- ── 4. APPLICATIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id               TEXT PRIMARY KEY,
  "candidateId"    TEXT REFERENCES candidates(id) ON DELETE CASCADE,
  "jobId"          TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  "recruiterId"    TEXT REFERENCES recruiters(id) ON DELETE CASCADE,
  "appliedDate"    TIMESTAMPTZ DEFAULT now(),
  "currentStatus"  TEXT DEFAULT 'Applied',
  "withdrawStatus" TEXT DEFAULT 'Active',
  "lastUpdated"    TIMESTAMPTZ DEFAULT now()
);

-- ── 5. DOCUMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id                   TEXT PRIMARY KEY,
  "candidateId"        TEXT REFERENCES candidates(id) ON DELETE CASCADE,
  "documentType"       TEXT NOT NULL,
  "fileUrl"            TEXT NOT NULL,
  "fileName"           TEXT NOT NULL,
  "uploadDate"         TIMESTAMPTZ DEFAULT now(),
  "verificationStatus" TEXT DEFAULT 'Pending'
);

-- ── 6. APPLICATION HISTORY ────────────────────────────────
CREATE TABLE IF NOT EXISTS "applicationHistory" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "applicationId"   TEXT REFERENCES applications(id) ON DELETE CASCADE,
  "changedBy"       TEXT,
  "previousStatus"  TEXT,
  "newStatus"       TEXT,
  note              TEXT DEFAULT '',
  "changedAt"       TIMESTAMPTZ DEFAULT now()
);

-- ── 7. RECRUITER NOTES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "recruiterNotes" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "applicationId" TEXT REFERENCES applications(id) ON DELETE CASCADE,
  "recruiterId"   TEXT REFERENCES recruiters(id) ON DELETE CASCADE,
  "noteText"      TEXT NOT NULL,
  "createdAt"     TIMESTAMPTZ DEFAULT now()
);

-- ── DISABLE ROW LEVEL SECURITY (app manages its own auth) ─
-- The app uses its own HMAC-signed JWT system, not Supabase Auth.
-- Disabling RLS lets the service_role key read/write freely.
ALTER TABLE candidates           DISABLE ROW LEVEL SECURITY;
ALTER TABLE recruiters           DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications         DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents            DISABLE ROW LEVEL SECURITY;
ALTER TABLE "applicationHistory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "recruiterNotes"     DISABLE ROW LEVEL SECURITY;
