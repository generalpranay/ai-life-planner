import { Request } from "express";

// Extend Express Request to include the authenticated userId
export interface AuthenticatedRequest extends Request {
  userId: number;
}

// Database row shapes
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  sleep_time?: string;
  wake_time?: string;
  preferred_work_hours?: string;
  created_at: Date;
}

export interface TaskRow {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  category: string | null;
  due_datetime: Date | null;
  estimated_duration_minutes: number | null;
  priority: number;
  status: "pending" | "in_progress" | "completed";
  todays_goal: string | null;
  is_recurring: boolean;
  recurrence_days: string | null;
  start_time: string | null;
  end_time: string | null;
  date_range_start: Date | null;
  date_range_end: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChecklistItemRow {
  id: number;
  task_id: number;
  text: string;
  done: boolean;
  created_at: Date;
}

export interface ScheduledBlockRow {
  id: number;
  user_id: number;
  task_id: number | null;
  start_datetime: Date;
  end_datetime: Date;
  block_type: string;
  generated_by_ai: boolean;
  created_at: Date;
}

export interface EventRow {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  start_datetime: Date;
  end_datetime: Date;
  is_all_day: boolean;
  location: string | null;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export interface WebResourceRow {
  id: number;
  user_id: number;
  name: string;
  url: string;
  created_at: Date;
}
