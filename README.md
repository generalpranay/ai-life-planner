# AI Life Planner

A smart personal productivity app that learns your habits and schedules your life around them — no cloud AI subscriptions required. All intelligence runs locally using a custom-built Python behavior engine and scheduling algorithms.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Flutter App (Web / Mobile)            │
│   Home · Schedule · Tasks · AI Insights · Optimization  │
└────────────────────────┬────────────────────────────────┘
                         │ REST / JSON
┌────────────────────────▼────────────────────────────────┐
│              Node.js / Express Backend  :4000            │
│  Auth · Tasks · Events · Schedule · AI Routes           │
└──────────┬────────────────────────────┬─────────────────┘
           │ SQL                        │ child_process.spawn
┌──────────▼──────────┐   ┌────────────▼──────────────────┐
│   PostgreSQL DB     │   │   Python AI Scheduler          │
│                     │   │                                │
│  tasks              │   │  behavior_engine.py  ← analyze │
│  scheduled_blocks   │   │  task_parser.py      ← parse   │
│  completion_streaks │   │  scheduler.py        ← schedule│
│  events             │   │  database.py                   │
│  users              │   │                                │
└─────────────────────┘   └────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile / Web UI | Flutter 3.x (Dart) |
| Backend API | Node.js + Express + TypeScript |
| Database | PostgreSQL 18 |
| AI / Scheduling | Python 3.x (custom engine, no LLM) |
| Auth | JWT (RS256) |

---

## Features

### Task Management
- Create tasks with title, category, priority, due date, checklist, and today's goal
- Natural language task input — type _"Gym every Monday at 7am for 1 hour"_ and fields are auto-filled
- Recurring tasks with custom day patterns and date ranges
- Fixed-time tasks with conflict detection and auto-resolution by priority
- Checklist sub-items with live progress bar

### Smart Scheduling
- AI scheduler generates a full weekly timetable from your pending tasks
- Behavior-aware: difficult tasks are placed in your historically productive hours
- Conflict resolution: equal-priority overlaps prompt the user; others are auto-resolved
- Schedule blocks can be marked **done** or **skipped** with a single tap

### Behavior Analysis (no LLM)
- Per-category success rate tracking (study / work / health / personal)
- Time-of-day bucket analysis (morning / afternoon / evening / night)
- Procrastination pattern detection
- Consistency score computed directly from completion data
- Actionable, data-driven insights generated from real numbers

### Insights UI
- Consistency score ring
- Category success-rate bars
- Time-of-day productivity chart
- Productive / low-output hour chips
- Procrastination pattern list
- Skip rate summary card

### Schedule Optimization
- Identifies high-focus tasks placed in low-productivity windows
- Suggests moves with plain-English reasons
- Deterministic — reproducible output, no AI hallucinations

---

## Project Structure

```
ai-life-planner/
├── backend/                   Node.js / Express API
│   ├── src/
│   │   ├── controllers/       Request handlers
│   │   ├── routes/            Route definitions
│   │   ├── middleware/        JWT auth middleware
│   │   ├── config/            DB connection
│   │   └── types/             TypeScript interfaces
│   ├── migrations/            SQL migration files
│   └── tsconfig.json
│
├── ai_scheduler/              Python intelligence layer
│   ├── behavior_engine.py     Behavioral analysis engine
│   ├── task_parser.py         NL task parser (regex, no LLM)
│   ├── scheduler.py           Behavior-aware weekly scheduler
│   ├── database.py            PostgreSQL query layer
│   ├── models.py              Pydantic data models
│   ├── config.py              Scheduler configuration
│   ├── run_scheduler.py       CLI: weekly schedule generation
│   ├── run_analyzer.py        CLI: behavior analysis
│   ├── run_parser.py          CLI: NL task parsing
│   └── tests/
│
└── mobile_app/                Flutter application
    └── lib/
        ├── screens/           UI screens
        ├── services/          API service layer
        ├── models/            Dart data models
        ├── widgets/           Shared UI components
        └── theme/             App theme & colors
```

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 18
- Flutter 3.x

---

### 1. Database

Create the database and run all migrations in order:

```bash
psql -U postgres -c "CREATE DATABASE ai_life_planner;"

psql -U postgres -d ai_life_planner -f backend/migrations/recurrence_and_web.sql
psql -U postgres -d ai_life_planner -f backend/migrations/create_events_table.sql
psql -U postgres -d ai_life_planner -f backend/migrations/add_todays_goal.sql
psql -U postgres -d ai_life_planner -f backend/migrations/add_skip_and_timestamps.sql
```

---

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=ai_life_planner

JWT_SECRET=your_jwt_secret
PORT=4000
```

Start the dev server:

```bash
npm run dev
```

The API will be available at `http://localhost:4000`.

---

### 3. Python AI Scheduler

```bash
cd ai_scheduler
pip install -r requirements.txt
```

