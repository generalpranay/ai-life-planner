#!/usr/bin/env python3
"""
CLI entry point for the Goal Decomposition Engine.

Reads real user behavioral data from the DB (via behavior_engine) to generate a
personalized week-by-week plan. Week 1 is always front-loaded with skills and
research tasks; subsequent weeks use phase-based templates adjusted by the
user's actual completion patterns.

Usage:
    python run_goal_decomposer.py <user_id> '<json_payload>'

JSON payload shape:
    {
      "goal": string,
      "deadline": "YYYY-MM-DD",
      "today": "YYYY-MM-DD",          (optional, defaults to UTC today)
      "weeks_available": number,       (optional)
      "user_behavior": {               (optional manual overrides)
        "productive_hours": [...],
        "strong_categories": [...],
        "avoid_categories": [...]
      }
    }
"""

import sys
import json
import os
import uuid
import re
from datetime import datetime
from typing import Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_scheduler.behavior_engine import get_behavior_hints
from ai_scheduler.database import Database


# ── Skill extraction ──────────────────────────────────────────────────────────

_SKILL_MAP = [
    (re.compile(r"react",                          re.I), "React"),
    (re.compile(r"vue",                            re.I), "Vue.js"),
    (re.compile(r"angular",                        re.I), "Angular"),
    (re.compile(r"javascript|js\b",                re.I), "JavaScript"),
    (re.compile(r"typescript|ts\b",                re.I), "TypeScript"),
    (re.compile(r"python",                         re.I), "Python"),
    (re.compile(r"node\.?js",                      re.I), "Node.js"),
    (re.compile(r"java\b",                         re.I), "Java"),
    (re.compile(r"flutter",                        re.I), "Flutter"),
    (re.compile(r"dart",                           re.I), "Dart"),
    (re.compile(r"sql|postgres|mysql|database",    re.I), "SQL & Databases"),
    (re.compile(r"api|rest\b|graphql",             re.I), "API Design"),
    (re.compile(r"docker|kubernetes",              re.I), "Containerization"),
    (re.compile(r"aws|azure|gcp|cloud",            re.I), "Cloud Services"),
    (re.compile(r"machine learning|deep learning|\bml\b|\bai\b", re.I), "Machine Learning"),
    (re.compile(r"git\b|version control",          re.I), "Git"),
    (re.compile(r"html|css",                       re.I), "HTML/CSS"),
    (re.compile(r"figma|ui\b|ux\b|design",         re.I), "UI/UX Design"),
    (re.compile(r"fitness|gym|workout|exercise",   re.I), "Physical Training"),
    (re.compile(r"nutrition|diet",                 re.I), "Nutrition"),
    (re.compile(r"meditat|mindful",                re.I), "Mindfulness"),
    (re.compile(r"writing|blog|content",           re.I), "Writing"),
    (re.compile(r"marketing|seo",                  re.I), "Digital Marketing"),
    (re.compile(r"spanish|french|german|japanese|chinese|language", re.I), "Language Learning"),
    (re.compile(r"swift|ios",                      re.I), "iOS/Swift"),
    (re.compile(r"kotlin|android",                 re.I), "Android/Kotlin"),
    (re.compile(r"rust\b",                         re.I), "Rust"),
    (re.compile(r"go\b|golang",                    re.I), "Go"),
    (re.compile(r"c\+\+",                          re.I), "C++"),
    (re.compile(r"internship|career",              re.I), "Career Development"),
    (re.compile(r"interview",                      re.I), "Interview Preparation"),
    (re.compile(r"portfolio",                      re.I), "Portfolio Building"),
    (re.compile(r"resume|cv\b",                    re.I), "Resume Writing"),
]

_STOP = {"that","this","with","from","have","will","been","want","need",
         "build","learn","make","create","become","into","some","more","about","goal"}


def _extract_skills(goal: str) -> list:
    found = []
    for pattern, skill in _SKILL_MAP:
        if pattern.search(goal) and skill not in found:
            found.append(skill)
    if not found:
        words = [w for w in re.findall(r"\b[A-Za-z]{4,}\b", goal)
                 if w.lower() not in _STOP]
        found = list(dict.fromkeys(w.capitalize() for w in words))[:5]
    return list(dict.fromkeys(found))[:8]


# ── Category inference ────────────────────────────────────────────────────────

_CATEGORY_ALIASES = {
    "health":   ["gym", "fitness", "exercise", "health", "workout", "sports"],
    "work":     ["work", "office", "meetings", "job", "career", "internship"],
    "study":    ["study", "learning", "school", "class", "course"],
    "personal": ["personal", "social", "family", "hobby"],
}


