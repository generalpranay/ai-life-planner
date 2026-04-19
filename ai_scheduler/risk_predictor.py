"""
DB-aware Risk Predictor.

Fetches today's pending schedule blocks + 30-day historical skip rates
for each (category, time-bucket) pair, then runs detect_risks() to
predict task failures before they happen.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional

from .config import config
from .risk_engine import detect_risks


def predict_day_risks(user_id: int, db_url: Optional[str] = None) -> dict:
    url = db_url or config.database.url
    conn = psycopg2.connect(url)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            today_blocks = _fetch_today_blocks(cur, user_id)
            skip_rates   = _fetch_skip_rates(cur, user_id)
    finally:
        conn.close()

    if not today_blocks:
        return {"flags": [], "totalMins": 0, "flagCount": 0}

    # Build enriched task list for the risk engine
    tasks = []
    for b in today_blocks:
        start         = b["start_datetime"]
        sched_time    = start.strftime("%H:%M") if start else "09:00"
        bucket        = _hour_to_bucket(start.hour if start else 9)
        category      = b["category"] or "other"
        estimated_mins = int(b["estimated_duration_minutes"] or 60)

        historical_skip = skip_rates.get((category, bucket), 0.0)

        tasks.append({
            "id":            b["block_id"],   # risk engine uses id as taskId
            "blockId":       b["block_id"],
            "taskId":        b["task_id"],
            "title":         b["title"] or "Untitled",
            "category":      category,
            "scheduledTime": sched_time,
            "estimatedMins": estimated_mins,
            "skipRate":      historical_skip,
        })

    raw = detect_risks(tasks)

    # Re-enrich flags with blockId + real taskId + title
    task_lookup = {t["id"]: t for t in tasks}
    flags = []
    for flag in raw["flags"]:
        t = task_lookup.get(flag["taskId"])
        flags.append({
            "taskId":    t["taskId"]  if t else None,
            "blockId":   t["blockId"] if t else flag["taskId"],
            "title":     t["title"]   if t else "Unknown Task",
            "type":      flag["type"],
            "suggestion": flag["suggestion"],
        })

    total_mins = sum(t["estimatedMins"] for t in tasks)
    return {
        "flags":     flags,
        "totalMins": total_mins,
        "flagCount": len(flags),
    }


# ── Queries ───────────────────────────────────────────────────────────────────

def _fetch_today_blocks(cur, user_id: int) -> list:
    cur.execute("""
        SELECT sb.id        AS block_id,
               sb.task_id,
               sb.start_datetime,
               sb.end_datetime,
               t.title,
               t.category,
               t.estimated_duration_minutes
        FROM scheduled_blocks sb
        JOIN tasks t ON sb.task_id = t.id
        WHERE sb.user_id     = %s
          AND sb.start_datetime::date = CURRENT_DATE
          AND sb.completed   = FALSE
          AND sb.skipped_at  IS NULL
        ORDER BY sb.start_datetime
    """, (user_id,))
    return cur.fetchall()


def _fetch_skip_rates(cur, user_id: int) -> dict:
    """Returns {(category, bucket): skip_rate_fraction} for the last 30 days."""
    cur.execute("""
        SELECT t.category,
               CASE
                 WHEN EXTRACT(HOUR FROM sb.start_datetime) BETWEEN 5  AND 11 THEN 'morning'
                 WHEN EXTRACT(HOUR FROM sb.start_datetime) BETWEEN 12 AND 16 THEN 'afternoon'
                 WHEN EXTRACT(HOUR FROM sb.start_datetime) BETWEEN 17 AND 20 THEN 'evening'
                 ELSE 'night'
               END                                                    AS bucket,
               COUNT(*)                                               AS total,
               COUNT(*) FILTER (WHERE sb.skipped_at IS NOT NULL)      AS skipped
        FROM scheduled_blocks sb
        JOIN tasks t ON sb.task_id = t.id
        WHERE sb.user_id    = %s
          AND sb.task_id    IS NOT NULL
          AND sb.start_datetime >= NOW() - INTERVAL '30 days'
        GROUP BY t.category, bucket
    """, (user_id,))
    rates = {}
    for row in cur.fetchall():
        total   = int(row["total"]   or 0)
        skipped = int(row["skipped"] or 0)
        if total > 0:
            rates[(row["category"], row["bucket"])] = skipped / total
    return rates


# ── Helper ────────────────────────────────────────────────────────────────────

def _hour_to_bucket(h: int) -> str:
    if 5 <= h < 12:  return "morning"
    if 12 <= h < 17: return "afternoon"
    if 17 <= h < 21: return "evening"
    return "night"
