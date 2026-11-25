-- ============================================================
-- Jobsner – Account Deletion Migration
-- Run this in your Supabase SQL editor (or on server start)
-- ============================================================

-- Audit table for completed account deletions
CREATE TABLE IF NOT EXISTS account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

-- Table for public (unauthenticated) account-deletion requests
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'   -- PENDING | PROCESSED | REJECTED
);

-- Indexes for quick look-up
CREATE INDEX IF NOT EXISTS idx_account_deletions_candidate_id ON account_deletions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_phone ON deletion_requests(phone);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