def _infer_category(goal: str) -> str:
    g = goal.lower()
    if re.search(r"fitness|gym|run|health|diet|weight|exercise|workout|yoga|meditat", g):
        return "health"
    if re.search(r"learn|study|course|exam|certif|read|tutorial|master|understand", g):
        return "study"
    if re.search(r"internship|career|job|interview|portfolio|build|develop|create"
                 r"|launch|project|product|code|program", g):
        return "work"
    return "personal"


def _is_avoided(category: str, avoid_set: set) -> bool:
    aliases = _CATEGORY_ALIASES.get(category, [category])
    return any(
        any(alias in av or av in alias for alias in aliases)
        for av in avoid_set
    )


# ── Task templates ────────────────────────────────────────────────────────────

_WEEK1_TASKS = {
    "study": [
        {"title": "Research learning roadmap and top resources",  "duration_mins": 30, "energy_type": "deep"},
        {"title": "Set up study environment and tools",           "duration_mins": 25, "energy_type": "light"},
        {"title": "Identify key skills and create a skill map",   "duration_mins": 30, "energy_type": "deep"},
        {"title": "Read introductory material and take notes",    "duration_mins": 40, "energy_type": "passive"},
        {"title": "Outline weekly study schedule",                "duration_mins": 25, "energy_type": "light"},
    ],
    "work": [
        {"title": "Research industry standards and role requirements", "duration_mins": 35, "energy_type": "deep"},
        {"title": "Identify skill gaps and draft action plan",         "duration_mins": 30, "energy_type": "deep"},
        {"title": "Set up project environment and toolchain",          "duration_mins": 25, "energy_type": "light"},
        {"title": "Map deliverables and define milestones",            "duration_mins": 30, "energy_type": "light"},
        {"title": "Scope next week's priorities",                      "duration_mins": 25, "energy_type": "light"},
    ],
    "health": [
        {"title": "Research evidence-based training methodology", "duration_mins": 30, "energy_type": "passive"},
        {"title": "Complete baseline fitness self-assessment",    "duration_mins": 25, "energy_type": "light"},
        {"title": "Design weekly schedule with rest days",        "duration_mins": 25, "energy_type": "light"},
        {"title": "Prepare nutrition and recovery strategy",      "duration_mins": 30, "energy_type": "deep"},
        {"title": "Log Day 1 metrics and set benchmarks",         "duration_mins": 25, "energy_type": "light"},
    ],
    "personal": [
        {"title": "Write clear vision statement and success metrics", "duration_mins": 30, "energy_type": "deep"},
        {"title": "Research best practices and inspiring examples",   "duration_mins": 25, "energy_type": "passive"},
        {"title": "Create personal development plan",                 "duration_mins": 30, "energy_type": "deep"},
        {"title": "Identify potential obstacles and mitigations",     "duration_mins": 25, "energy_type": "light"},
        {"title": "Schedule recurring check-ins and reviews",         "duration_mins": 25, "energy_type": "light"},
    ],
}

