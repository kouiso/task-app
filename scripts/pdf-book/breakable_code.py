"""版面の半分を超える <pre> にだけ分割許可のクラスを付ける。

issue #407。book.css の `pre { break-inside: avoid }` は写経向けに
コードブロックを丸ごと次ページへ送る。送られる塊が版面の大半を
占めると、手前のページは説明文だけの薄いページになる（36冊で
34ページ、空白換算38ページ分が実測された）。

分割できるのは表示行数がしきい値以上の塊だけにする。行数は
code_wrap が <br class="cw-force"> で入れた強制改行と原文の
改行の合計で、版面（約247mm ≒ 表示30行）に対する高さを近似する。
しきい値未満の塊は送られても版面の6割を超えないため、従来どおり
丸ごと送って薄いページにならない。
"""

from __future__ import annotations

import re

from code_wrap import PRE_RE

# これ以上の表示行数を持つ <pre> は分割を許す。版面の高さは表示約30行で、
# 薄いページ（埋まり具合35%未満）が生まれるのは送られる塊がその65%を
# 超える時だけ。19行を少し下回る18行を境にすると、残る丸送りの塊は
# 高々17行+余白 ≒ 版面の6割で、埋まり具合は約39%を下回らない。
BREAKABLE_MIN_LINES = 18

# book.css で break-inside: auto を掛けるための印
BREAKABLE_CLASS = "pdf-breakable"

BR_RE = re.compile(r"<br\b", re.IGNORECASE)
CLASS_RE = re.compile(r'class="([^"]*)"')


def rendered_line_count(inner: str) -> int:
    """pre の中身の表示行数（原文の改行 + 強制改行 + 1）を返す。"""
    return inner.count("\n") + len(BR_RE.findall(inner)) + 1


def mark_breakable_pres(html_text: str) -> str:
    """表示行数がしきい値以上の <pre> へ pdf-breakable を付けた文字列を返す。"""

    def repl(match: re.Match[str]) -> str:
        block = match.group(0)
        open_end = block.index(">") + 1
        open_tag = block[:open_end]
        inner = block[open_end:]
        if BREAKABLE_CLASS in open_tag:
            return block
        if rendered_line_count(inner) < BREAKABLE_MIN_LINES:
            return block
        class_m = CLASS_RE.search(open_tag)
        if class_m:
            new_tag = open_tag.replace(
                class_m.group(0),
                f'class="{class_m.group(1)} {BREAKABLE_CLASS}"',
                1,
            )
        else:
            new_tag = open_tag[:-1].rstrip() + f' class="{BREAKABLE_CLASS}">'
        return new_tag + inner

    return PRE_RE.sub(repl, html_text)
