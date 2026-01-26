#!/usr/bin/env python3
"""
CLI entry point for the AI Scheduler.
Allows the Node.js backend to invoke the Python scheduler.

Usage:
    python run_scheduler.py <user_id> [start_date string]
"""

import sys
import json
import argparse
from datetime import datetime

# Add current directory to path so we can import modules
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_scheduler.scheduler import AIScheduler
from ai_scheduler.database import Database
from ai_scheduler.models import ScheduleResult

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    # Serialize Pydantic models
    if hasattr(obj, 'model_dump'):
        return obj.model_dump()
    if hasattr(obj, 'dict'):
        return obj.dict()
    raise TypeError(f"Type {type(obj)} not serializable")

def main():
    parser = argparse.ArgumentParser(description='Run AI Scheduler')
    parser.add_argument('user_id', type=int, help='User ID to schedule for')
    parser.add_argument('--start-date', type=str, help='Start date (ISO format)', default=None)
    
    args = parser.parse_args()
    
    try:
        scheduler = AIScheduler()
        
        start_date = None
        if args.start_date:
            try:
                # Parse ISO string (usually UTC from backend)
                # Convert to local time and make naive to match scheduler logic
                dt = datetime.fromisoformat(args.start_date.replace('Z', '+00:00'))
                start_date = dt.astimezone(None).replace(tzinfo=None)
            except ValueError:
                pass
        
        result = scheduler.generate_weekly_schedule(
            user_id=args.user_id,
            start_date=start_date
        )
        
        # Output result as JSON to stdout
        print(json.dumps(result.model_dump(), default=json_serial))
        
    except Exception as e:
        # Output error as JSON to stderr
        error_response = {
            "success": False,
            "message": str(e),
            "blocks_created": 0,
            "schedule": []
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