Create `ai_scheduler/.env`:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ai_life_planner
```

Test the behavior engine directly:

```bash
python run_analyzer.py <user_id>
```

Test the task parser:

```bash
python run_parser.py --text "Study for exam tomorrow at 6pm for 2 hours"
```

---

### 4. Flutter App

```bash
cd mobile_app
flutter pub get
```

Update `mobile_app/lib/config/api_config.dart` to point to your backend:

```dart
static const String baseUrl = 'http://localhost:4000';
```

Run on Chrome (recommended for development):

```bash
flutter run -d chrome
```

---

## API Reference

All routes except `/api/auth/*` require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/refresh` | Refresh expired token |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create task (auto-schedules if fixed time) |
| GET | `/api/tasks/:id` | Get task with checklist |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/checklist` | Add checklist item |
| PATCH | `/api/tasks/checklist/:itemId` | Toggle checklist item |
| POST | `/api/tasks/resolve-conflict` | Resolve equal-priority time conflict |

### Schedule
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/schedule/week` | Fetch weekly schedule |
| GET | `/api/schedule/today` | Fetch today's schedule |
| POST | `/api/schedule/generate-week` | Run AI scheduler |
| DELETE | `/api/schedule/clear` | Clear all AI-generated blocks |
| PATCH | `/api/schedule/blocks/:id/complete` | Mark block done / undone |
| PATCH | `/api/schedule/blocks/:id/skip` | Mark block skipped |
| GET | `/api/schedule/streak` | Get current completion streak |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/analyze` | Run behavior analysis (Python engine) |
| POST | `/api/ai/optimize` | Get schedule optimization suggestions |
| POST | `/api/ai/parse-task` | Parse natural language into task fields |

### Events & Web Resources
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/events` | List / create calendar events |
| GET/POST | `/api/web-resources` | List / create saved links |

---

## How the AI Works

All intelligence runs locally in the `ai_scheduler/` Python package. The Node.js backend spawns Python scripts via `child_process.spawn` and reads their JSON output — no external AI APIs are used.

### Behavior Analysis (`behavior_engine.py`)

Queries the last 30 days of completion and skip data, then applies deterministic rules:

```
productive_hours   = time buckets where success_rate >= 65%
low_hours          = time buckets where success_rate < 45%
preferred_types    = categories where success_rate >= 65%
avoided_types      = categories where success_rate < 40% OR skip_rate > 35%
consistency_score  = completed_blocks / total_blocks × 100
```

Insights are assembled from templates filled with real numbers — e.g. _"Your morning (05:00–12:00) is most productive at 82% — schedule your hardest tasks here"_.

### Task Parser (`task_parser.py`)

Extracts structured fields from free text using regex patterns — no model needed:

```
"Study for exam tomorrow at 6pm for 2 hours"
 → title="Study for exam", category=study, due=tomorrow,
   start_time=18:00, estimated_minutes=120

"Gym every Monday and Wednesday at 7am"
 → title="Gym", category=health, is_recurring=True,
   recurrence_days=["Mon","Wed"], start_time=07:00
```

Supported patterns: today/tomorrow/next Mon/in 3 days/Jan 15 · 6pm/18:00/6pm-8pm · every weekday/daily/every Mon+Wed · 2h/1h 30m/45 mins · urgent→pri5 / important→pri4 / someday→pri2.

### Scheduler (`scheduler.py`)

Generates a weekly timetable by:
1. Loading behavioral hints (per-category and per-period success rates)
2. Prioritizing tasks — struggling categories get prime-time slots first
3. Filling free time around fixed events and recurring blocks
4. Splitting long tasks into ≤2 hour chunks with break gaps

---

## Development

### Backend (TypeScript)

```bash
cd backend
npm run dev      # ts-node-dev with hot reload
npm run build    # compile to dist/
npm test         # jest test suite
```

### Python

```bash
cd ai_scheduler
pytest tests/ -v
```

### Flutter

```bash
cd mobile_app
flutter analyze          # static analysis
flutter run -d chrome    # web dev
flutter run -d windows   # desktop (requires Developer Mode)
```

---

## Database Schema (key tables)

```sql
tasks              — id, user_id, title, category, priority, status,
                     completed_at, skipped_at, is_recurring, ...

scheduled_blocks   — id, user_id, task_id, start_datetime, end_datetime,
                     completed, completed_at, skipped_at, generated_by_ai

completion_streaks — user_id, current_streak, longest_streak, last_completed_date

events             — id, user_id, title, start_datetime, end_datetime, is_fixed
```

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `DB_HOST` | backend/.env | PostgreSQL host |
| `DB_PORT` | backend/.env | PostgreSQL port (default 5432) |
| `DB_USER` | backend/.env | Database user |
| `DB_PASSWORD` | backend/.env | Database password |
| `DB_NAME` | backend/.env | Database name |
| `JWT_SECRET` | backend/.env | Secret for signing JWT tokens |
| `PORT` | backend/.env | API server port (default 4000) |
| `DATABASE_URL` | ai_scheduler/.env | Full Postgres URL for Python scripts |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Run the full stack locally and verify nothing is broken
4. Open a pull request with a clear description

---

Built by Pranay Bhalsod
