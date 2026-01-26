"""
Database operations for the AI Scheduler.

Provides secure access to PostgreSQL database with connection pooling.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Optional
from datetime import datetime
from contextlib import contextmanager

from .config import config
from .models import Task, Event, ScheduleBlock, TaskCategory, TaskStatus


class DatabaseError(Exception):
    """Custom exception for database errors."""
    pass


class Database:
    """Database operations handler with secure query execution."""
    
    def __init__(self, connection_url: Optional[str] = None):
        self.connection_url = connection_url or config.database.url
        self._conn = None
    
    @contextmanager
    def get_cursor(self):
        """Get a database cursor with automatic connection management."""
        conn = None
        try:
            conn = psycopg2.connect(self.connection_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            yield cursor
            conn.commit()
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            raise DatabaseError(f"Database error: {e}")
        finally:
            if conn:
                conn.close()
    
    def get_pending_tasks(self, user_id: int) -> List[Task]:
        """Fetch all pending tasks for a user, ordered by priority and due date."""
        query = """
            SELECT 
                id, user_id, title, description, todays_goal, 
                category, priority, estimated_duration_minutes,
                due_datetime, status,
                is_recurring, recurrence_days, start_time, end_time,
                date_range_start, date_range_end
            FROM tasks
            WHERE user_id = %s AND status != 'done'
            ORDER BY 
                due_datetime NULLS LAST,
                priority DESC
        """
        
        with self.get_cursor() as cursor:
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
        
        tasks = []
        for row in rows:
            try:
                tasks.append(Task(
                    id=row['id'],
                    user_id=row['user_id'],
                    title=row['title'],
                    description=row['description'],
                    todays_goal=row['todays_goal'],
                    category=TaskCategory(row['category']) if row['category'] else TaskCategory.STUDY,
                    priority=row['priority'] or 3,
                    estimated_duration_minutes=row['estimated_duration_minutes'],
                    due_datetime=row['due_datetime'],
                    status=TaskStatus(row['status']) if row['status'] else TaskStatus.PENDING,
                    is_recurring=row['is_recurring'] or False,
                    recurrence_days=row['recurrence_days'],
                    start_time=row['start_time'],
                    end_time=row['end_time'],
                    date_range_start=row['date_range_start'],
                    date_range_end=row['date_range_end']
                ))
            except Exception as e:
                import sys
                print(f"Warning: Could not parse task {row['id']}: {e}", file=sys.stderr)
                continue
        
        return tasks
    
    def get_fixed_events(self, user_id: int, start: datetime, end: datetime) -> List[Event]:
        """Fetch fixed events within a date range."""
        query = """
            SELECT id, user_id, title, start_datetime, end_datetime, is_fixed
            FROM events
            WHERE user_id = %s 
                AND is_fixed = TRUE
                AND start_datetime BETWEEN %s AND %s
            ORDER BY start_datetime
        """
        
        with self.get_cursor() as cursor:
            cursor.execute(query, (user_id, start, end))
            rows = cursor.fetchall()
        
        return [Event(**row) for row in rows]
    
    def create_schedule_block(self, block: ScheduleBlock) -> ScheduleBlock:
        """Insert a new schedule block into the database."""
        query = """
            INSERT INTO scheduled_blocks 
                (user_id, task_id, start_datetime, end_datetime, block_type, generated_by_ai)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        
        with self.get_cursor() as cursor:
            cursor.execute(query, (
                block.user_id,
                block.task_id,
                block.start_datetime,
                block.end_datetime,
                block.block_type.value,
                block.generated_by_ai
            ))
            result = cursor.fetchone()
            block.id = result['id']
        
        return block
    
    def clear_generated_blocks(self, user_id: int, start: datetime, end: datetime) -> int:
        """Delete AI-generated blocks within a date range. Returns count deleted."""
        query = """
            DELETE FROM scheduled_blocks
            WHERE user_id = %s
                AND generated_by_ai = TRUE
                AND start_datetime BETWEEN %s AND %s
        """
        
        with self.get_cursor() as cursor:
            cursor.execute(query, (user_id, start, end))
            return cursor.rowcount
    
    def get_schedule_blocks(self, user_id: int, start: datetime, end: datetime) -> List[ScheduleBlock]:
        """Fetch schedule blocks for a user within a date range."""
        query = """
            SELECT 
                sb.id, sb.user_id, sb.task_id, sb.start_datetime, 
                sb.end_datetime, sb.block_type, sb.generated_by_ai,
                t.title as task_title, t.description as task_description, t.todays_goal
            FROM scheduled_blocks sb
            LEFT JOIN tasks t ON sb.task_id = t.id
            WHERE sb.user_id = %s
                AND sb.start_datetime BETWEEN %s AND %s
            ORDER BY sb.start_datetime
        """
        
        with self.get_cursor() as cursor:
            cursor.execute(query, (user_id, start, end))
            rows = cursor.fetchall()
        
        return [
            ScheduleBlock(
                id=row['id'],
                user_id=row['user_id'],
                task_id=row['task_id'],
                start_datetime=row['start_datetime'],
                end_datetime=row['end_datetime'],
                block_type=TaskCategory(row['block_type']) if row['block_type'] else TaskCategory.STUDY,
                generated_by_ai=row['generated_by_ai'],
                task_title=row['task_title'],
                task_description=row['task_description'],
                todays_goal=row['todays_goal']
            )
            for row in rows
        ]
