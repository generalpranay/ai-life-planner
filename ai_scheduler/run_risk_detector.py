#!/usr/bin/env python3
"""
CLI entry point: Risk Detection Engine.
Called by the Node.js backend via child_process.spawn.

Usage:
    python run_risk_detector.py '<json-task-array>'

Prints { "flags": [...] } to stdout.
"""

import sys
import json
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_scheduler.risk_engine import detect_risks


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "task JSON argument required"}), file=sys.stderr)
        sys.exit(1)

    try:
        tasks = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}), file=sys.stderr)
        sys.exit(1)

    if not isinstance(tasks, list):
        print(json.dumps({"error": "Expected a JSON array of tasks"}), file=sys.stderr)
        sys.exit(1)

    result = detect_risks(tasks)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
