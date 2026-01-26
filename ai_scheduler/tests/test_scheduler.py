"""
Unit tests for the AI Scheduler core algorithm.

Uses mock database to test scheduling logic in isolation.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock

from ai_scheduler.scheduler import AIScheduler, OccupiedSlot
from ai_scheduler.models import Task, Event, ScheduleBlock, TaskCategory, TaskStatus, TimeSlot


class TestAIScheduler:
    """Tests for the AIScheduler class."""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock database."""
        return Mock()
    
    @pytest.fixture
    def scheduler(self, mock_db):
        """Create a scheduler with mock database."""
        return AIScheduler(database=mock_db)
    
    def test_prioritize_tasks_by_due_date(self, scheduler):
        """Test that tasks with earlier due dates are prioritized."""
        now = datetime.now()
        
        tasks = [
            Task(id=1, user_id=1, title="Later Task", due_datetime=now + timedelta(days=5), priority=3),
            Task(id=2, user_id=1, title="Urgent Task", due_datetime=now + timedelta(days=1), priority=3),
            Task(id=3, user_id=1, title="No Due Date", priority=3),
        ]
        
        sorted_tasks = scheduler._prioritize_tasks(tasks)
        
        assert sorted_tasks[0].id == 2  # Earliest due date first
        assert sorted_tasks[1].id == 1
        assert sorted_tasks[2].id == 3  # No due date last
    
    def test_prioritize_tasks_by_priority(self, scheduler):
        """Test that higher priority tasks come first when due dates are equal."""
        now = datetime.now()
        due_date = now + timedelta(days=3)
        
        tasks = [
            Task(id=1, user_id=1, title="Low Priority", due_datetime=due_date, priority=1),
            Task(id=2, user_id=1, title="High Priority", due_datetime=due_date, priority=5),
            Task(id=3, user_id=1, title="Medium Priority", due_datetime=due_date, priority=3),
        ]
        
        sorted_tasks = scheduler._prioritize_tasks(tasks)
        
        assert sorted_tasks[0].id == 2  # Highest priority first
        assert sorted_tasks[1].id == 3
        assert sorted_tasks[2].id == 1
    
    def test_find_next_slot_respects_working_hours(self, scheduler):
        """Test that slots are only found during working hours."""
        # Start at 6 AM (before working hours)
        cursor = datetime(2024, 1, 15, 6, 0)
        end = cursor + timedelta(days=1)
        
        slot = scheduler._find_next_slot(
            cursor=cursor,
            end=end,
            occupied_slots=[],
            min_duration=30,
            respect_working_hours=True
        )
        
        assert slot is not None
        assert slot.start.hour >= scheduler.config.preferred_hours_start
    
    def test_find_next_slot_avoids_occupied(self, scheduler):
        """Test that slots avoid occupied time periods."""
        cursor = datetime(2024, 1, 15, 10, 0)
        end = cursor + timedelta(hours=4)
        
        # Occupy 10:00-11:00
        occupied = [OccupiedSlot(
            start=datetime(2024, 1, 15, 10, 0),
            end=datetime(2024, 1, 15, 11, 0)
        )]
        
        slot = scheduler._find_next_slot(
            cursor=cursor,
            end=end,
            occupied_slots=occupied,
            min_duration=30,
            respect_working_hours=False
        )
        
        assert slot is not None
        assert slot.start >= occupied[0].end
    
    def test_allocate_task_splits_long_tasks(self, scheduler, mock_db):
        """Test that long tasks are split into multiple blocks."""
        mock_db.create_schedule_block = MagicMock(side_effect=lambda b: b)
        
        task = Task(
            id=1,
            user_id=1,
            title="Long Study Session",
            estimated_duration_minutes=180,  # 3 hours
            category=TaskCategory.STUDY
        )
        
        start = datetime(2024, 1, 15, 9, 0)
        end = start + timedelta(days=1)
        
        blocks = scheduler._allocate_task(
            task=task,
            user_id=1,
            start=start,
            end=end,
            occupied_slots=[],
            respect_working_hours=False
        )
        
        # Should be split into multiple blocks (max 2 hours each)
        assert len(blocks) >= 2
        
        # Total duration should equal or exceed task duration
        total_duration = sum(b.duration_minutes for b in blocks)
        assert total_duration >= 180
    
    def test_generate_schedule_no_tasks(self, scheduler, mock_db):
        """Test schedule generation with no pending tasks."""
        mock_db.clear_generated_blocks.return_value = 0
        mock_db.get_fixed_events.return_value = []
        mock_db.get_pending_tasks.return_value = []
        
        result = scheduler.generate_weekly_schedule(user_id=1)
        
        assert result.success is True
        assert result.blocks_created == 0
        assert "No pending tasks" in result.message
    
    def test_generate_schedule_with_tasks(self, scheduler, mock_db):
        """Test full schedule generation with tasks."""
        mock_db.clear_generated_blocks.return_value = 0
        mock_db.get_fixed_events.return_value = []
        mock_db.get_pending_tasks.return_value = [
            Task(id=1, user_id=1, title="Task 1", estimated_duration_minutes=60),
            Task(id=2, user_id=1, title="Task 2", estimated_duration_minutes=30),
        ]
        mock_db.create_schedule_block = MagicMock(side_effect=lambda b: b)
        
        result = scheduler.generate_weekly_schedule(user_id=1)
        
        assert result.success is True
        assert result.blocks_created >= 2
    
    def test_free_time_suggestions(self, scheduler, mock_db):
        """Test free time activity suggestions."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Only one block scheduled, leaving gaps
        mock_db.get_schedule_blocks.return_value = [
            ScheduleBlock(
                id=1,
                user_id=1,
                start_datetime=today.replace(hour=14),
                end_datetime=today.replace(hour=15),
                block_type=TaskCategory.WORK
            )
        ]
        
        suggestions = scheduler.get_free_time_suggestions(user_id=1, date=today)
        
        assert len(suggestions) > 0
        assert all('type' in s for s in suggestions)
        assert all('title' in s for s in suggestions)


class TestOccupiedSlot:
    """Tests for OccupiedSlot dataclass."""
    
    def test_occupied_slot_creation(self):
        """Test creating an OccupiedSlot."""
        start = datetime(2024, 1, 15, 10, 0)
        end = datetime(2024, 1, 15, 11, 0)
        
        slot = OccupiedSlot(start=start, end=end)
        
        assert slot.start == start
        assert slot.end == end
