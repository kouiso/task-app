#!/usr/bin/env python3
"""コードブロックの書き込み先が、そのブロックだけを見て分かるかを見る。

読者は1日分を頭から順に読むとは限らない。目次のリンクから飛んでくるし、詰まった日だけを
後から開き直す。そのとき `// filepath: 続き` とだけ書いてあると、何の続きなのか分からない。
上へ遡って最初に見つかるファイル名が正解とも限らず、実測では156行上の読み比べ用コードを
指しているように読める箇所があった。

判定は「`// filepath:` の値が指示語だけで終わっていないか」に絞る。実ファイル名が入って
いれば、続きであることを添えていても通す。散文側の「上のコード」「さきほど」は語の形が
一定せず機械では判定できないので、この検査の対象にしない。
"""

import re
import sys
from pathlib import Path

FENCE = re.compile(r"^\s*(`{3,}|~{3,})")
FILEPATH = re.compile(r"^\s*(?://|#)\s*filepath:\s*(.+?)\s*$")
# 「続き」「同上」だけで、どのファイルなのかを名乗っていない値。
# 「読み比べ用サンプル」は実ファイルを持たないと明言しているので通す。
VAGUE = re.compile(r"^(続き|同上|前の続き|上記の続き|同じファイル)[（(]?[^）)]*[）)]?$")
# 同じ注記が2回以上ぶら下がった値。実測で、上の行を書き換えながら下の行を作る処理が
# 書き換え済みの値を拾い直し、`（同じファイルの続き）` が最大6回積み上がっていた。
# 指示語ではないので VAGUE では捕まらず、読者が写経する欄にそのまま残る。
REPEATED = re.compile(r"([（(][^）)]+[）)])\1")


def find(text: str) -> list[tuple[int, str]]:
    """(行番号, 値) を返す。行番号は1始まり。"""
    hits: list[tuple[int, str]] = []
    fence = None
    for i, line in enumerate(text.split("\n"), start=1):
        m = FENCE.match(line)
        if m:
            mark = m.group(1)
            if fence is None:
                fence = mark
            elif line.strip().startswith(fence):
                fence = None
            continue
        if fence is None:
            continue
        fp = FILEPATH.match(line)
        if fp and (VAGUE.match(fp.group(1)) or REPEATED.search(fp.group(1))):
            hits.append((i, fp.group(1)))
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

    findings: list[tuple[str, int, str]] = []
    for path in targets:
        for line, value in find(path.read_text(encoding="utf-8")):
            findings.append((path.name, line, value))

    if findings:
        print(f"❌ 書き込み先が分からないコードブロック {len(findings)} 件")
        for name, line, value in findings:
            print(f"  {name}:{line} filepath: {value}")
        print("  実ファイル名を書くか、実ファイルを持たない旨を書いてください。")
        return 1

    print(f"✅ コードブロックの書き込み先 OK（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
