#!/usr/bin/env python3
"""教材の地の文で、textlint が見ない2種類の「和文と英字のくっつき」を見る。

和文と英字・行内コードの間の半角空白は、textlint の2つのルール
（ja-space-between-half-and-full-width と ja-space-around-code）が見る。
ただし設定で数字を外しているので、`Day 15の` や `Step 3で` の番号の後ろは拾わない。
数字まで含めると「3つ」の前まで空けろと言われるため、数字は外したままにしてある。
また「ー」を和文として扱わないので、`ユーザーID` や「フィルター」の後ろの行内コードも拾わない。
この2種類をここで見る（#471）。

コードブロックの中は見ない。行内コードは "x" で塗ってから判定する。
空白で塗ると「ー」の直後の行内コードが消え、`ユーザー` と行内コードのくっつきを取り落とす。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from markdown_scan import iter_prose, mask_html_comments, mask_inline_code

# `Day 15の`・`Step 0-6 で` の番号の直後に和文が続く所。
# 前に英字が続く語（`OneDay 1`）は番号ではないので外す。
NUMBER = re.compile(r"(?<![A-Za-z])(?:Day|Step) \d+(?:[-〜・]\d+)*(?=[ぁ-んァ-ヶ一-龠々])")
# 「ー」の直後に英字（行内コードは x に塗ってある）が続く所。
LONG_VOWEL = re.compile(r"ー(?=[A-Za-z])")
# 画面のラベル「アバターURL（任意）」と同じ語。本文で空けると画面と食い違う。
ALLOW = ("アバターURL",)


def line_hits(line: str) -> list[str]:
    masked = mask_inline_code(line, fill="x")
    for word in ALLOW:
        masked = masked.replace(word, " " * len(word))
    hits = [m.group(0) for m in NUMBER.finditer(masked)]
    hits += [line[max(0, m.start() - 3) : m.end() + 3] for m in LONG_VOWEL.finditer(masked)]
    return hits


def find_violations(root: Path) -> tuple[list[tuple[str, int, str]], int]:
    hits: list[tuple[str, int, str]] = []
    scanned = 0
    for path in sorted(root.rglob("*.md")):
        scanned += 1
        text = mask_html_comments(path.read_text(encoding="utf-8"))
        for lineno, line in iter_prose(text):
            for found in line_hits(line):
                hits.append((str(path.relative_to(root)), lineno, found))
    return hits, scanned


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]
    if len(args) != 1 or not Path(args[0]).is_dir():
        print("❌ 教材ディレクトリを1つ指定してください", file=sys.stderr)
        return 2
    root = Path(args[0])

    hits, scanned = find_violations(root)
    if scanned == 0:
        print(f"❌ md ファイルがありません: {root}", file=sys.stderr)
        return 2

    if hits:
        print(f"❌ 和文と英字・行内コードがくっついている箇所が {len(hits)} 件あります")
        for name, line, found in hits:
            print(f"  {name}:{line}: {found}")
        print("  間に半角空白を1つ入れてください（例: `Day 15の` → `Day 15 の`、`ユーザーID` → `ユーザー ID`）。")
        print("  画面・初期データ・図の文字と同じ表記に保つ語は ALLOW に理由つきで足してください。")
        return 1

    print(f"✅ 和文と英字の空白 OK（{scanned} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
