"""
Risk Detection Engine — pure logic, no DB required.

Input : list of task dicts with keys:
    { id, title, category, scheduledTime, estimatedMins, skipRate }
Output: { "flags": [{ "taskId", "type", "suggestion" }] }
"""

from datetime import datetime, timedelta


def detect_risks(tasks: list) -> dict:
    flags = []
    flags.extend(_check_overload(tasks))
    flags.extend(_check_skip_risk(tasks))
    flags.extend(_check_conflicts(tasks))
    return {"flags": flags}


# ── Rules ────────────────────────────────────────────────────────────────────

def _check_overload(tasks: list) -> list:
    total = sum(t.get("estimatedMins", 0) for t in tasks)
    if total <= 360:
        return []

    excess = total - 360
    # Flag the last task(s) that push past the limit as the suggestion target
    flags = []
    running = 0
    for t in tasks:
        running += t.get("estimatedMins", 0)
        if running > 360:
            flags.append({
                "taskId": t["id"],
                "type": "OVERLOAD",
                "suggestion": (
                    f"Total day load is {total} min ({excess} min over limit). "
                    f"Consider moving '{t['title']}' to another day or splitting it."
                ),
            })
    return flags


def _check_skip_risk(tasks: list) -> list:
    # Group skip rates by (category, time-bucket) to detect patterns
    # A task is flagged if skipRate > 0.5 on its own — the category+slot
    # pairing amplifies the signal but individual rate is the hard gate.
    bucket_skip: dict[tuple, list] = {}
    for t in tasks:
        key = (t.get("category", ""), _time_bucket(t.get("scheduledTime", "")))
        bucket_skip.setdefault(key, []).append(t)

    flags = []
    for (category, bucket), group in bucket_skip.items():
        high_skip = [t for t in group if t.get("skipRate", 0) > 0.5]
        for t in high_skip:
            pct = round(t["skipRate"] * 100)
            flags.append({
                "taskId": t["id"],
                "type": "SKIP_RISK",
                "suggestion": (
                    f"You skip {category} tasks in the {bucket} {pct}% of the time. "
                    f"Move '{t['title']}' to a time slot with a stronger completion record."
                ),
            })
    return flags


def _check_conflicts(tasks: list) -> list:
    # Build (start, end, task) tuples; skip tasks with unparseable times
    timed = []
    for t in tasks:
        start = _parse_time(t.get("scheduledTime", ""))
        if start is None:
            continue
        end = start + timedelta(minutes=t.get("estimatedMins", 0))
        timed.append((start, end, t))

    timed.sort(key=lambda x: x[0])

    flags = []
    seen_pairs: set[tuple] = set()

    for i in range(len(timed)):
        for j in range(i + 1, len(timed)):
            s1, e1, t1 = timed[i]
            s2, e2, t2 = timed[j]

            if s2 >= e1:
                break  # sorted — no further overlap possible

            overlap_mins = (min(e1, e2) - max(s1, s2)).seconds // 60
            if overlap_mins > 15:
                pair = (t1["id"], t2["id"])
                if pair not in seen_pairs:
                    seen_pairs.add(pair)
                    flags.append({
                        "taskId": t1["id"],
                        "type": "CONFLICT",
                        "suggestion": (
                            f"'{t1['title']}' and '{t2['title']}' overlap by {overlap_mins} min. "
                            f"Reschedule one to start after {e1.strftime('%H:%M')}."
                        ),
                    })
                    flags.append({
                        "taskId": t2["id"],
                        "type": "CONFLICT",
                        "suggestion": (
                            f"'{t2['title']}' conflicts with '{t1['title']}' by {overlap_mins} min. "
                            f"Move it to start at or after {e1.strftime('%H:%M')}."
                        ),
                    })
    return flags


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_time(time_str: str):
    """Parse HH:MM into a datetime (date part is today, irrelevant for diff)."""
    for fmt in ("%H:%M", "%I:%M %p", "%I:%M%p"):
        try:
            t = datetime.strptime(time_str.strip(), fmt)
            return datetime(2000, 1, 1, t.hour, t.minute)
        except ValueError:
            continue
    return None


def _time_bucket(time_str: str) -> str:
    t = _parse_time(time_str)
    if t is None:
        return "unknown"
    h = t.hour
    if 5 <= h < 12:
        return "morning"
    if 12 <= h < 17:
        return "afternoon"
    if 17 <= h < 21:
        return "evening"
    return "night"
