#!/usr/bin/env python3
"""procedure×day 依存表を生成する(Phase A-0)。

入力:
  - scripts/_server-routers/*.ts (配布中のルーター実装。D1リファクタ後は
    src/server/api/routers/<router>/<procedure>.ts を読む形に切り替える)
  - material/30days-curriculum/day*.md (`api.<router>.<procedure>` 呼び出し箇所を
    最初に登場したdayとして記録)
  - src/**/__test__/**, src/**/*.test.ts (来歴未定義のテスト21本の棚卸し対象)

出力: material/30days-curriculum/_meta/procedure-day-map.json

exitゲート4つ(すべてbool判定、非ゼロexitで失敗を明示):
  G-orphan   孤児ファイル(教材のどのdayからも参照されないprocedure)ゼロ
  G-testchan テストファイル全件がchannel(写経|harness)に割当済み
  G-budget   Σ(全day追加行数) <= 執筆day数 * 150
  G-perday   max(単一dayの追加行数) <= 150
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ROUTERS_DIR = REPO_ROOT / "scripts" / "_server-routers"
CURRICULUM_DIR = REPO_ROOT / "material" / "30days-curriculum"
SRC_DIR = REPO_ROOT / "src"
OUT_DIR = CURRICULUM_DIR / "_meta"
OUT_PATH = OUT_DIR / "procedure-day-map.json"

PROCEDURE_RE = re.compile(
    r"^\s*([a-zA-Z][a-zA-Z0-9]*)\s*:\s*(publicProcedure|protectedProcedure)", re.MULTILINE
)
API_CALL_RE = re.compile(r"api\.([a-zA-Z][a-zA-Z0-9]*)\.([a-zA-Z][a-zA-Z0-9]*)")
DAY_FILE_RE = re.compile(r"^day(\d+)_")


def day_number(path: Path) -> int | None:
    m = DAY_FILE_RE.match(path.name)
    return int(m.group(1)) if m else None


def extract_procedures(router_file: Path) -> dict[str, int]:
    text = router_file.read_text(encoding="utf-8")
    lines = text.splitlines()
    procs: dict[str, int] = {}
    for i, line in enumerate(lines, start=1):
        m = PROCEDURE_RE.match(line)
        if m:
            procs[m.group(1)] = i
    return procs


def scan_curriculum_first_use() -> dict[tuple[str, str], int]:
    first_use: dict[tuple[str, str], int] = {}
    for md in sorted(CURRICULUM_DIR.glob("day*.md")):
        d = day_number(md)
        if d is None:
            continue
        text = md.read_text(encoding="utf-8", errors="ignore")
        for m in API_CALL_RE.finditer(text):
            key = (m.group(1), m.group(2))
            if key not in first_use or d < first_use[key]:
                first_use[key] = d
    return first_use


def scan_scaffold_components_first_use() -> dict[tuple[str, str], list[str]]:
    """scaffold配布物 + 実アプリ本体(src/)の両方で api.* 呼び出しを検索する。

    Codexレビューで判明: src/ を見ていなかったため project.updateMemberRole の
    実使用(src/app/project/page.tsx)を見落とし、孤児と誤判定していた。
    """
    refs: dict[tuple[str, str], list[str]] = {}
    bases = [
        REPO_ROOT / "scripts" / "_app-components",
        REPO_ROOT / "scripts" / "_app-base",
        REPO_ROOT / "scripts" / "_app-api-trpc",
        REPO_ROOT / "src",
    ]
    for base in bases:
        if not base.exists():
            continue
        for f in list(base.rglob("*.tsx")) + list(base.rglob("*.ts")):
            text = f.read_text(encoding="utf-8", errors="ignore")
            for m in API_CALL_RE.finditer(text):
                key = (m.group(1), m.group(2))
                refs.setdefault(key, []).append(str(f.relative_to(REPO_ROOT)))
    return refs


def scan_test_files() -> list[str]:
    if not SRC_DIR.exists():
        return []
    tests = list(SRC_DIR.rglob("*.test.ts")) + list(SRC_DIR.rglob("*.test.tsx"))
    tests += [p for p in SRC_DIR.rglob("__test__/**/*") if p.is_file() and p.suffix in (".ts", ".tsx")]
    seen = sorted({str(p.relative_to(REPO_ROOT)) for p in tests})
    return seen


def main() -> int:
    procedure_map: dict[str, dict] = {}
    first_use = scan_curriculum_first_use()
    component_refs = scan_scaffold_components_first_use()

    if not ROUTERS_DIR.exists():
        print(f"[FATAL] router source dir not found: {ROUTERS_DIR}", file=sys.stderr)
        return 2

    for router_file in sorted(ROUTERS_DIR.glob("*.ts")):
        router_name = router_file.stem
        if router_name.startswith("_"):
            continue
        procs = extract_procedures(router_file)
        for proc_name, line_no in procs.items():
            key = f"{router_name}.{proc_name}"
            first_day = first_use.get((router_name, proc_name))
            comp_ref = component_refs.get((router_name, proc_name), [])
            procedure_map[key] = {
                "router": router_name,
                "procedure": proc_name,
                "defined_at": f"scripts/_server-routers/{router_file.name}:{line_no}",
                "first_used_in_curriculum_day": first_day,
                "referenced_by_scaffold_components": comp_ref,
                "orphan": first_day is None and not comp_ref,
            }

    tests = scan_test_files()
    test_channel: dict[str, str] = {t: "UNASSIGNED" for t in tests}

    orphans = [k for k, v in procedure_map.items() if v["orphan"]]

    result = {
        "generated_by": "script/gen_procedure_map.py",
        "procedures": procedure_map,
        "test_files": test_channel,
        "gates": {
            "G-orphan": {
                "pass": len(orphans) == 0,
                "orphan_procedures": orphans,
            },
            "G-testchan": {
                "pass": all(v != "UNASSIGNED" for v in test_channel.values()) if test_channel else True,
                "unassigned_count": sum(1 for v in test_channel.values() if v == "UNASSIGNED"),
                "total_count": len(test_channel),
            },
            "G-budget": {
                "pass": None,
                "note": "requires per-day added-line counts, filled after Phase B day-level ledger exists",
            },
            "G-perday": {
                "pass": None,
                "note": "requires per-day added-line counts, filled after Phase B day-level ledger exists",
            },
        },
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"procedures: {len(procedure_map)} (orphans: {len(orphans)})")
    print(f"test files: {len(tests)} (all UNASSIGNED — Phase A-0 D8 channel assignment pending)")
    print(f"written: {OUT_PATH.relative_to(REPO_ROOT)}")

    hard_fail = len(orphans) > 0
    return 1 if hard_fail else 0


if __name__ == "__main__":
    sys.exit(main())
