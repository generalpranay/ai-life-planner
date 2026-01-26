
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock
from ai_scheduler.scheduler import AIScheduler, OccupiedSlot
from ai_scheduler.models import Task, TimeSlot

class TestOverlapComplex:
    @pytest.fixture
    def mock_db(self):
        return Mock()
    
    @pytest.fixture
    def scheduler(self, mock_db):
        return AIScheduler(database=mock_db)

    def test_find_next_slot_multiple_overlaps(self, scheduler):
        """
        Test properly handling multiple overlapping occupied slots.
        Scenario:
        - Slot 1: 10:00 - 11:00
        - Slot 2: 10:30 - 11:30 (Overlaps with 1)
        - Slot 3: 13:00 - 14:00 (Gap before this)
        
        We want to schedule a 1-hour task starting from 9:00.
        Should find 9:00-10:00 (if working hours allow) or 11:30-12:30.
        """
        base_date = datetime(2024, 1, 15)
        
        # Occupied slots
        occupied = [
            OccupiedSlot(start=base_date.replace(hour=10, minute=0), end=base_date.replace(hour=11, minute=0)),
            OccupiedSlot(start=base_date.replace(hour=10, minute=30), end=base_date.replace(hour=11, minute=30)),
            OccupiedSlot(start=base_date.replace(hour=13, minute=0), end=base_date.replace(hour=14, minute=0)),
        ]
        
        # Try to schedule a 60 min task starting at 10:00 (which is occupied)
        # Should skip past the first two overlapping slots and find 11:30
        
        cursor = base_date.replace(hour=10, minute=0)
        end = base_date.replace(hour=18, minute=0)
        
        slot = scheduler._find_next_slot(
            cursor=cursor,
            end=end,
            occupied_slots=occupied,
            min_duration=60,
            respect_working_hours=False
        )
        
        assert slot is not None
        # The first available slot after 10:00 should be 11:30 (end of second overlapping block) + 5 min buffer maybe?
        # The code implementation adds 5 mins buffer: `slot_start = occupied.end + timedelta(minutes=5)`
        # So 11:30 + 5 min = 11:35.
        
        expected_start = base_date.replace(hour=11, minute=35)
        assert slot.start == expected_start
        assert slot.end >= slot.start + timedelta(minutes=60)

    def test_find_next_slot_nested_overlaps(self, scheduler):
        """
        Test nested overlaps (one slot completely inside another).
        - Slot 1: 10:00 - 12:00
        - Slot 2: 10:30 - 11:00
        """
        base_date = datetime(2024, 1, 15)
        occupied = [
            OccupiedSlot(start=base_date.replace(hour=10, minute=0), end=base_date.replace(hour=12, minute=0)),
            OccupiedSlot(start=base_date.replace(hour=10, minute=30), end=base_date.replace(hour=11, minute=0)),
        ]
        
        cursor = base_date.replace(hour=10, minute=0)
        end = base_date.replace(hour=18, minute=0)
        
        slot = scheduler._find_next_slot(
            cursor=cursor,
            end=end,
            occupied_slots=occupied,
            min_duration=60,
            respect_working_hours=False
        )
        
        assert slot is not None
        # Should start after 12:00 + 5 min
        expected_start = base_date.replace(hour=12, minute=5)
        assert slot.start == expected_start
