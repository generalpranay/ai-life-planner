"""
Data models for the AI Scheduler module.

Uses Pydantic for data validation and serialization.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class TaskCategory(str, Enum):
    """Supported task categories."""
    STUDY = "study"
    WORK = "work"
    PERSONAL = "personal"
    EXERCISE = "exercise"
    BREAK = "break"


class TaskStatus(str, Enum):
    """Task completion status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class Task(BaseModel):
    """Represents a task to be scheduled."""
    id: int
    user_id: int
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    todays_goal: Optional[str] = None
    category: TaskCategory = TaskCategory.STUDY
    priority: int = Field(default=3, ge=1, le=5)
    estimated_duration_minutes: Optional[int] = Field(default=60, ge=5, le=480)
    due_datetime: Optional[datetime] = None
    status: TaskStatus = TaskStatus.PENDING
    
    # Recurrence support
    is_recurring: bool = False
    recurrence_days: Optional[str] = None  # e.g., "Mon,Tue,Wed"
    start_time: Optional[str] = None      # e.g., "09:00"
    end_time: Optional[str] = None        # e.g., "17:00"
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    
    @field_validator('title', 'description', 'todays_goal', mode='before')
    @classmethod
    def sanitize_string(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize input strings to prevent XSS."""
        if v is None:
            return None
        # Remove HTML tags
        import re
        cleaned = re.sub(r'<[^>]*>', '', v)
        return cleaned.strip()


class Event(BaseModel):
    """Represents a fixed event (class, meeting, etc.)."""
    id: int
    user_id: int
    title: str = Field(..., min_length=1, max_length=500)
    start_datetime: datetime
    end_datetime: datetime
    is_fixed: bool = True
    recurrence: Optional[str] = None  # e.g., "weekly", "daily"
    
    @field_validator('end_datetime')
    @classmethod
    def validate_end_after_start(cls, v: datetime, info) -> datetime:
        """Ensure end time is after start time."""
        if 'start_datetime' in info.data and v <= info.data['start_datetime']:
            raise ValueError('end_datetime must be after start_datetime')
        return v


class ScheduleBlock(BaseModel):
    """Represents a scheduled time block."""
    id: Optional[int] = None
    user_id: int
    task_id: Optional[int] = None
    start_datetime: datetime
    end_datetime: datetime
    block_type: TaskCategory
    generated_by_ai: bool = True
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    todays_goal: Optional[str] = None
    
    @property
    def duration_minutes(self) -> int:
        """Calculate duration in minutes."""
        return int((self.end_datetime - self.start_datetime).total_seconds() / 60)


class TimeSlot(BaseModel):
    """Represents an available time slot for scheduling."""
    start: datetime
    end: datetime
    
    @property
    def duration_minutes(self) -> int:
        """Calculate slot duration in minutes."""
        return int((self.end - self.start).total_seconds() / 60)


class ScheduleRequest(BaseModel):
    """Request to generate a schedule."""
    user_id: int
    start_date: datetime
    end_date: Optional[datetime] = None  # Defaults to 7 days from start
    respect_working_hours: bool = True
    working_hours_start: int = Field(default=9, ge=0, le=23)
    working_hours_end: int = Field(default=21, ge=0, le=23)


class ScheduleResult(BaseModel):
    """Result of schedule generation."""
    success: bool
    blocks_created: int
    schedule: List[ScheduleBlock]
    unscheduled_tasks: List[Task] = []
    message: str = ""
