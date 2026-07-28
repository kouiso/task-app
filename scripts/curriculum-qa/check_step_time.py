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

from markdown_scan import strip_fences

# 表を持たない日。手順を文章で進めており、所要時間の表そのものが無い。
NO_TABLE_DAYS = {1, 2, 3, 4}

# 「| Step 3 | 何かする | 7分 |」の形から分だけを取る。
# Step 番号には 2.5 のように途中へ差し込んだものもある。整数決め打ちだと、その行だけ
# 合計から漏れて「表と本文が合わない」と誤検出する。
ROW = re.compile(r"^\|\s*(?:Step\s*)?\d+(?:\.\d+)?\s*\|[^|]*\|\s*(\d+)\s*分\s*\|", re.M)
# 「**合計時間**: 約60分です。」と「**合計時間**は約56分です。」の両方を拾う。
TOTAL = re.compile(r"\*\*合計時間\*\*\s*(?:[:：]|は)\s*約?\s*(\d+)\s*分")


def day_number(name: str) -> int | None:
    m = re.match(r"day(\d{2})", name)
    return int(m.group(1)) if m else None


def check(text: str):
    """(表の合計, 本文の合計, 表の項目数) を返す。片方でも無ければ None。

    コードブロックの中の表は数えない。Markdown の見本として置いた
    「| Step 1 | … | 5分 |」まで足すと、実際の予定より長い合計になり、
    合っている日を落とすことも、ずれている日を通すこともある。
    """
    body = strip_fences(text)
    rows = ROW.findall(body)
    total = TOTAL.search(body)
    if not rows or not total:
        return None
    return sum(int(r) for r in rows), int(total.group(1)), len(rows)


def missing_parts(text: str) -> list[str]:
    """表と合計時間のうち、見つからなかった方を返す。"""
    body = strip_fences(text)
    lacking = []
    if not ROW.findall(body):
        lacking.append("ステップ表の所要時間の行")
    if not TOTAL.search(body):
        lacking.append("**合計時間** の行")
    return lacking


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
    absent: list[tuple[str, list[str]]] = []
    checked = 0
    for path in targets:
        text = path.read_text(encoding="utf-8")
        result = check(text)
        if result is None:
            # 表を持たない日は day01〜day04 だけ、とこの検査自身が決めている。
            # それ以外の日で表や合計が消えたら、黙って検査対象から外さずに落とす。
            # 外していた頃は、行をまるごと消したり見出しを打ち間違えたりしても
            # Gate 4 が緑のままだった。
            day = day_number(path.name)
            if day is not None and day not in NO_TABLE_DAYS:
                absent.append((path.name, missing_parts(text)))
            continue
        checked += 1
        rows_sum, stated, count = result
        if rows_sum != stated:
            findings.append((path.name, rows_sum, stated, count))

    status = 0
    if findings:
        print(f"❌ 所要時間の合計が合わないファイル {len(findings)} 件（{checked} 件中）")
        for name, rows_sum, stated, count in findings:
            print(f"  {name}: 表の合計 {rows_sum} 分（{count} 項目） / 本文 {stated} 分")
        status = 1
    if absent:
        print(f"❌ 所要時間の記載が見つからないファイル {len(absent)} 件")
        for name, lacking in absent:
            print(f"  {name}: {'と'.join(lacking)} がありません")
        print("  day05 以降は所要時間の表と合計時間を必ず書いてください。")
        status = 1
    if status:
        return status

    print(f"✅ 所要時間の合計 OK（{checked} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
