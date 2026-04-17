-- Migration: add completed_at / skipped_at timestamps and 'skipped' task status
-- Run with: psql $DATABASE_URL -f backend/migrations/add_skip_and_timestamps.sql

-- ── 1. tasks table ───────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS skipped_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_note  TEXT;

-- Widen the status check constraint to include 'skipped'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'));

-- ── 2. scheduled_blocks table ────────────────────────────────────────────────

ALTER TABLE scheduled_blocks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS skipped_at   TIMESTAMPTZ;

-- ── 3. Indexes for analytics queries (T5 / T6) ───────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tasks_status_user
  ON tasks (user_id, status);

CREATE INDEX IF NOT EXISTS idx_blocks_completed_at
  ON scheduled_blocks (user_id, completed_at)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blocks_skipped_at
  ON scheduled_blocks (user_id, skipped_at)
  WHERE skipped_at IS NOT NULL;
