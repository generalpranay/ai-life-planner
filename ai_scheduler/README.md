# AI Life Planner - Python AI Scheduler Module

An intelligent scheduling system that generates optimized weekly timetables using AI-assisted algorithms.

## Features

- 🧠 Smart task prioritization based on deadlines, priority, and duration
- 📅 Respects fixed events (classes, meetings, work hours)
- ⏰ Intelligent time slot allocation
- 🔄 Dynamic rescheduling when tasks are completed or delayed
- 💡 Free-time activity suggestions

## Installation

```bash
cd ai_scheduler
pip install -r requirements.txt
```

## Usage

```python
from scheduler import AIScheduler

scheduler = AIScheduler()
schedule = scheduler.generate_weekly_schedule(user_id=1)
```

## API Endpoints

The scheduler integrates with the Node.js backend via REST API calls.

## Testing

```bash
pytest tests/ -v
```
