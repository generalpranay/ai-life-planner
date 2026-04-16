-- Migration: Create events table for calendar events
-- These are fixed calendar events (meetings, appointments, etc.)
-- distinct from tasks (which are work items to be scheduled)

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    location VARCHAR(500),
    color VARCHAR(20) DEFAULT 'blue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT events_end_after_start CHECK (end_datetime >= start_datetime)
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

-- Index for range queries (calendar views)
CREATE INDEX IF NOT EXISTS idx_events_user_datetime ON events(user_id, start_datetime);
