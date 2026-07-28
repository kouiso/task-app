#!/usr/bin/env python3
"""本文が指す Step 番号が、実際にその日に在るかを見る。

「Step 3 で書いた `utils`」のような案内は、読者が前へ戻る唯一の手がかりになる。番号が
違うと、その Step を開いて何も見つからない。実測で2件あった。day29 は「Step 1 で置いた」
と書いていたが実体は Step 0 で、Step 1 にはコードが1行も無い。day17 は「Step 2 で書いた
`utils`」と書いていたが実体は Step 3 だった。どちらも書いた本人が数えずに書いている。

「Day NN の Step M」は他の日への参照なので、その日の見出しで確かめる。
見出しは `### Step 3 : ...` のように区切りの前に空白が入るものがあるため、両方を許す。

この検査で捕まえられないもの: 実測の2件は、どちらも参照先の Step 自体は存在していた。
day29 の Step 1 も day17 の Step 2 も在る見出しで、ただ中身が違っただけである。
つまりこの検査が止めるのは「存在しない Step への参照」だけで、「在るが中身の違う Step へ
の参照」は止められない。後者を機械で判定するには、参照している識別子がその Step の
コードブロックに在るかまで見る必要がある。ここではやっていない。
"""

import re
import sys
from pathlib import Path

from markdown_scan import iter_prose, strip_fences

# `### Step 3: ...` と `### Step 3 : ...` の両方。day02 だけ `## Step 1: ...` の階層なので
# 2段でも3段でも拾う。
HEADING = re.compile(r"^#{2,3}\s+Step\s*([\d.]+)\s*[:：]", re.M)
# 本文中の「Step 3 で」「Step 3 の」など。直前に「Day 11 」が付く形は別の日への参照。
REF = re.compile(r"(?:Day\s*(\d{1,2})\s*の?\s*)?Step\s*([\d.]+)\s*(?:で|の|を|へ|から|と)")


def day_number(name: str) -> int:
    m = re.match(r"day(\d{2})", name)
    return int(m.group(1)) if m else 0


def headings(text: str) -> set[str]:
    """実在する Step 見出しの番号を返す。

    コードブロックの中は数えない。参照側 (find_bad_refs) はフェンスの中を見ないのに
    こちらだけ生の Markdown を見ていたため、````md のサンプルに書いた
    `### Step 99: ...` が本物の行き先として索引され、存在しない Step への参照が通っていた。
    """
    return set(HEADING.findall(strip_fences(text)))


def find_bad_refs(
    path: Path, own: set[str], others: dict[int, set[str]]
) -> list[tuple[int, str, str]]:
    """(行番号, 参照先の表記, 理由) を返す。"""
    hits: list[tuple[int, str, str]] = []
    for i, line in iter_prose(path.read_text(encoding="utf-8")):
        for m in REF.finditer(line):
            day, step = m.group(1), m.group(2)
            if day is not None:
                target = others.get(int(day))
                if target is None:
                    hits.append((i, f"Day {day} Step {step}", "その日が無い"))
                elif step not in target:
                    hits.append((i, f"Day {day} Step {step}", "その日にその Step が無い"))
                continue
            if step not in own:
                hits.append((i, f"Step {step}", "この日にその Step が無い"))
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

    by_day = {
        day_number(p.name): headings(p.read_text(encoding="utf-8")) for p in targets
    }

    findings: list[tuple[str, int, str, str]] = []
    for path in targets:
        own = by_day.get(day_number(path.name), set())
        for line, ref, why in find_bad_refs(path, own, by_day):
            findings.append((path.name, line, ref, why))

    if findings:
        print(f"❌ 指す先が無い Step 参照 {len(findings)} 件")
        for name, line, ref, why in findings:
            print(f"  {name}:{line} {ref}（{why}）")
        return 1

    print(f"✅ Step 参照 OK（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
