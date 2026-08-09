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
# ATX 見出しは `#` の直後に空白が要る。`#hashtag` は見出しではなく段落なので、
# その直後の `---` は setext 見出しになる（mdast で実測）。空白を省くと見逃す。
#
# 表の行（`|` 始まり）は入れていない。GFM の区切り行は列数が合ったときだけ
# 表になり、合わなければ段落として setext の対象になるからである。
# 除外に加えても全30日で検出は0件のままだったので、見逃しを作らない側を採った。
BLOCK_START = re.compile(
    r" {0,3}(?:#{1,6}(?:[ \t]|$)|>|[-*+](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$)|`{3,}|~{3,}|<)"
)

# 水平線そのもの。`---` の手前がまた水平線なら、手前は段落ではない。
THEMATIC_BREAK = re.compile(r" {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$")

# 4スペース以上の字下げ。ただし字下げコードブロックになるのは、直前が空行か
# 文書の先頭のときだけである。段落の途中に現れた字下げ行は段落の継続なので、
# その直後の `---` は setext 見出しになる（mdast で実測）。
INDENTED = re.compile(r" {4,}\S")


def _looks_like_frontmatter(body: list[str]) -> bool:
    """frontmatter の中身として妥当かを返す。

    `:` の有無だけで見ると、`description: |` のような複数行 scalar や
    コメントだけの frontmatter を弾いてしまう。YAML として読めるかで判定する。
    PyYAML が無い環境でも検査そのものは動かしたいので、その場合は
    「`---` で開いて閉じていれば frontmatter とみなす」側に倒す。
    """
    text = "\n".join(body)
    try:
        import yaml
    except ImportError:
        return True
    try:
        parsed = yaml.safe_load(text)
    except yaml.YAMLError:
        return False
    # コメントだけの frontmatter は None になる。本文が1行あるだけの
    # `---\n本文です。\n---` は文字列になるので、これは frontmatter ではない。
    return parsed is None or isinstance(parsed, dict)


def _frontmatter_end(lines: list[str]) -> int:
    """先頭の YAML frontmatter の次の行の添字を返す。frontmatter が無ければ 0。

    先頭の `---` を見ただけで frontmatter と決めると、水平線で始まる文書の
    「本文 + `---`」を丸ごと読み飛ばして、見出し化を見逃す。閉じ位置の候補を
    順に試し、中身が YAML として読めた最初の位置を採る。scalar の中に
    字下げされた `---` があっても、そこで打ち切らずに次の候補へ進む。
    """
    if not lines or lines[0].strip() != "---":
        return 0
    for index in range(1, len(lines)):
        if lines[index].strip() == "---" and _looks_like_frontmatter(lines[1:index]):
            return index + 1
    return 0


def find_accidental_headings(text: str) -> list[tuple[int, str]]:
    """(行番号, 見出しにされてしまう手前の行) を返す。行番号は `---` の側。"""
    rows = list(fence_states(text))
    lines = [line for _lineno, line, _state, _fence in rows]
    states = [state for _lineno, _line, state, _fence in rows]

    def is_paragraph(index: int) -> bool:
        """`lines[index]` が段落の行か（＝直後の `---` が見出しを作るか）。"""
        line = lines[index]
        if not line.strip() or states[index] != "outside":
            return False
        if BLOCK_START.match(line) or THEMATIC_BREAK.fullmatch(line.rstrip()):
            return False
        # 字下げコードブロックになるのは、直前が空行か文書の先頭のときだけ。
        # 段落の途中に現れた字下げ行は段落の継続なので、ここでは除外しない。
        starts_indented_code = INDENTED.match(line) and (
            index == 0 or not lines[index - 1].strip()
        )
        return not starts_indented_code

    return [
        (index + 1, lines[index - 1])
        for index in range(max(_frontmatter_end(lines), 1), len(lines))
        if states[index] == "outside"
        and SEPARATOR.fullmatch(lines[index])
        and is_paragraph(index - 1)
    ]


def check(path: Path) -> int:
    hits = find_accidental_headings(path.read_text(encoding="utf-8"))
    for lineno, previous in hits:
        # 再帰走査では別ディレクトリに同名のファイルが在りうるので、名前ではなくパスを出す。
        print(f"❌ {path}:{lineno} 手前の行が見出しになります: {previous[:60]}")
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

    # 対象が0件のまま成功で返すと、パスを間違えたときに「検査していない緑」になる。
    if not targets:
        print("❌ 対象の Markdown ファイルがありません", file=sys.stderr)
        return 1

    total = sum(check(path) for path in targets)
    if total:
        print(f"\n❌ 区切り線のつもりの `---` が見出しになっている箇所: {total} 件")
        print("   `---` の手前に空行を1行入れてください")
        return 1

    print(f"✅ 区切り線: {len(targets)} ファイルすべて問題なし")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
