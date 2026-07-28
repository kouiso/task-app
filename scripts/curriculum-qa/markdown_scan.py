#!/usr/bin/env python3
"""Markdown を「地の文」と「コード」に切り分ける共通処理。

この関数群を切り出す前は、8本の検査スクリプトがそれぞれ自前でフェンスを数えていた。
どれも同じ壊れ方をしていた。閉じ記号を `marker[0]`（バッククォート1文字）でしか
見ないため、4連フェンスで開いたブロックの中に普通の3連フェンスの例があると、
内側の例がブロックを閉じたことになる。そこから先はコードが地の文として検査され、
本当の地の文は「コードの中」として捨てられる。どちらの向きにも誤判定が出る。

同じ修正を8箇所へ書き写すと、9本目を書いた人が同じ穴を作り直す。
フェンスとインラインコードの解釈はここ1箇所に置き、各検査はここを呼ぶ。

CommonMark に合わせた判定:
  - 開始フェンスは ` か ~ が3つ以上。情報文字列（言語名など）を後ろに置ける。
  - 閉じフェンスは開始と同じ文字で、長さが開始以上で、後ろに情報文字列を持たない。
  - インラインコードは同じ長さのバッククォート列で挟まれた範囲。
"""

from __future__ import annotations

import bisect
import re
from typing import Iterator, NamedTuple

__all__ = [
    "Fence",
    "UnclosedFence",
    "blank_fences",
    "fence_states",
    "iter_prose",
    "mask_html_comments",
    "mask_inline_code",
    "paragraph_line",
    "paragraph_text",
    "paragraphs",
    "strip_fences",
]

# 行頭の字下げを許し、フェンス記号と情報文字列を分けて取る。
# 字下げは CommonMark の3文字までに絞らない。教材は箇条書きの下に4文字以上
# 字下げしたフェンスを置いており、絞ると既存の判定が変わってしまう。
FENCE_LINE = re.compile(r"^\s*(`{3,}|~{3,})\s*(.*?)\s*$")
BACKTICK_RUN = re.compile(r"`+")
HTML_COMMENT = re.compile(r"<!--.*?-->", re.S)


class UnclosedFence(ValueError):
    """ファイルの終わりまでフェンスが閉じていない。"""


class Fence(NamedTuple):
    """開いているフェンスの情報。"""

    marker: str
    info: str

    @property
    def lang(self) -> str:
        """情報文字列の最初の語を小文字で返す。

        ```` ```text title="post" ```` のように属性が付く書き方があるため、
        情報文字列そのものと言語名を比較すると一致しない。
        """
        head = self.info.split()[0] if self.info.split() else ""
        return head.split("{")[0].lower()


def _closes(marker: str, opened: Fence, info: str) -> bool:
    return (
        marker[0] == opened.marker[0]
        and len(marker) >= len(opened.marker)
        and not info
    )


def fence_states(text: str) -> Iterator[tuple[int, str, str, Fence | None]]:
    """(行番号, 行, 状態, 開いているフェンス) を1行ずつ返す。行番号は1始まり。

    状態は次の4つ。
      outside : フェンスの外
      open    : 開始フェンスの行そのもの
      inside  : フェンスの中身
      close   : 閉じフェンスの行そのもの
    open / inside / close では第4要素にそのブロックの Fence が入る。
    """
    opened: Fence | None = None
    for lineno, line in enumerate(text.split("\n"), start=1):
        m = FENCE_LINE.match(line)
        if opened is None:
            if m:
                opened = Fence(m.group(1), m.group(2))
                yield lineno, line, "open", opened
            else:
                yield lineno, line, "outside", None
            continue
        if m and _closes(m.group(1), opened, m.group(2)):
            yield lineno, line, "close", opened
            opened = None
            continue
        yield lineno, line, "inside", opened


def iter_prose(text: str) -> Iterator[tuple[int, str]]:
    """コードブロックの外にある行だけを (行番号, 行) で返す。"""
    for lineno, line, state, _ in fence_states(text):
        if state == "outside":
            yield lineno, line


def blank_fences(text: str) -> str:
    """フェンスの行と中身を空行に置き換える。行数と行番号を保つ。"""
    out = [line if state == "outside" else "" for _, line, state, _ in fence_states(text)]
    return "\n".join(out)