_TASK_TEMPLATES = {
    "study": [
        {"title": "Study core concepts from primary resource",        "duration_mins": 45, "energy_type": "deep"},
        {"title": "Complete practice exercises and problems",         "duration_mins": 50, "energy_type": "deep"},
        {"title": "Review and summarise previous material",           "duration_mins": 30, "energy_type": "light"},
        {"title": "Watch instructional video and take notes",         "duration_mins": 40, "energy_type": "passive"},
        {"title": "Build small project applying learned concepts",    "duration_mins": 60, "energy_type": "deep"},
        {"title": "Read supplementary documentation",                 "duration_mins": 35, "energy_type": "passive"},
        {"title": "Do spaced repetition review",                      "duration_mins": 25, "energy_type": "light"},
        {"title": "Write notes or blog post to reinforce learning",   "duration_mins": 40, "energy_type": "deep"},
        {"title": "Work through advanced problem set",                "duration_mins": 55, "energy_type": "deep"},
        {"title": "Participate in study community or forum",          "duration_mins": 30, "energy_type": "light"},
        {"title": "Take mock test on covered material",               "duration_mins": 30, "energy_type": "deep"},
        {"title": "Explore related advanced topics",                  "duration_mins": 35, "energy_type": "passive"},
    ],
    "work": [
        {"title": "Deep work session on primary deliverable",         "duration_mins": 60, "energy_type": "deep"},
        {"title": "Draft and refine project documentation",           "duration_mins": 40, "energy_type": "light"},
        {"title": "Build and test core feature or component",         "duration_mins": 55, "energy_type": "deep"},
        {"title": "Review feedback and iterate on output",            "duration_mins": 35, "energy_type": "light"},
        {"title": "Research competitive landscape or best practices", "duration_mins": 30, "energy_type": "passive"},
        {"title": "Create portfolio piece or presentation",           "duration_mins": 50, "energy_type": "deep"},
        {"title": "Send networking outreach and follow-ups",          "duration_mins": 25, "energy_type": "light"},
        {"title": "Code review or quality audit session",             "duration_mins": 40, "energy_type": "deep"},
        {"title": "Plan next sprint or work cycle",                   "duration_mins": 30, "energy_type": "light"},
        {"title": "Polish and finalise deliverable",                  "duration_mins": 55, "energy_type": "deep"},
    ],
    "health": [
        {"title": "Morning mobility and warm-up routine",             "duration_mins": 25, "energy_type": "light"},
        {"title": "Cardio endurance session",                         "duration_mins": 40, "energy_type": "deep"},
        {"title": "Strength training workout",                        "duration_mins": 45, "energy_type": "deep"},
        {"title": "Recovery stretch and foam roll",                   "duration_mins": 25, "energy_type": "passive"},
        {"title": "Meal prep and nutrition planning",                 "duration_mins": 35, "energy_type": "light"},
        {"title": "HIIT or interval training session",                "duration_mins": 30, "energy_type": "deep"},
        {"title": "Mindfulness meditation and breathing work",        "duration_mins": 25, "energy_type": "passive"},
        {"title": "Progress assessment and metrics logging",          "duration_mins": 25, "energy_type": "light"},
    ],
    "personal": [
        {"title": "Journal and reflect on progress",                  "duration_mins": 25, "energy_type": "passive"},
        {"title": "Deep work on personal project milestone",          "duration_mins": 50, "energy_type": "deep"},
        {"title": "Learn new skill or technique",                     "duration_mins": 40, "energy_type": "deep"},
        {"title": "Review and update personal plan",                  "duration_mins": 25, "energy_type": "light"},
        {"title": "Reach out and build meaningful connections",       "duration_mins": 30, "energy_type": "light"},
        {"title": "Creative exploration session",                     "duration_mins": 45, "energy_type": "passive"},
        {"title": "Audit progress and adjust strategy",               "duration_mins": 30, "energy_type": "light"},
        {"title": "Complete high-priority personal task",             "duration_mins": 55, "energy_type": "deep"},
    ],
}

_PHASE_LABELS = {
    "study": [
        "Set up environment, research resources, and map skills",
        "Master foundational concepts and core theory",
        "Deepen understanding through practice and exercises",
        "Apply knowledge in real projects and advanced material",
        "Review, refine, and demonstrate mastery",
    ],
    "work": [
        "Define scope, research requirements, and plan execution",
        "Build core architecture and foundational components",
        "Implement main features and primary functionality",
        "Test, iterate, and collect feedback",
        "Polish, document, and deliver",
    ],
    "health": [
        "Assess baseline, set targets, and design routine",
        "Build consistency with foundational training",
        "Increase intensity and track measurable progress",
        "Push performance peaks and optimise recovery",
        "Sustain results and plan next growth cycle",
    ],
    "personal": [
        "Research, plan, and define clear objectives",
        "Start execution with consistent daily actions",
        "Build momentum and tackle obstacles",
        "Refine approach based on results",
        "Complete, review, and celebrate progress",
    ],
}

_FOCUS_LABELS = [
    "Skills & Research",
    "Core Development",
    "Practice & Application",
    "Integration & Depth",
    "Polish & Delivery",
]

_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]


def _phase_idx(pct: float) -> int:
    if pct <= 0.15: return 0
    if pct <= 0.40: return 1
    if pct <= 0.70: return 2
    if pct <= 0.90: return 3
    return 4


# ── Core decomposition ────────────────────────────────────────────────────────

