#!/usr/bin/env python3
"""
CLI entry point: Behavioral Analysis Engine.
Called by the Node.js backend via child_process.spawn.

Usage:
    python run_analyzer.py <user_id>

Prints a JSON object to stdout matching the Gemini analyzeUserBehavior shape.
"""

import sys
import json
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_scheduler.behavior_engine import analyze_user_behavior
from ai_scheduler.database import Database, DatabaseError


def json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "user_id argument required"}), file=sys.stderr)
        sys.exit(1)

    try:
        user_id = int(sys.argv[1])
    except ValueError:
        print(json.dumps({"error": "user_id must be an integer"}), file=sys.stderr)
        sys.exit(1)

    try:
        result = analyze_user_behavior(user_id)
        print(json.dumps(result, default=json_serial))
    except DatabaseError as e:
        print(json.dumps({"error": f"Database error: {e}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