def strip_fences(text: str, *, require_closed: bool = False) -> str:
    """フェンスの行と中身を取り除く。行番号は保たない。

    require_closed=True のとき、閉じ忘れがあれば UnclosedFence を投げる。
    閉じ忘れたフェンスがあると、そこから下の行が全部落ちる。落ちた範囲の欠陥は
    誰にも見えないまま緑になるので、黙って捨てずに止めたい検査はこれを使う。
    """
    out: list[str] = []
    last_state = "outside"
    for _, line, state, _ in fence_states(text):
        last_state = state
        if state == "outside":
            out.append(line)
    if require_closed and last_state in ("open", "inside"):
        raise UnclosedFence("閉じていないコードブロックがあります")
    return "\n".join(out)


# 段落の切れ目になる行。箇条書き・表・見出しは、隣り合っていても別の文である。
# ここで切らないと、手順の箇条書きと次の項目の文が1つの段落に入り、
# 別々の項目に散っている語が同居したことになる。
BLOCK_START = re.compile(r"^\s*(?:[-*+]\s|\d+[.)]\s|\||#{1,6}\s|>)")


def paragraphs(text: str) -> list[list[tuple[int, str]]]:
    """地の文を段落へまとめる。段落は (行番号, 行) の並び。

    Markdown は物理行の折り返しで意味が変わらない。禁止したい言い回しが折り返しで
    2行に割れると、行単位の判定はどちらの行でも語の片方しか見えないため、
    そのまま通ってしまう。

    コードブロックも段落の切れ目として扱う。`iter_prose` はフェンスの行を黙って
    落とすので、フェンスだけで隔てられた前後の地の文をそのまま繋ぐと、1つの段落に
    なる。前の文が挙げた置き場と、後ろの文の「見比べて確認してください」が同居した
    ことになり、書いた人が別々の話として書いた2つが1件の指摘になる。
    """
    out: list[list[tuple[int, str]]] = []
    current: list[tuple[int, str]] | None = None
    for lineno, line, state, _ in fence_states(text):
        if state != "outside":
            current = None
            continue
        if not line.strip():
            current = None
            continue
        if current is None or BLOCK_START.match(line):
            current = []
            out.append(current)
        current.append((lineno, line))
    return out


def paragraph_text(para: list[tuple[int, str]], *, sep: str = "\n") -> str:
    """段落を1つの文字列へ連結する。

    sep="" は折り返しの改行そのものを消す。日本語の本文は折り返しの位置に区切りが
    無いので、`エラーが` と `出なくなります` のように語の途中で折り返された文は、
    改行を残したままでは語として照合できない。行の位置を保ちたい検査は既定のまま
    使い、paragraph_line へ同じ sep を渡す。
    """
    return sep.join(line for _, line in para)


def paragraph_line(
    para: list[tuple[int, str]], offset: int, *, sep: str = "\n"
) -> tuple[int, str]:
    """paragraph_text 上の位置から、その位置を含む (行番号, 行) を返す。"""
    starts: list[int] = []
    pos = 0
    for _, line in para:
        starts.append(pos)
        pos += len(line) + len(sep)
    return para[bisect.bisect_right(starts, offset) - 1]


def mask_inline_code(line: str, fill: str = " ") -> str:
    """インラインコードを fill 1文字で塗りつぶす。文字数と位置は変えない。

    バッククォート1個決め打ちだと、``` ``このユーザーは既にメンバーです`` ``` のような
    2連の code span は空の区切りだけが消えて中身が地の文として残る。
    CommonMark どおり「同じ長さのバッククォート列」で挟まれた範囲を消す。
    """
    runs = [(m.start(), m.end()) for m in BACKTICK_RUN.finditer(line)]
    out = list(line)
    i = 0
    while i < len(runs):
        start, end = runs[i]
        width = end - start
        j = i + 1
        while j < len(runs) and (runs[j][1] - runs[j][0]) != width:
            j += 1
        if j >= len(runs):
            i += 1
            continue
        for k in range(start, runs[j][1]):
            out[k] = fill
        i = j + 1
    return "".join(out)


def mask_html_comments(text: str, fill: str = " ") -> str:
    """HTML コメントを fill で塗りつぶす。改行と文字数は保つ。

    `<!-- ... -->` は Markdown が読者に表示しない。説明の分量を数える検査が
    これを地の文として数えると、読者に何も見えていないブロックが通る。
    """
    return HTML_COMMENT.sub(lambda m: re.sub(r"[^\n]", fill, m.group(0)), text)