def decompose(user_id: int, payload: dict, db: Optional[Database] = None) -> dict:
    goal      = payload.get("goal", "").strip()
    deadline  = payload.get("deadline", "")
    today_str = payload.get("today") or datetime.utcnow().strftime("%Y-%m-%d")
    weeks_available = payload.get("weeks_available")
    manual_behavior = payload.get("user_behavior") or {}

    today_date    = datetime.strptime(today_str, "%Y-%m-%d")
    deadline_date = datetime.strptime(deadline, "%Y-%m-%d")
    total_days    = (deadline_date - today_date).days
    total_weeks   = max(1, (total_days + 6) // 7)
    weeks_avail   = min(int(weeks_available), total_weeks) if weeks_available else total_weeks

    # ── Pull real behavior from DB ────────────────────────────────────────────
    behavior_hints   = {}
    has_behavior_data = False
    try:
        behavior_hints    = get_behavior_hints(user_id, db)
        has_behavior_data = bool(behavior_hints.get("category_scores"))
    except Exception:
        pass  # No history yet — fall back to defaults

    period_scores      = behavior_hints.get("period_scores", {})
    category_scores    = behavior_hints.get("category_scores", {})
    productive_periods = behavior_hints.get("productive_periods", [])

    # ── Merge manual overrides with DB-derived signals ─────────────────────────
    manual_avoid  = {s.lower() for s in manual_behavior.get("avoid_categories", [])}
    manual_strong = {s.lower() for s in manual_behavior.get("strong_categories", [])}

    # Categories where DB score < 40 → treat as avoided
    db_avoided = {cat for cat, score in category_scores.items() if score < 40}
    # Categories where DB score >= 65 → treat as strong
    db_strong  = {cat for cat, score in category_scores.items() if score >= 65}

    all_avoided = manual_avoid | db_avoided
    all_strong  = manual_strong | db_strong

    # ── Choose effective category ─────────────────────────────────────────────
    raw_cat = _infer_category(goal)
    if not _is_avoided(raw_cat, all_avoided):
        effective_cat = raw_cat
    else:
        effective_cat = next(
            (c for c in ["study", "work", "personal", "health"]
             if not _is_avoided(c, all_avoided)),
            raw_cat,
        )

    # ── Is this category strong for the user? ─────────────────────────────────
    cat_aliases = _CATEGORY_ALIASES.get(effective_cat, [effective_cat])
    is_strong = (
        not all_strong or
        any(any(a in s or s in a for a in cat_aliases) for s in all_strong)
    )

    # ── Behavior-aware day assignment ─────────────────────────────────────────
    # Morning score ≥ 70 → deep work early in week; otherwise spread or shift
    morning_score = period_scores.get("morning", 50)
    if morning_score >= 70:
        deep_days = {"Mon", "Tue", "Wed"}
    elif morning_score >= 50:
        deep_days = {"Mon", "Wed", "Fri"}
    else:
        deep_days = {"Tue", "Thu"}  # user performs better later

    def build_daily_tasks(week_num: int, is_first: bool) -> list:
        task_count = 4 if week_num % 2 == 0 else 3
        days = _WEEKDAYS[:task_count]
        pool = _WEEK1_TASKS[effective_cat] if is_first else _TASK_TEMPLATES[effective_cat]
        offset = 0 if is_first else int(
            ((week_num - 2) / max(1, weeks_avail - 1)) * len(pool)
        )
        result = []
        for i, day in enumerate(days):
            tpl    = pool[(offset + i) % len(pool)]
            energy = tpl["energy_type"]
            # Downgrade "deep" if the user isn't strong in this category
            # or if this day isn't in their productive window
            if energy == "deep" and (not is_strong or day not in deep_days):
                energy = "light"
            result.append({
                "title":         tpl["title"],
                "category":      effective_cat,
                "duration_mins": tpl["duration_mins"],
                "energy_type":   energy,
                "day_of_week":   day,
            })
        return result

    # ── Assemble weeks ────────────────────────────────────────────────────────
    goal_words = goal.split()
    summary    = goal if len(goal_words) <= 15 else " ".join(goal_words[:15])

    weeks = []
    for idx in range(weeks_avail):
        week_num = idx + 1
        pct      = week_num / weeks_avail
        pi       = _phase_idx(pct)
        is_first = week_num == 1
        weeks.append({
            "week":        week_num,
            "milestone":   _PHASE_LABELS[effective_cat][pi],
            "focus":       _FOCUS_LABELS[0] if is_first else _FOCUS_LABELS[pi],
            "daily_tasks": build_daily_tasks(week_num, is_first),
        })

    return {
        "goal_id": str(uuid.uuid4()),
        "summary": summary,
        "skills":  _extract_skills(goal),
        "weeks":   weeks,
        "behavior_context": {
            "productive_periods":  productive_periods,
            "strong_categories":   sorted(all_strong),
            "avoided_categories":  sorted(all_avoided),
            "category_scores":     category_scores,
            "has_behavior_data":   has_behavior_data,
        },
    }


# ── CLI entry ─────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: run_goal_decomposer.py <user_id> '<json>'}"),
              file=sys.stderr)
        sys.exit(1)

    user_id = int(sys.argv[1])
    try:
        payload = json.loads(sys.argv[2])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON payload: {e}"}), file=sys.stderr)
        sys.exit(1)

    try:
        result = decompose(user_id, payload)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
