"""
Rule-based Natural Language Task Parser — no LLM required.

Extracts structured task fields from free-text input using:
  - Regex patterns for dates, times, durations, recurrence
  - Keyword lookup for category and priority
  - Token removal to derive a clean title

Covers the most common phrasings without any external dependencies.
"""

import re
from datetime import datetime, timedelta
from typing import Optional


# ── Lookup tables ─────────────────────────────────────────────────────────────

_DAY_MAP = {
    "monday": 0, "mon": 0,
    "tuesday": 1, "tue": 1,
    "wednesday": 2, "wed": 2,
    "thursday": 3, "thu": 3,
    "friday": 4, "fri": 4,
    "saturday": 5, "sat": 5,
    "sunday": 6, "sun": 6,
}

_DAY_ABBREV = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}

_MONTH_MAP = {
    "january": 1, "jan": 1, "february": 2, "feb": 2,
    "march": 3, "mar": 3, "april": 4, "apr": 4,
    "may": 5, "june": 6, "jun": 6,
    "july": 7, "jul": 7, "august": 8, "aug": 8,
    "september": 9, "sep": 9, "october": 10, "oct": 10,
    "november": 11, "nov": 11, "december": 12, "dec": 12,
}

_CATEGORY_KEYWORDS = {
    "study": [
        "study", "learn", "learning", "read", "reading", "review",
        "homework", "assignment", "exam", "quiz", "revision",
        "lecture", "course", "practice", "prep", "preparation",
        "research", "notes", "flashcard", "tutorial",
    ],
    "work": [
        "meeting", "call", "report", "deadline", "project", "client",
        "presentation", "email", "work", "office", "sprint", "standup",
        "interview", "proposal", "invoice", "review", "sync", "task",
    ],
    "health": [
        "gym", "workout", "run", "running", "exercise", "yoga", "swim",
        "swimming", "jog", "jogging", "walk", "walking", "stretch",
        "meditation", "cardio", "weight", "training", "fitness",
        "bike", "cycling", "hike", "hiking", "crossfit", "pilates",
    ],
    "personal": [
        "shopping", "clean", "cleaning", "cook", "cooking", "family",
        "friend", "trip", "movie", "game", "relax", "hobby",
        "groceries", "doctor", "appointment", "haircut", "laundry",
        "birthday", "dinner", "lunch", "breakfast", "party",
    ],
}

_PRIORITY_MAP = {
    5: ["urgent", "asap", "critical", "must", "immediately", "emergency",
        "due today", "overdue", "right now"],
    4: ["important", "high priority", "priority", "soon", "need to",
        "have to", "deadline"],
    2: ["low", "whenever", "someday", "optional", "maybe",
        "if possible", "eventually", "no rush"],
}


# ── Public API ────────────────────────────────────────────────────────────────

def parse_task(text: str, today: Optional[datetime] = None) -> dict:
    """
    Parse a natural-language task description into structured fields.

    Returns a dict matching the Gemini output shape:
        {
          "title":           str,
          "description":     str | null,
          "category":        "study" | "work" | "health" | "personal" | "other",
          "priority":        1-5,
          "is_recurring":    bool,
          "recurrence_days": list[str] | null,
          "start_time":      "HH:MM" | null,
          "end_time":        "HH:MM" | null,
          "due_date":        "YYYY-MM-DD" | null,
          "estimated_minutes": int | null,
        }
    """
    if today is None:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    remaining = text.strip()

    # Extract in order so each step strips tokens before the next
    is_recurring, recurrence_days, remaining = _extract_recurrence(remaining)
    due_date, remaining                       = _extract_date(remaining, today, is_recurring)
    start_time, end_time, remaining           = _extract_times(remaining)
    estimated_minutes, remaining              = _extract_duration(remaining)
    category                                  = _detect_category(text)   # use original text
    priority                                  = _detect_priority(text)   # use original text
    title                                     = _clean_title(remaining)

    # Fallback title: use original text stripped of only leading/trailing noise
    if not title:
        title = _clean_title(text)

    return {
        "title":             title or text.strip()[:200],
        "description":       None,
        "category":          category,
        "priority":          priority,
        "is_recurring":      is_recurring,
        "recurrence_days":   recurrence_days,
        "start_time":        start_time,
        "end_time":          end_time,
        "due_date":          due_date,
        "estimated_minutes": estimated_minutes,
    }


# ── Extraction helpers ────────────────────────────────────────────────────────

