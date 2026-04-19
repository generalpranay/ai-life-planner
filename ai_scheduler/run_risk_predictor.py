#!/usr/bin/env python3
"""
CLI entry point: DB-aware Risk Predictor.
Called by the Node.js backend via child_process.spawn.

Usage:
    python run_risk_predictor.py <user_id>

Prints { flags, totalMins, flagCount } to stdout as JSON.
"""

import sys
import json
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_scheduler.risk_predictor import predict_day_risks
from ai_scheduler.database import DatabaseError


def _serial(obj):
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
        result = predict_day_risks(user_id)
        print(json.dumps(result, default=_serial))
    except DatabaseError as e:
        print(json.dumps({"error": f"Database error: {e}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
