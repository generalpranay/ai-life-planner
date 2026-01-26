-- Migration: Add todays_goal column to tasks table
-- Run this migration on your PostgreSQL database

-- Add todays_goal column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'todays_goal'
    ) THEN
        ALTER TABLE tasks ADD COLUMN todays_goal TEXT;
    END IF;
END $$;

-- Add index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_tasks_user_status 
ON tasks(user_id, status);

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks';