def _extract_recurrence(text: str):
    """Detect recurring patterns. Returns (is_recurring, [day_abbrevs], cleaned_text)."""
    t = text

    # Check specific patterns BEFORE generic "daily" so they take priority

    # "every weekday"
    if re.search(r'\bevery weekday\b', t, re.IGNORECASE):
        days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        t = re.sub(r'\bevery weekday\b', '', t, flags=re.IGNORECASE)
        return True, days, t.strip()

    # "every weekend" / "on weekends"
    if re.search(r'\b(every weekend|on weekends?)\b', t, re.IGNORECASE):
        t = re.sub(r'\b(every weekend|on weekends?)\b', '', t, flags=re.IGNORECASE)
        return True, ["Sat", "Sun"], t.strip()

    # "every Monday, Wednesday and Friday" or "every Mon, Wed, Fri"
    days_pattern = '|'.join(_DAY_MAP.keys())
    m = re.search(
        rf'\bevery\s+((?:(?:{days_pattern})(?:\s*[,/&]\s*|\s+and\s+|\s+))*(?:{days_pattern}))\b',
        t, re.IGNORECASE
    )
    if m:
        raw = m.group(1)
        found = re.findall(rf'\b({days_pattern})\b', raw, re.IGNORECASE)
        abbrevs = list({_DAY_ABBREV[_DAY_MAP[d.lower()]] for d in found})
        t = t[:m.start()] + t[m.end():]
        return True, abbrevs, t.strip()

    # "weekly on Tuesday and Thursday"
    m = re.search(
        rf'\bweekly\s+(?:on\s+)?((?:(?:{days_pattern})(?:\s*[,/]\s*|\s+and\s+|\s+))*(?:{days_pattern}))\b',
        t, re.IGNORECASE
    )
    if m:
        raw = m.group(1)
        found = re.findall(rf'\b({days_pattern})\b', raw, re.IGNORECASE)
        abbrevs = list({_DAY_ABBREV[_DAY_MAP[d.lower()]] for d in found})
        t = t[:m.start()] + t[m.end():]
        return True, abbrevs, t.strip()

    # "every day" / "daily"  ← checked LAST so weekday/specific patterns win
    if re.search(r'\b(every day|daily)\b', t, re.IGNORECASE):
        days = list(_DAY_ABBREV.values())
        t = re.sub(r'\b(every day|daily)\b', '', t, flags=re.IGNORECASE)
        return True, days, t.strip()

    return False, None, t


