"""
AI Scheduler - Core scheduling algorithm.

Generates optimized weekly schedules based on task priorities, 
deadlines, durations, and available free time.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from dataclasses import dataclass

from .models import Task, Event, ScheduleBlock, TimeSlot, TaskCategory, ScheduleRequest, ScheduleResult
from .database import Database
from .config import config


@dataclass
class OccupiedSlot:
    """Represents a time slot that is already occupied."""
    start: datetime
    end: datetime


class AIScheduler:
    """
    AI-assisted scheduler that generates weekly timetables.
    
    Features:
    - Respects fixed events (classes, meetings, work hours)
    - Prioritizes tasks by due date and priority level
    - Splits long tasks into manageable blocks
    - Avoids scheduling during non-working hours
    - Inserts breaks between extended work sessions
    """
    
    def __init__(self, database: Optional[Database] = None):
        self.db = database or Database()
        self.config = config.scheduler
    
    def generate_weekly_schedule(
        self,
        user_id: int,
        start_date: Optional[datetime] = None,
        respect_working_hours: bool = True
    ) -> ScheduleResult:
        """
        Generate a full weekly schedule for a user.
        
        Args:
            user_id: The user's ID
            start_date: Start of the scheduling period (defaults to today)
            respect_working_hours: Whether to only schedule during working hours
            
        Returns:
            ScheduleResult with created blocks and any unscheduled tasks
        """
        start = start_date or datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
        
        # 1. Clear existing AI-generated blocks
        deleted = self.db.clear_generated_blocks(user_id, start, end)
        
        # 2. Fetch fixed events
        fixed_events = self.db.get_fixed_events(user_id, start, end)
        occupied_slots = [OccupiedSlot(e.start_datetime, e.end_datetime) for e in fixed_events]
        
        # 3. Fetch pending tasks
        all_tasks = self.db.get_pending_tasks(user_id)
        
        # 3a. Handle Recurring Tasks & Fixed Time Tasks first
        recurring_tasks = [t for t in all_tasks if t.is_recurring]
        fixed_time_tasks = [t for t in all_tasks if not t.is_recurring and t.start_time and t.end_time]
        flexible_tasks = [t for t in all_tasks if not t.is_recurring and (not t.start_time or not t.end_time)]
        
        # Add recurring tasks to occupied slots
        for rt in recurring_tasks:
            occupied_slots.extend(self._get_slots_for_recurring_task(rt, start, end))
            
        # Add fixed time tasks to occupied slots AND create blocks for them
        for ft in fixed_time_tasks:
            slots = self._get_slots_for_fixed_task(ft, start, end)
            occupied_slots.extend(slots)
             # We also need to actually create the blocks for these now so they appear in schedule
            for slot in slots:
                 block = ScheduleBlock(
                    user_id=user_id,
                    task_id=ft.id,
                    start_datetime=slot.start,
                    end_datetime=slot.end,
                    block_type=ft.category,
                    generated_by_ai=True,
                    task_title=ft.title,
                    task_description=ft.description,
                    todays_goal=ft.todays_goal
                )
                 # Save immediately
                 saved = self.db.create_schedule_block(block)
                 # We don't add to created_blocks here because we return everything at end, 
                 # but we count them. Actually, let's add to created_blocks logic below?
                 # No, standard logic returns created_blocks.
                 created_blocks.append(saved)
        
        tasks = flexible_tasks
        
        
        if not tasks:
            return ScheduleResult(
                success=True,
                blocks_created=0,
                schedule=[],
                message="No pending tasks to schedule"
            )
        
        # 4. Sort tasks by scheduling priority
        sorted_tasks = self._prioritize_tasks(tasks)
        
        # 5. Allocate time slots for each task
        created_blocks: List[ScheduleBlock] = []
        unscheduled_tasks: List[Task] = []
        
        for task in sorted_tasks:
            blocks = self._allocate_task(
                task=task,
                user_id=user_id,
                start=start,
                end=end,
                occupied_slots=occupied_slots,
                respect_working_hours=respect_working_hours
            )
            
            if blocks:
                for block in blocks:
                    saved_block = self.db.create_schedule_block(block)
                    created_blocks.append(saved_block)
                    occupied_slots.append(OccupiedSlot(block.start_datetime, block.end_datetime))
            else:
                unscheduled_tasks.append(task)
        
        return ScheduleResult(
            success=True,
            blocks_created=len(created_blocks),
            schedule=created_blocks,
            unscheduled_tasks=unscheduled_tasks,
            message=f"Created {len(created_blocks)} scheduled blocks"
        )
    
    def _prioritize_tasks(self, tasks: List[Task]) -> List[Task]:
        """
        Sort tasks by scheduling priority.
        
        Priority factors (in order):
        1. Tasks with due dates (earlier first)
        2. Higher priority level
        3. Shorter estimated duration (easier to fit)
        """
        def sort_key(task: Task) -> Tuple:
            # Due date: earlier is better, None goes last
            due_priority = task.due_datetime.timestamp() if task.due_datetime else float('inf')
            # Priority: higher is better (negate for ascending sort)
            priority = -task.priority
            # Duration: shorter is better
            duration = task.estimated_duration_minutes or 60
            
            return (due_priority, priority, duration)
        
        return sorted(tasks, key=sort_key)
    
    def _allocate_task(
        self,
        task: Task,
        user_id: int,
        start: datetime,
        end: datetime,
        occupied_slots: List[OccupiedSlot],
        respect_working_hours: bool
    ) -> List[ScheduleBlock]:
        """
        Allocate time blocks for a single task.
        
        Splits long tasks into multiple blocks if needed.
        """
        duration_remaining = task.estimated_duration_minutes or 60
        blocks: List[ScheduleBlock] = []
        cursor = start
        
        max_block = self.config.max_block_duration
        
        while duration_remaining > 0 and cursor < end:
            # Find next available slot
            slot = self._find_next_slot(
                cursor=cursor,
                end=end,
                occupied_slots=occupied_slots,
                min_duration=min(duration_remaining, self.config.min_block_duration),
                respect_working_hours=respect_working_hours
            )
            
            if not slot:
                break
            
            # Calculate block duration (max 2 hours per block)
            block_duration = min(duration_remaining, max_block, slot.duration_minutes)
            
            block_end = slot.start + timedelta(minutes=block_duration)
            
            block = ScheduleBlock(
                user_id=user_id,
                task_id=task.id,
                start_datetime=slot.start,
                end_datetime=block_end,
                block_type=task.category,
                generated_by_ai=True,
                task_title=task.title,
                task_description=task.description,
                todays_goal=task.todays_goal
            )
            
            blocks.append(block)
            duration_remaining -= block_duration
            
            # Move cursor past this block (with a small break)
            cursor = block_end + timedelta(minutes=self.config.min_break_minutes)
        
        return blocks
    
    def _find_next_slot(
        self,
        cursor: datetime,
        end: datetime,
        occupied_slots: List[OccupiedSlot],
        min_duration: int,
        respect_working_hours: bool
    ) -> Optional[TimeSlot]:
        """
        Find the next available time slot starting from cursor.
        
        Properly handles multiple overlapping events by sorting occupied slots
        and checking all conflicts before placing an event.
        """
        # Sort occupied slots by start time for efficient overlap detection
        sorted_slots = sorted(occupied_slots, key=lambda x: x.start)
        
        while cursor < end:
            # Check working hours
            if respect_working_hours:
                if cursor.hour < self.config.preferred_hours_start:
                    cursor = cursor.replace(
                        hour=self.config.preferred_hours_start,
                        minute=0,
                        second=0
                    )
                elif cursor.hour >= self.config.preferred_hours_end:
                    # Move to next day
                    cursor = (cursor + timedelta(days=1)).replace(
                        hour=self.config.preferred_hours_start,
                        minute=0,
                        second=0
                    )
                    continue
            
            # Calculate slot end (either end of working hours or end of week)
            if respect_working_hours:
                slot_max_end = cursor.replace(
                    hour=self.config.preferred_hours_end,
                    minute=0,
                    second=0
                )
            else:
                slot_max_end = end
            
            # Find the next available slot by checking all occupied slots
            slot_start = cursor
            slot_end = slot_max_end
            conflict_found = False
            
            for occupied in sorted_slots:
                # Skip slots that end before our potential start
                if occupied.end <= slot_start:
                    continue
                
                # If occupied slot starts after our potential end, no more conflicts
                if occupied.start >= slot_end:
                    break
                
                # Overlap detected
                if slot_start < occupied.end and slot_end > occupied.start:
                    # If occupied slot starts before or at our start, move past it
                    if occupied.start <= slot_start:
                        slot_start = occupied.end + timedelta(minutes=5)
                        conflict_found = True
                        # If we've moved past the max end, this slot won't work
                        if slot_start >= slot_max_end:
                            break
                    else:
                        # Occupied slot starts after our start - use the gap before it
                        slot_end = occupied.start
                        break
            
            # Check if remaining slot is long enough
            if slot_start < slot_end:
                duration = int((slot_end - slot_start).total_seconds() / 60)
                if duration >= min_duration:
                    return TimeSlot(start=slot_start, end=slot_end)
            
            # Move cursor forward - if we had a conflict, start from where we left off
            if conflict_found and slot_start < end:
                cursor = slot_start
            else:
                cursor = cursor + timedelta(minutes=30)
        
        return None

    def _get_slots_for_recurring_task(self, task: Task, period_start: datetime, period_end: datetime) -> List[OccupiedSlot]:
        """Convert a recurring task definition into actual time slots for a given period."""
        if not task.is_recurring or not task.recurrence_days or not task.start_time or not task.end_time:
            return []
            
        slots = []
        days_map = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
        selected_days = [days_map[d.strip()] for d in task.recurrence_days.split(",") if d.strip() in days_map]
        
        try:
            h_start, m_start = map(int, task.start_time.split(":"))
            h_end, m_end = map(int, task.end_time.split(":"))
        except:
            return []

        curr = period_start
        while curr < period_end:
            if curr.weekday() in selected_days:
                # Check date range constraints if they exist
                if task.date_range_start and curr < task.date_range_start:
                    curr += timedelta(days=1)
                    continue
                if task.date_range_end and curr > task.date_range_end:
                    curr += timedelta(days=1)
                    continue
                    
                slot_start = curr.replace(hour=h_start, minute=m_start, second=0, microsecond=0)
                slot_end = curr.replace(hour=h_end, minute=m_end, second=0, microsecond=0)
                
                # Handle overnight if needed (though UI usually restricts)
                if slot_end <= slot_start:
                    slot_end += timedelta(days=1)
                    
                slots.append(OccupiedSlot(start=slot_start, end=slot_end))
            
            curr += timedelta(days=1)
            
        return slots
            
    def _get_slots_for_fixed_task(self, task: Task, period_start: datetime, period_end: datetime) -> List[OccupiedSlot]:
        """Convert a non-recurring fixed task into time slots."""
        if task.is_recurring or not task.start_time or not task.end_time or not task.due_datetime:
            # If no due_datetime (which acts as the date for non-recurring), we can't place it
            return []
            
        try:
            h_start, m_start = map(int, task.start_time.split(":"))
            h_end, m_end = map(int, task.end_time.split(":"))
        except:
            return []
            
        # For non-recurring, due_datetime hold the specific date
        target_date = task.due_datetime
        
        # Check if target date is within period
        if target_date < period_start or target_date >= period_end:
            return []
            
        slot_start = target_date.replace(hour=h_start, minute=m_start, second=0, microsecond=0)
        slot_end = target_date.replace(hour=h_end, minute=m_end, second=0, microsecond=0)
        
        if slot_end <= slot_start:
             # Handle overnight crossing if needed, but assuming same day for simple UI
             slot_end += timedelta(days=1)
             
        return [OccupiedSlot(start=slot_start, end=slot_end)]
    
    def get_free_time_suggestions(
        self,
        user_id: int,
        date: Optional[datetime] = None
    ) -> List[dict]:
        """
        Get suggestions for free time activities based on available gaps.
        
        Returns contextual suggestions like:
        - Exercise recommendations (gym routines)
        - Entertainment (Netflix time)
        - Relaxation / recovery
        """
        target_date = date or datetime.now()
        day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        # Fetch today's schedule
        blocks = self.db.get_schedule_blocks(user_id, day_start, day_end)
        
        # Find gaps
        suggestions = []
        current_time = day_start.replace(hour=self.config.preferred_hours_start)
        
        for block in blocks:
            if block.start_datetime > current_time:
                gap_minutes = int((block.start_datetime - current_time).total_seconds() / 60)
                if gap_minutes >= 30:
                    suggestions.append(self._suggest_for_gap(gap_minutes, current_time))
            current_time = block.end_datetime
        
        # Check gap after last block
        end_of_work = day_start.replace(hour=self.config.preferred_hours_end)
        if current_time < end_of_work:
            gap_minutes = int((end_of_work - current_time).total_seconds() / 60)
            if gap_minutes >= 30:
                suggestions.append(self._suggest_for_gap(gap_minutes, current_time))
        
        return suggestions
    
    def _suggest_for_gap(self, gap_minutes: int, start_time: datetime) -> dict:
        """Generate activity suggestion based on gap duration."""
        hour = start_time.hour
        
        if gap_minutes >= 60:
            if 6 <= hour <= 8:
                return {
                    "type": "exercise",
                    "title": "Morning Workout",
                    "description": "Great time for cardio or full body workout",
                    "duration_minutes": min(gap_minutes, 60),
                    "start_time": start_time.isoformat()
                }
            elif 17 <= hour <= 20:
                return {
                    "type": "exercise",
                    "title": "Evening Gym Session",
                    "description": "Strength training: Chest & Triceps day",
                    "duration_minutes": min(gap_minutes, 90),
                    "start_time": start_time.isoformat()
                }
            else:
                return {
                    "type": "entertainment",
                    "title": "Relaxation Time",
                    "description": "Watch a show, read, or unwind",
                    "duration_minutes": gap_minutes,
                    "start_time": start_time.isoformat()
                }
        elif gap_minutes >= 30:
            return {
                "type": "break",
                "title": "Quick Break",
                "description": "Stretch, hydrate, or take a short walk",
                "duration_minutes": gap_minutes,
                "start_time": start_time.isoformat()
            }
        
        return {
            "type": "micro_break",
            "title": "Micro Break",
            "description": "Deep breathing or quick stretch",
            "duration_minutes": gap_minutes,
            "start_time": start_time.isoformat()
        }
