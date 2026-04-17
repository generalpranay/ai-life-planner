#!/usr/bin/env python3
"""
CLI entry point: Natural Language Task Parser.
Called by the Node.js backend via child_process.spawn.

Usage:
    python run_parser.py --text "Study for exam tomorrow at 6pm for 2 hours"

Prints a JSON object to stdout matching the Gemini parseNaturalTask shape.
"""

import sys
import json
import os
import argparse
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_scheduler.task_parser import parse_task


def main():
    parser = argparse.ArgumentParser(description="Parse a natural-language task description")
    parser.add_argument("--text", type=str, required=True, help="Task text to parse")
    args = parser.parse_args()

    if not args.text.strip():
        print(json.dumps({"error": "text cannot be empty"}), file=sys.stderr)
        sys.exit(1)

    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        result = parse_task(args.text, today=today)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
