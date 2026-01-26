-- Migration: Add recurrence columns and web_resources table

-- 1. Add recurrence columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_days TEXT, -- JSON string ["Mon", "Wed"] or comma-separated
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS date_range_start DATE,
ADD COLUMN IF NOT EXISTS date_range_end DATE;

-- 2. Create web_resources table
CREATE TABLE IF NOT EXISTS web_resources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for web_resources
CREATE INDEX IF NOT EXISTS idx_web_resources_user ON web_resources(user_id);
