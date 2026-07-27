#!/usr/bin/env python3
"""実装ステップ一覧の所要時間の合計が、本文の合計時間と合っているかを見る。

読者はこの数字を見て、その日に取れる時間と相談してから机に向かう。実測で day29 は
表の合計が76分なのに本文が60分と書いてあり、16分ぶん短く見えていた。1時間で終わる
つもりの読者が26分超過する。数字は書き足しや削除のたびにずれるので、人の目では守れない。

表が無いdayは対象外にする。day01 から day04 は手順を文章で進めており、
所要時間の表そのものを持たない。
"""

import re
import sys
from pathlib import Path

# 「| Step 3 | 何かする | 7分 |」の形から分だけを取る。
ROW = re.compile(r"^\|\s*(?:Step\s*)?\d+\s*\|[^|]*\|\s*(\d+)\s*分\s*\|", re.M)
# 「**合計時間**: 約60分です。」と「**合計時間**は約56分です。」の両方を拾う。
TOTAL = re.compile(r"\*\*合計時間\*\*\s*(?:[:：]|は)\s*約?\s*(\d+)\s*分")


def check(text: str):
    """(表の合計, 本文の合計, 表の項目数) を返す。片方でも無ければ None。"""
    rows = ROW.findall(text)
    total = TOTAL.search(text)
    if not rows or not total:
        return None
    return sum(int(r) for r in rows), int(total.group(1)), len(rows)


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

    findings = []
    checked = 0
    for path in targets:
        result = check(path.read_text(encoding="utf-8"))
        if result is None:
            continue
        checked += 1
        rows_sum, stated, count = result
        if rows_sum != stated:
            findings.append((path.name, rows_sum, stated, count))

    if findings:
        print(f"❌ 所要時間の合計が合わないファイル {len(findings)} 件（{checked} 件中）")
        for name, rows_sum, stated, count in findings:
            print(f"  {name}: 表の合計 {rows_sum} 分（{count} 項目） / 本文 {stated} 分")
        return 1

    print(f"✅ 所要時間の合計 OK（{checked} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
