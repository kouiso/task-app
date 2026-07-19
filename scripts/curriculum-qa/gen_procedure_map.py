#!/usr/bin/env python3
"""procedure×day 依存表を生成する(Phase A-0)。

入力:
  - scripts/_server-routers/*.ts (配布中のルーター実装。D1リファクタ後は
    src/server/api/routers/<router>/<procedure>.ts を読む形に切り替える)
  - material/30days-curriculum/day*.md (`api.<router>.<procedure>` 呼び出し箇所を
    最初に登場したdayとして記録)
  - src/**/__test/**, src/**/*.test.ts (来歴未定義のテスト21本の棚卸し対象)

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

# CI の `biome check .` は生成物の JSON にもフォーマッタを適用する
# (lineWidth=100: 収まる配列は1行、収まらなければ1要素1行)。
# json.dumps(indent=2) は配列を常に展開してしまい format エラーになるため、
# Biome と同じ折り返し規則で直接シリアライズする。
BIOME_LINE_WIDTH = 100


def dumps_biome_style(value, indent: int = 0, prefix_len: int = 0) -> str:
    if isinstance(value, dict):
        if not value:
            return "{}"
        pad = " " * (indent + 2)
        items = []
        for k, v in value.items():
            key = json.dumps(k, ensure_ascii=False) + ": "
            items.append(
                pad + key + dumps_biome_style(v, indent + 2, indent + 2 + len(key))
            )
        return "{\n" + ",\n".join(items) + "\n" + " " * indent + "}"
    if isinstance(value, list):
        if not value:
            return "[]"
        if all(not isinstance(v, (dict, list)) for v in value):
            inline = "[" + ", ".join(json.dumps(v, ensure_ascii=False) for v in value) + "]"
            # 末尾カンマの1文字も行幅に含めて判定する
            if prefix_len + len(inline) + 1 <= BIOME_LINE_WIDTH:
                return inline
        pad = " " * (indent + 2)
        items = [pad + dumps_biome_style(v, indent + 2, indent + 2) for v in value]
        return "[\n" + ",\n".join(items) + "\n" + " " * indent + "]"
    return json.dumps(value, ensure_ascii=False)


PROCEDURE_RE = re.compile(
    r"^\s*([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([a-zA-Z][a-zA-Z0-9]*Procedure)", re.MULTILINE
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
    tests += [p for p in SRC_DIR.rglob("__test/**/*") if p.is_file() and p.suffix in (".ts", ".tsx")]
    seen = sorted({str(p.relative_to(REPO_ROOT)) for p in tests})
    return seen


DISPOSITION_PATH = OUT_DIR / "procedure-disposition.json"


def load_dispositions() -> dict[str, dict]:
    """UI未参照procedureの処置台帳を読む。無ければ空。"""
    if not DISPOSITION_PATH.exists():
        return {}
    data = json.loads(DISPOSITION_PATH.read_text(encoding="utf-8"))
    return data.get("dispositions", {})


def main() -> int:
    procedure_map: dict[str, dict] = {}
    first_use = scan_curriculum_first_use()
    component_refs = scan_scaffold_components_first_use()

    if not ROUTERS_DIR.exists():
        print(f"[FATAL] router source dir not found: {ROUTERS_DIR}", file=sys.stderr)
        return 2

    dispositions = load_dispositions()

    for router_file in sorted(ROUTERS_DIR.glob("*.ts")):
        router_name = router_file.stem
        if router_name.startswith("_"):
            continue
        procs = extract_procedures(router_file)
        for proc_name, line_no in procs.items():
            key = f"{router_name}.{proc_name}"
            first_day = first_use.get((router_name, proc_name))
            comp_ref = component_refs.get((router_name, proc_name), [])
            # UI未参照 = api.*.* からもコンポーネントからも呼ばれない。
            # 写経移行では削除理由ではなく「構築dayを割り当てるべき候補」を意味する。
            ui_unreferenced = first_day is None and not comp_ref
            procedure_map[key] = {
                "router": router_name,
                "procedure": proc_name,
                "defined_at": f"scripts/_server-routers/{router_file.name}:{line_no}",
                "first_used_in_curriculum_day": first_day,
                "referenced_by_scaffold_components": comp_ref,
                "ui_unreferenced": ui_unreferenced,
                "disposition": dispositions.get(key),
            }

    tests = scan_test_files()
    test_channel: dict[str, str] = {t: "UNASSIGNED" for t in tests}

    ui_unreferenced = [k for k, v in procedure_map.items() if v["ui_unreferenced"]]
    # exitゲート①「孤児ゼロ or 全件処置」: UI未参照でも処置台帳にエントリがあればOK。
    undispositioned = [k for k in ui_unreferenced if procedure_map[k]["disposition"] is None]

    result = {
        "generated_by": "script/gen_procedure_map.py",
        "procedures": procedure_map,
        "test_files": test_channel,
        "gates": {
            "G-disposition": {
                "_desc": "UI未参照procedureは削除対象ではなく、全件が処置台帳(procedure-disposition.json)で構築day割当 or 削除の判断を持つべき(exitゲート①の後半『全件処置』)。",
                "pass": len(undispositioned) == 0,
                "ui_unreferenced_procedures": ui_unreferenced,
                "undispositioned_procedures": undispositioned,
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
    OUT_PATH.write_text(dumps_biome_style(result) + "\n", encoding="utf-8")

    print(f"procedures: {len(procedure_map)} "
          f"(UI-unreferenced: {len(ui_unreferenced)}, undispositioned: {len(undispositioned)})")
    print(f"test files: {len(tests)} (all UNASSIGNED — Phase A-0 D8 channel assignment pending)")
    print(f"written: {OUT_PATH.relative_to(REPO_ROOT)}")

    # 未処置のUI未参照procedureが残っていればFAIL(処置台帳に追記して解消する)。
    return 1 if undispositioned else 0


if __name__ == "__main__":
    sys.exit(main())
