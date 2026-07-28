#!/usr/bin/env python3
"""販売ZIPに入らないものと「見比べて確認してください」と書いていないかを見る。

30周目に見つかった最も重い1件。8箇所が「このリポジトリの `src/...` と見比べて
確認してください」と書いていた。`scripts/build-zip.sh` は完成アプリの `src/`
`prisma/` `package.json` を入れない。買った人は30日ためた自分のファイルを照合できない。
同じ教材の day20 では著者が正しく書いており、言うことが割れていた。

判定は「照合を指示する語」と「ZIP に入らない置き場」の同居に絞る。`src/` を挙げる
だけの文は対象にしない。`src/app/dashboard` フォルダを作る指示や、
`src/app/error.tsx` を作る手順表は正しい記述で、現物に4件ある。照合先として
挙げているかどうかが分かれ目になる。

ZIP に何が入るかは `sale_package` が `build-zip.sh` から読む。梱包内容を変えたら
この判定も一緒に動く。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from markdown_scan import iter_prose
from sale_package import scaffold_src_paths, zip_top_level

# 「手元の物と突き合わせろ」と読者に言う語。
COMPARE = re.compile(r"見比べ|見くらべ|照合|突き合わせ|突合|比較して(?:確認|見)|と比べて(?:確認|み)")
# 文中に現れる置き場。バッククォート内でも地の文でも拾いたいので、
# インラインコードは潰さずに走査する。`src/` だけの言及は置き場を指さないので取らない。
LOCATION = re.compile(
    r"(?<![\w/.-])((?:src|prisma)/[\w.\[\]-]+(?:/[\w.\[\]-]+)*|package\.json)"
)
# 「ZIP には入っていません」と断ってある文は、読者を存在しない物へ送らない。
# 30周目の修正はこの断りを添える形で入れたので、断りごと赤くしては直した意味が消える。
DISCLAIMED = re.compile(r"ZIP\s*(?:に|には)[^。]{0,40}(?:入って?い?ません|入りません|含まれ(?:て?い?)?ません)")


def not_in_zip(location: str) -> bool:
    """その置き場が販売ZIPに入らないなら True。

    `src/` 配下でも、scaffold が最初から配るファイルは読者の手元に在る。
    `src/server/api/routers/_helpers/select.ts` がその例で、照合先として正しい。
    """
    if location in zip_top_level() or location in scaffold_src_paths():
        return False
    return location.startswith(("src/", "prisma/")) or location == "package.json"


def find_refs(paths: list[Path]) -> list[tuple[str, int, str, str]]:
    """(ファイル名, 行番号, 置き場, 該当行) を返す。"""
    hits: list[tuple[str, int, str, str]] = []
    for path in paths:
        for lineno, line in iter_prose(path.read_text(encoding="utf-8")):
            if not COMPARE.search(line) or DISCLAIMED.search(line):
                continue
            seen: set[str] = set()
            for m in LOCATION.finditer(line):
                loc = m.group(1)
                if loc in seen or not not_in_zip(loc):
                    continue
                seen.add(loc)
                hits.append((path.name, lineno, loc, line.strip()))
    return hits


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]
    targets: list[Path] = []
    for a in args:
        p = Path(a)
        if p.is_dir():
            targets.extend(sorted(p.glob("*.md")))
        elif p.is_file():
            targets.append(p)
        else:
            print(f"❌ 見つかりません: {a}", file=sys.stderr)
            return 2
    if not targets:
        print("❌ 対象ファイルがありません", file=sys.stderr)
        return 2

    findings = find_refs(targets)
    if findings:
        print(f"❌ 販売ZIPに無いものとの照合を指示している {len(findings)} 件")
        for name, lineno, loc, line in findings:
            print(f"  {name}:{lineno} [{loc}] {line[:70]}")
        print("  買った人の手元にその照合先はありません。ZIP に入らない旨を添えてください。")
        return 1

    print(f"✅ 照合先 OK（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
