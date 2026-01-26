
import sys
import os
from datetime import datetime, timedelta
from ai_scheduler.scheduler import AIScheduler
from ai_scheduler.database import Database
from ai_scheduler.models import Task, TaskCategory

def verify():
    db = Database()
    scheduler = AIScheduler(db)
    user_id = 1 # Assuming test user id 1
    
    # Use a fixed date for testing
    start_date = datetime(2025, 1, 6) # A Monday
    
    print(f"Verifying recurrence for user {user_id} starting {start_date}")
    
    # Create a recurring task (e.g. Work Mon-Fri 9-5)
    # We'll mock the database call or just rely on the logic if we can
    # But let's actually try to use the classes
    
    task = Task(
        id=999,
        user_id=user_id,
        title="Recurring Job",
        category=TaskCategory.WORK,
        priority=5,
        is_recurring=True,
        recurrence_days="Mon,Tue,Wed,Thu,Fri",
        start_time="09:00",
        end_time="17:00"
    )
    
    slots = scheduler._get_slots_for_recurring_task(task, start_date, start_date + timedelta(days=7))
    print(f"Generated {len(slots)} recurring slots.")
    for s in slots:
        print(f"  - {s.start} to {s.end}")
    
    if len(slots) != 5:
        print("ERROR: Should have 5 slots for Mon-Fri")
        return

    # Verify that find_next_slot avoids these
    # Try to find a slot at 10 AM on Monday
    monday_10am = start_date.replace(hour=10, minute=0)
    occupied = [s for s in slots]
    
    next_slot = scheduler._find_next_slot(
        cursor=monday_10am,
        end=start_date + timedelta(days=1),
        occupied_slots=occupied,
        min_duration=30,
        respect_working_hours=True
    )
    
    if next_slot:
        print(f"Next available slot after 10 AM Mon: {next_slot.start}")
        if next_slot.start < datetime(2025,1,6,17,0):
             print("ERROR: Found slot inside recurring block!")
        else:
             print("SUCCESS: Avoided recurring block.")
    else:
        print("No free slots found (Expected if work is 9-9 and we respect working hours)")

if __name__ == "__main__":
    verify()
