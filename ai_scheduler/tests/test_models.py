"""
Unit tests for the AI Scheduler models.
"""

import pytest
from datetime import datetime, timedelta

from ai_scheduler.models import (
    Task, Event, ScheduleBlock, TimeSlot,
    TaskCategory, TaskStatus, ScheduleRequest, ScheduleResult
)


class TestTaskModel:
    """Tests for the Task model."""
    
    def test_task_creation_valid(self):
        """Test creating a valid task."""
        task = Task(
            id=1,
            user_id=1,
            title="Study Math",
            description="Review chapter 5",
            todays_goal="Complete 10 problems",
            category=TaskCategory.STUDY,
            priority=4,
            estimated_duration_minutes=60
        )
        
        assert task.id == 1
        assert task.title == "Study Math"
        assert task.priority == 4
        assert task.category == TaskCategory.STUDY
    
    def test_task_sanitizes_html(self):
        """Test that HTML tags are removed from input."""
        task = Task(
            id=1,
            user_id=1,
            title="<script>alert('xss')</script>Study Math",
            description="<b>Bold</b> text"
        )
        
        assert "<script>" not in task.title
        assert "<b>" not in task.description
        assert "Study Math" in task.title
    
    def test_task_priority_bounds(self):
        """Test that priority is validated (1-5)."""
        with pytest.raises(ValueError):
            Task(id=1, user_id=1, title="Test", priority=0)
        
        with pytest.raises(ValueError):
            Task(id=1, user_id=1, title="Test", priority=6)
    
    def test_task_title_required(self):
        """Test that title cannot be empty."""
        with pytest.raises(ValueError):
            Task(id=1, user_id=1, title="")
    
    def test_task_default_values(self):
        """Test default values are applied."""
        task = Task(id=1, user_id=1, title="Test Task")
        
        assert task.priority == 3
        assert task.category == TaskCategory.STUDY
        assert task.status == TaskStatus.PENDING
        assert task.estimated_duration_minutes == 60


class TestEventModel:
    """Tests for the Event model."""
    
    def test_event_creation_valid(self):
        """Test creating a valid event."""
        start = datetime.now()
        end = start + timedelta(hours=1)
        
        event = Event(
            id=1,
            user_id=1,
            title="Team Meeting",
            start_datetime=start,
            end_datetime=end
        )
        
        assert event.title == "Team Meeting"
        assert event.is_fixed is True
    
    def test_event_end_after_start(self):
        """Test that end_datetime must be after start_datetime."""
        start = datetime.now()
        end = start - timedelta(hours=1)  # End before start
        
        with pytest.raises(ValueError):
            Event(
                id=1,
                user_id=1,
                title="Invalid Event",
                start_datetime=start,
                end_datetime=end
            )


class TestScheduleBlock:
    """Tests for the ScheduleBlock model."""
    
    def test_schedule_block_duration(self):
        """Test duration calculation."""
        start = datetime.now()
        end = start + timedelta(minutes=90)
        
        block = ScheduleBlock(
            user_id=1,
            start_datetime=start,
            end_datetime=end,
            block_type=TaskCategory.WORK
        )
        
        assert block.duration_minutes == 90


class TestTimeSlot:
    """Tests for the TimeSlot model."""
    
    def test_timeslot_duration(self):
        """Test TimeSlot duration calculation."""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        slot = TimeSlot(start=start, end=end)
        
        assert slot.duration_minutes == 120


class TestScheduleResult:
    """Tests for the ScheduleResult model."""
    
    def test_schedule_result_success(self):
        """Test creating a successful schedule result."""
        result = ScheduleResult(
            success=True,
            blocks_created=5,
            schedule=[],
            message="Schedule generated"
        )
        
        assert result.success is True
        assert result.blocks_created == 5
    
    def test_schedule_result_with_unscheduled(self):
        """Test result with unscheduled tasks."""
        unscheduled = [
            Task(id=1, user_id=1, title="Task 1"),
            Task(id=2, user_id=1, title="Task 2")
        ]
        
        result = ScheduleResult(
            success=True,
            blocks_created=3,
            schedule=[],
            unscheduled_tasks=unscheduled
        )
        
        assert len(result.unscheduled_tasks) == 2
