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

from markdown_scan import fence_states

# `getAll: protectedProcedure` のように、ルーターへ手続きを定義している行。
DEFINE = re.compile(r"^\s*(\w+):\s*(?:protected|public|admin|member)\w*Procedure")
# `// filepath: src/server/api/routers/project.ts（続き）` から、そのブロックが
# どのルーターを書いているのかを取る。手続き名だけでは、どのルーターに生えたのかが
# 分からない。実例では project.getById と task.getById が別の日に定義されており、
# 名前だけで索引すると day12 の `api.task.getById` が通ってしまっていた。
ROUTER_FILE = re.compile(r"^\s*(?://|\{/\*)\s*filepath:\s*src/server/api/routers/(\w+)\.ts")
# `api.project.getAll.useQuery` / `utils.project.getById.invalidate` の呼び出し。
CALL = re.compile(r"(?:api|utils)\.(\w+)\.(\w+)\.")
# scaffold が最初から配布するルーター。読者が書く前から呼んでよい。
SHIPPED = {"auth"}


def day_number(name: str) -> int:
    m = re.match(r"day(\d{2})", name)
    return int(m.group(1)) if m else 99


def collect_definitions(paths: list[Path]) -> dict[tuple[str, str], int]:
    """(ルーター名, 手続き名) -> 最初に定義された日。

    どのルーターを書いているブロックなのかは `// filepath:` の値から取る。
    filepath を持たないブロックの定義は、どのルーターのものか決められないので
    索引しない。
    """
    defs: dict[tuple[str, str], int] = {}
    for path in sorted(paths, key=lambda p: day_number(p.name)):
        day = day_number(path.name)
        router: str | None = None
        for _, line, state, _ in fence_states(path.read_text(encoding="utf-8")):
            if state == "open":
                router = None
                continue
            if state != "inside":
                continue
            found = ROUTER_FILE.match(line)
            if found:
                router = found.group(1)
                continue
            if router is None:
                continue
            m = DEFINE.match(line)
            if m:
                defs.setdefault((router, m.group(1)), day)
    return defs


def find_early_calls(
    path: Path, defs: dict[tuple[str, str], int]
) -> list[tuple[int, str, int | None]]:
    """(行番号, router.procedure, 定義される日) を返す。

    定義がどこにも無い呼び出しは日を None にして返す。以前は lookup が None の
    呼び出しを黙って通していたため、綴りを間違えた手続き名が素通りしていた。
    """
    day = day_number(path.name)
    hits: list[tuple[int, str, int | None]] = []
    for i, line, state, _ in fence_states(path.read_text(encoding="utf-8")):
        if state != "inside":
            continue
        for m in CALL.finditer(line):
            router, proc = m.group(1), m.group(2)
            if router in SHIPPED:
                continue
            defined = defs.get((router, proc))
            if defined is None:
                hits.append((i, f"{router}.{proc}", None))
            elif day < defined:
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
    early: list[tuple[str, int, str, int]] = []
    unknown: list[tuple[str, int, str]] = []
    for path in targets:
        for line, name, defined in find_early_calls(path, defs):
            if defined is None:
                unknown.append((path.name, line, name))
            else:
                early.append((path.name, line, name, defined))

    status = 0
    if early:
        print(f"❌ まだ書いていない手続きを呼んでいる {len(early)} 件")
        for name, line, proc, defined in early:
            print(f"  {name}:{line} {proc}（定義は Day {defined:02d}）")
        print("  その日までに書いた手続きだけを使ってください。")
        status = 1
    if unknown:
        print(f"❌ どの日にも定義されていない手続きを呼んでいる {len(unknown)} 件")
        for name, line, proc in unknown:
            print(f"  {name}:{line} {proc}")
        print("  ルーター名と手続き名の綴りを確かめてください。")
        status = 1
    if status:
        return status

    print(f"✅ 手続きを使う順番 OK（{len(targets)} ファイル / 手続き {len(defs)} 個）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
