#!/usr/bin/env python3
"""まだ書いていない tRPC の手続きを、前の日に呼ばせていないかを見る。

読者は各日の Step 0 でルーターを1から書く。だから「その日までに書いた手続き」しか
呼べない。tRPC は手続きを型で解決するので、まだ無いものを呼ぶ行を写した瞬間に
型エラーになる。実測では day11 が `utils.project.getById.invalidate(...)` を
呼んでおり、`getById` を書くのは day12 の Step 0 だった。

`auth` ルーターだけは例外にする。scaffold が最初から配布しており
(scaffold-from-scratch.sh の「auth.ts だけを配布する」)、day07 は配布済みのものを
自分で書き直す回になっている。

散文は対象外にする。「Day 12 で足します」のように、まだ無いことを説明している
文まで止めてしまうため。
"""

import re
import sys
from pathlib import Path

# `getAll: protectedProcedure` のように、ルーターへ手続きを定義している行。
DEFINE = re.compile(
    r"^\s*(\w+):\s*(?:protected|public|admin|member)\w*Procedure", re.M
)
# `api.project.getAll.useQuery` / `utils.project.getById.invalidate` の呼び出し。
CALL = re.compile(r"(?:api|utils)\.(\w+)\.(\w+)\.")
FENCE = re.compile(r"^\s*(?:`{3,}|~{3,})")
# scaffold が最初から配布するルーター。読者が書く前から呼んでよい。
SHIPPED = {"auth"}


def day_number(name: str) -> int:
    m = re.match(r"day(\d{2})", name)
    return int(m.group(1)) if m else 99


def collect_definitions(paths: list[Path]) -> dict[str, int]:
    """手続き名 -> 最初に定義された日。"""
    defs: dict[str, int] = {}
    for path in sorted(paths, key=lambda p: day_number(p.name)):
        day = day_number(path.name)
        for m in DEFINE.finditer(path.read_text(encoding="utf-8")):
            defs.setdefault(m.group(1), day)
    return defs


def find_early_calls(path: Path, defs: dict[str, int]) -> list[tuple[int, str, int]]:
    """(行番号, router.procedure, 定義される日) を返す。"""
    day = day_number(path.name)
    hits: list[tuple[int, str, int]] = []
    inside = False
    for i, line in enumerate(path.read_text(encoding="utf-8").split("\n"), start=1):
        if FENCE.match(line):
            inside = not inside
            continue
        if not inside:
            continue
        for m in CALL.finditer(line):
            router, proc = m.group(1), m.group(2)
            if router in SHIPPED:
                continue
            defined = defs.get(proc)
            if defined is not None and day < defined:
                hits.append((i, f"{router}.{proc}", defined))
    return hits


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]
    targets: list[Path] = []
    for a in args:
        p = Path(a)
        if p.is_dir():
            targets.extend(sorted(p.glob("day[0-9][0-9]_*.md")))
        elif p.is_file():
            targets.append(p)
        else:
            print(f"❌ 見つかりません: {a}", file=sys.stderr)
            return 2

    if not targets:
        print("❌ 対象ファイルがありません", file=sys.stderr)
        return 2

    defs = collect_definitions(targets)
    findings: list[tuple[str, int, str, int]] = []
    for path in targets:
        for line, name, defined in find_early_calls(path, defs):
            findings.append((path.name, line, name, defined))

    if findings:
        print(f"❌ まだ書いていない手続きを呼んでいる {len(findings)} 件")
        for name, line, proc, defined in findings:
            print(f"  {name}:{line} {proc}（定義は Day {defined:02d}）")
        print("  その日までに書いた手続きだけを使ってください。")
        return 1

    print(f"✅ 手続きを使う順番 OK（{len(targets)} ファイル / 手続き {len(defs)} 個）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
