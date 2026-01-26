"""
AI Life Planner - Python AI Scheduler Module

This module provides intelligent scheduling capabilities for the AI Life Planner application.
"""

from .scheduler import AIScheduler
from .models import Task, ScheduleBlock, Event

__version__ = "1.0.0"
__all__ = ["AIScheduler", "Task", "ScheduleBlock", "Event"]
