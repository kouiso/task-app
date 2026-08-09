#!/usr/bin/env python3
"""区切り線のつもりで書いた `---` が見出しになっていないか見る。

Markdown では、地の文の直後に空行なしで `---` を置くと、水平線ではなく
その手前の行を h2 見出しにする（setext 見出し）。教材では区切りのつもりで
書かれているので、画像行の直後に置かれると、画像が見出しの中に入って
本文の何倍もの大きさで描画される。

実測（mdast-util-from-markdown）:
    "![img](a.png)\\n---\\n"    → heading (h2)
    "![img](a.png)\\n\\n---\\n" → paragraph | thematicBreak

見た目が壊れるだけで textlint も既存の検査も拾わないため、ここで見る。
直し方は `---` の手前に空行を1行入れるだけ。
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from markdown_scan import fence_states  # noqa: E402

# setext の下線は3スペースまでの字下げが許される。4スペース入ると
# 字下げコードブロックになって見出しにならない（mdast で実測）。
SEPARATOR = re.compile(r" {0,3}-{3,}[ \t]*$")

# 手前がこれで始まる行なら、その行は段落ではないので setext にならない。
# 見出し・引用・箇条書き（`-` `*` `+`）・順序付き箇条書き（`1.` `1)`）・
# フェンス・生の HTML を並べる。1つでも落とすと、正しい教材が赤くなる。
#
# 表の行（`|` 始まり）は入れていない。GFM の区切り行は列数が合ったときだけ
# 表になり、合わなければ段落として setext の対象になるからである。
# 除外に加えても全30日で検出は0件のままだったので、見逃しを作らない側を採った。
BLOCK_START = re.compile(r" {0,3}(?:#|>|[-*+](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$)|`{3,}|~{3,}|<)")


def _frontmatter_end(lines: list[str]) -> int:
    """先頭の YAML frontmatter の次の行の添字を返す。frontmatter が無ければ 0。

    先頭の `---` を見ただけで frontmatter と決めると、水平線で始まる文書の
    「本文 + `---`」を丸ごと読み飛ばして、見出し化を見逃す。中身が YAML に
    見えるときだけ frontmatter として扱う。
    """
    if not lines or lines[0].strip() != "---":
        return 0
    for index in range(1, len(lines)):
        if lines[index].strip() != "---":
            continue
        body = lines[1:index]
        looks_like_yaml = body and all(
            not line.strip() or ":" in line or line.lstrip().startswith("- ")
            for line in body
        )
        return index + 1 if looks_like_yaml else 0
    return 0


def find_accidental_headings(text: str) -> list[tuple[int, str]]:
    """(行番号, 見出しにされてしまう手前の行) を返す。行番号は `---` の側。"""
    rows = list(fence_states(text))
    lines = [line for _lineno, line, _state, _fence in rows]
    states = [state for _lineno, _line, state, _fence in rows]

    return [
        (index + 1, lines[index - 1])
        for index in range(max(_frontmatter_end(lines), 1), len(lines))
        # 手前の行がフェンスの中や閉じ行なら、そこはコードブロックの一部で段落ではない。
        if states[index] == "outside"
        and states[index - 1] == "outside"
        and SEPARATOR.fullmatch(lines[index])
        and lines[index - 1].strip()
        and not BLOCK_START.match(lines[index - 1])
    ]


def check(path: Path) -> int:
    hits = find_accidental_headings(path.read_text(encoding="utf-8"))
    for lineno, previous in hits:
        print(f"❌ {path.name}:{lineno} 手前の行が見出しになります: {previous[:60]}")
    return len(hits)


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("使用法: python3 check_setext_heading.py <ファイルまたはディレクトリ>")
        return 1

    # ディレクトリは入れ子まで見る。check_quality.sh 側は find で再帰的に集めるので、
    # ここだけ直下に限ると、track を切って置いた教材が無検査で通る。
    targets: list[Path] = []
    for arg in argv[1:]:
        path = Path(arg)
        targets.extend(sorted(path.rglob("*.md")) if path.is_dir() else [path])

    total = sum(check(path) for path in targets)
    if total:
        print(f"\n❌ 区切り線のつもりの `---` が見出しになっている箇所: {total} 件")
        print("   `---` の手前に空行を1行入れてください")
        return 1

    print(f"✅ 区切り線: {len(targets)} ファイルすべて問題なし")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