def _extract_date(text: str, today: datetime, is_recurring: bool):
    """Returns (date_iso_or_None, cleaned_text). Skips if already recurring."""
    if is_recurring:
        return None, text

    t = text

    # "today"
    if re.search(r'\btoday\b', t, re.IGNORECASE):
        t = re.sub(r'\btoday\b', '', t, flags=re.IGNORECASE)
        return today.strftime('%Y-%m-%d'), t.strip()

    # "tomorrow"
    if re.search(r'\btomorrow\b', t, re.IGNORECASE):
        t = re.sub(r'\btomorrow\b', '', t, flags=re.IGNORECASE)
        return (today + timedelta(days=1)).strftime('%Y-%m-%d'), t.strip()

    # "next Monday" / "this Friday"
    days_pat = '|'.join(_DAY_MAP.keys())
    m = re.search(
        rf'\b(next|this)\s+({days_pat})\b', t, re.IGNORECASE
    )
    if m:
        prefix     = m.group(1).lower()
        target_day = _DAY_MAP[m.group(2).lower()]
        days_ahead = (target_day - today.weekday()) % 7
        if prefix == "next" and days_ahead == 0:
            days_ahead = 7
        elif days_ahead == 0:
            days_ahead = 0
        date_str = (today + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
        t = t[:m.start()] + t[m.end():]
        return date_str, t.strip()

    # "on Monday" (without next/this)
    m = re.search(rf'\bon\s+({days_pat})\b', t, re.IGNORECASE)
    if m:
        target_day = _DAY_MAP[m.group(1).lower()]
        days_ahead = (target_day - today.weekday()) % 7 or 7
        date_str = (today + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
        t = t[:m.start()] + t[m.end():]
        return date_str, t.strip()

    # ISO "2025-01-15"
    m = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', t)
    if m:
        date_str = m.group(1)
        t = t[:m.start()] + t[m.end():]
        return date_str, t.strip()

    # "January 15" / "Jan 15"
    months_pat = '|'.join(_MONTH_MAP.keys())
    m = re.search(rf'\b({months_pat})\s+(\d{{1,2}})\b', t, re.IGNORECASE)
    if m:
        month_num = _MONTH_MAP[m.group(1).lower()]
        day_num   = int(m.group(2))
        year      = today.year
        try:
            dt = datetime(year, month_num, day_num)
            if dt.date() < today.date():
                dt = datetime(year + 1, month_num, day_num)
            date_str = dt.strftime('%Y-%m-%d')
            t = t[:m.start()] + t[m.end():]
            return date_str, t.strip()
        except ValueError:
            pass

    # "in 3 days" / "in 2 weeks"
    m = re.search(r'\bin\s+(\d+)\s+(day|days|week|weeks)\b', t, re.IGNORECASE)
    if m:
        n    = int(m.group(1))
        unit = m.group(2).lower()
        delta = timedelta(days=n) if 'day' in unit else timedelta(weeks=n)
        date_str = (today + delta).strftime('%Y-%m-%d')
        t = t[:m.start()] + t[m.end():]
        return date_str, t.strip()

    return None, t


def _extract_times(text: str):
    """Returns (start_HH:MM | None, end_HH:MM | None, cleaned_text)."""
    t = text

    # "6pm to 8pm" / "6:30pm-8pm" / "18:00 to 20:00"
    m = re.search(
        r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|–|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)',
        t, re.IGNORECASE
    )
    if m:
        h1, min1, mer1, h2, min2, mer2 = m.groups()
        # If first has no meridiem, inherit from second
        if not mer1:
            mer1 = mer2
        start = _to_24h(int(h1), int(min1 or 0), mer1)
        end   = _to_24h(int(h2), int(min2 or 0), mer2)
        t = t[:m.start()] + t[m.end():]
        return start, end, t.strip()

    # Single time: "at 6pm" / "6:30pm" / "6pm" / "18:00"
    m = re.search(
        r'\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b',
        t, re.IGNORECASE
    )
    if m:
        start = _to_24h(int(m.group(1)), int(m.group(2) or 0), m.group(3))
        t = t[:m.start()] + t[m.end():]
        return start, None, t.strip()

    # 24-hour "18:30" / "09:00"
    m = re.search(r'\b([01]?\d|2[0-3]):([0-5]\d)\b', t)
    if m:
        start = f"{int(m.group(1)):02d}:{m.group(2)}"
        t = t[:m.start()] + t[m.end():]
        return start, None, t.strip()

    return None, None, t


def _extract_duration(text: str):
    """Returns (minutes | None, cleaned_text)."""
    t = text

    # "1h 30m" / "1h30m" / "1 hr 30 mins" / "1 hour 30 minutes"
    m = re.search(
        r'(\d+)\s*(?:hours?|hrs?|h\b)\s*(?:and\s+)?(\d+)\s*(?:minutes?|mins?|m\b)',
        t, re.IGNORECASE
    )
    if m:
        minutes = int(m.group(1)) * 60 + int(m.group(2))
        t = t[:m.start()] + t[m.end():]
        return minutes, t.strip()

    # "2 hours" / "2hr" / "2h" / "90 mins" / "30m"
    m = re.search(
        r'(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)',
        t, re.IGNORECASE
    )
    if m:
        minutes = round(float(m.group(1)) * 60)
        t = t[:m.start()] + t[m.end():]
        return minutes, t.strip()

    m = re.search(
        r'(?:for\s+)?(\d+)\s*(?:minutes?|mins?|m\b)',
        t, re.IGNORECASE
    )
    if m:
        minutes = int(m.group(1))
        t = t[:m.start()] + t[m.end():]
        return minutes, t.strip()

    return None, t


def _detect_category(text: str) -> str:
    """Return category based on keyword matching (most matches wins)."""
    t = text.lower()
    scores = {cat: 0 for cat in _CATEGORY_KEYWORDS}
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if re.search(rf'\b{re.escape(kw)}\b', t):
                scores[cat] += 1
    best = max(scores, key=lambda c: scores[c])
    return best if scores[best] > 0 else "other"


def _detect_priority(text: str) -> int:
    """Return priority 1-5 based on keyword matching."""
    t = text.lower()
    for level in (5, 4, 2):           # check high first
        for phrase in _PRIORITY_MAP[level]:
            if re.search(rf'\b{re.escape(phrase)}\b', t):
                return level
    return 3                           # default: medium


def _clean_title(text: str) -> str:
    """Strip leftover noise tokens and capitalise first word."""
    # Remove common filler phrases
    noise = [
        r'\badd\b', r'\bcreate\b', r'\bschedule\b', r'\bremind me\b',
        r'\bremind me to\b', r'\breminder\b', r'\bi need to\b',
        r'\bi have to\b', r'\bi want to\b', r'\bplease\b',
        r'\bcan you\b', r'\bset a\b', r'\bset up\b', r'\bblock\b',
    ]
    t = text
    for pattern in noise:
        t = re.sub(pattern, '', t, flags=re.IGNORECASE)

    # Collapse whitespace and clean up punctuation artefacts
    t = re.sub(r'\s{2,}', ' ', t)
    # Strip dangling prepositions/articles left over from token removal
    t = re.sub(r'\b(at|for|on|in|a|an|the)\s*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'^[\s,\-–]+|[\s,\-–]+$', '', t)
    t = t.strip()

    if not t:
        return ''

    # Capitalise first letter
    return t[0].upper() + t[1:]


# ── Internal utility ──────────────────────────────────────────────────────────

def _to_24h(hour: int, minute: int, meridiem: Optional[str]) -> str:
    """Convert h/m/meridiem to "HH:MM" string."""
    if meridiem:
        mer = meridiem.lower()
        if mer == 'pm' and hour != 12:
            hour += 12
        elif mer == 'am' and hour == 12:
            hour = 0
    return f"{hour:02d}:{minute:02d}"
