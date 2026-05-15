#!/usr/bin/env python3
"""
Day完了後のビルド検証（Stage A: npm run build のみ）。

Usage: python3 verify_day.py <day_number: 01-30> <target_app_dir>
"""

import sys
import subprocess
from pathlib import Path


def verify_day(day_num: str, target_dir: Path) -> bool:
    print(f"[verify_day] Day {day_num} — npm run build")

    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=target_dir,
        capture_output=True,
        text=True,
        timeout=180,
    )

    if result.returncode == 0:
        print(f"  ✅ PASS — Day {day_num} build succeeded")
        return True

    print(f"  ❌ FAIL — Day {day_num} build failed (exit {result.returncode})")
    print("--- stdout ---")
    print(result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout)
    print("--- stderr ---")
    print(result.stderr[-3000:] if len(result.stderr) > 3000 else result.stderr)
    return False


def main():
    if len(sys.argv) != 3:
        print("Usage: verify_day.py <day_number> <target_app_dir>")
        sys.exit(1)

    day_num = sys.argv[1].zfill(2)
    target_dir = Path(sys.argv[2])

    if not target_dir.exists():
        print(f"ERROR: {target_dir} not found")
        sys.exit(1)

    ok = verify_day(day_num, target_dir)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
