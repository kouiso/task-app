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

SEPARATOR = re.compile(r"-{3,}\s*$")
# 手前がこれらで始まる行なら setext にならない。`-` は箇条書き、`|` は表の行、
# `#` は既に見出し、`>` は引用、`` ` `` はフェンスの開始。
NOT_A_PARAGRAPH = ("#", "|", ">", "-", "*", "`")


def find_accidental_headings(text: str) -> list[tuple[int, str]]:
    """(行番号, 見出しにされてしまう手前の行) を返す。行番号は `---` の側。"""
    rows = list(fence_states(text))
    lines = [line for _lineno, line, _state, _fence in rows]
    states = [state for _lineno, _line, state, _fence in rows]

    # 先頭の YAML frontmatter は `---` で開いて `---` で閉じるので対象外。
    start = 1
    if lines and lines[0].strip() == "---":
        for index in range(1, len(lines)):
            if lines[index].strip() == "---":
                start = index + 1
                break

    return [
        (index + 1, lines[index - 1])
        for index in range(start, len(lines))
        if states[index] == "outside"
        and SEPARATOR.fullmatch(lines[index])
        and lines[index - 1].strip()
        and not lines[index - 1].startswith(NOT_A_PARAGRAPH)
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

    targets: list[Path] = []
    for arg in argv[1:]:
        path = Path(arg)
        targets.extend(sorted(path.glob("*.md")) if path.is_dir() else [path])

    total = sum(check(path) for path in targets)
    if total:
        print(f"\n❌ 区切り線のつもりの `---` が見出しになっている箇所: {total} 件")
        print("   `---` の手前に空行を1行入れてください")
        return 1

    print(f"✅ 区切り線: {len(targets)} ファイルすべて問題なし")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
