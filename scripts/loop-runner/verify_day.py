#!/usr/bin/env python3
"""
Day完了後の検証。

Usage: python3 verify_day.py <day_number: 01-30> <target_app_dir> [evidence_dir]
"""

import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence
import json


REPO_DIR = Path(__file__).resolve().parents[2]
DEFAULT_EVIDENCE_ROOT = REPO_DIR / ".planning" / "loop-3"


def tail_text(value: str, limit: int = 3000) -> str:
    return value[-limit:] if len(value) > limit else value


def run_check(
    name: str,
    command: Sequence[str],
    target_dir: Path,
    evidence_dir: Path,
    timeout_seconds: int,
) -> tuple[bool, int, Path]:
    log_path = evidence_dir / f"{name}.log"
    print(f"[verify_day] {name}: {' '.join(command)}")

    try:
        result = subprocess.run(
            list(command),
            cwd=target_dir,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout if isinstance(exc.stdout, str) else ""
        stderr = exc.stderr if isinstance(exc.stderr, str) else ""
        log_path.write_text(
            "\n".join(
                [
                    f"$ {' '.join(command)}",
                    f"cwd: {target_dir}",
                    f"exit: TIMEOUT after {timeout_seconds}s",
                    "",
                    "--- stdout ---",
                    stdout,
                    "--- stderr ---",
                    stderr,
                ]
            ),
            encoding="utf-8",
        )
        print(f"  ❌ FAIL — {name} timed out after {timeout_seconds}s")
        return False, 124, log_path
    log_path.write_text(
        "\n".join(
            [
                f"$ {' '.join(command)}",
                f"cwd: {target_dir}",
                f"exit: {result.returncode}",
                "",
                "--- stdout ---",
                result.stdout,
                "--- stderr ---",
                result.stderr,
            ]
        ),
        encoding="utf-8",
    )

    if result.returncode == 0:
        print(f"  ✅ PASS — {name}")
        return True, result.returncode, log_path

    print(f"  ❌ FAIL — {name} failed (exit {result.returncode})")
    print("--- stdout ---")
    print(tail_text(result.stdout))
    print("--- stderr ---")
    print(tail_text(result.stderr))
    return False, result.returncode, log_path


def verify_day(day_num: str, target_dir: Path, evidence_dir: Path) -> bool:
    evidence_dir.mkdir(parents=True, exist_ok=True)
    print(f"[verify_day] Day {day_num} — evidence: {evidence_dir}")

    checks = [
        ("build", ["npm", "run", "build"], 180),
        ("test", ["npm", "test", "--", "--passWithNoTests"], 180),
        (
            "playwright-screenshots",
            [
                "npx",
                "playwright",
                "test",
                "e2e/screenshots.spec.ts",
                "--project=chromium",
            ],
            240,
        ),
    ]
    results: list[dict[str, object]] = []

    for name, command, timeout_seconds in checks:
        ok, exit_code, log_path = run_check(
            name=name,
            command=command,
            target_dir=target_dir,
            evidence_dir=evidence_dir,
            timeout_seconds=timeout_seconds,
        )
        results.append(
            {
                "name": name,
                "command": command,
                "exit_code": exit_code,
                "log": str(log_path),
                "status": "PASS" if ok else "FAIL",
            }
        )
        if not ok:
            break

    summary = {
        "day": day_num,
        "target_dir": str(target_dir),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "PASS" if all(item["status"] == "PASS" for item in results) else "FAIL",
        "checks": results,
    }
    (evidence_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    return summary["status"] == "PASS"


def main():
    if len(sys.argv) not in {3, 4}:
        print("Usage: verify_day.py <day_number> <target_app_dir> [evidence_dir]")
        sys.exit(1)

    day_num = sys.argv[1].zfill(2)
    target_dir = Path(sys.argv[2])
    evidence_dir = (
        Path(sys.argv[3])
        if len(sys.argv) == 4
        else DEFAULT_EVIDENCE_ROOT / f"day-{day_num}"
    )

    if not target_dir.exists():
        print(f"ERROR: {target_dir} not found")
        sys.exit(1)

    ok = verify_day(day_num, target_dir, evidence_dir)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
