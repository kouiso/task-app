#!/usr/bin/env python3
"""写経対象のコードブロックを「書き込み先ファイル」ごとにまとめる共通処理。

29周目と30周目の点検は、どちらも「30日分のコードブロックを書き込み先ごとに連結し、
出来上がるファイルを見る」という同じ前処理をしていた。手でやったので再現できず、
道具はそのまま捨てられた。連結の規則をここ1箇所へ置いて、検査はここを呼ぶ。

書き込み先の判定は `// filepath:` の値で行う。教材の取り決めは次のとおり:
  - `src/` `prisma/` `scripts/` で始まる値 = 読者が実際に書くファイル
  - 「読み比べ用サンプル」「ターミナル」など = 実ファイルを持たない
  - 値の後ろの `（続き）` `（import に追加）` は注記であって、書き込み先の一部ではない

`markdown_scan` のフェンス解釈をそのまま使う。ここで自前に数え直さない。
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Iterator, NamedTuple

from markdown_scan import fence_states

__all__ = [
    "Block",
    "day_number",
    "iter_blocks",
    "concat_by_file",
    "mask_code",
]

FILEPATH = re.compile(r"^\s*(?://|#)\s*filepath:\s*(.+?)\s*$")
# 値の末尾に付く注記1つ。入れ子は取らない（注記は `（続き）` 程度の平坦な語）。
TRAILING_NOTE = re.compile(r"^(.*?)\s*([（(][^（()）]*[）)])\s*$")
REAL_PREFIXES = ("src/", "prisma/", "scripts/")
# 写経対象として扱う言語。bash は同じ `# filepath:` の書式を使うが、
# 波括弧の意味が違う（`${VAR}` や関数定義）ので構文の収支検査には載せない。
CODE_LANGS = frozenset({"typescript", "ts", "tsx", "javascript", "js", "jsx"})


class Block(NamedTuple):
    """1つのコードブロック。"""

    day: int
    source: str
    lineno: int
    target: str
    note: str
    lang: str
    lines: tuple[str, ...]

    @property
    def is_writing_target(self) -> bool:
        """読者が実ファイルへ書き込むブロックか。"""
        return self.target.startswith(REAL_PREFIXES)


def day_number(name: str) -> int:
    m = re.match(r"day(\d{2})", name)
    return int(m.group(1)) if m else 0


def _split_target(value: str) -> tuple[str, str]:
    """`src/x.ts（続き）` を ("src/x.ts", "（続き）") に割る。

    注記は必ず値の末尾に付く。末尾の括弧だけを剥がし、途中の括弧はパスの一部として
    残す。最初の `(` で切る形だと、App Router のルートグループ
    `src/app/(auth)/login/page.tsx` が `src/app/` へ潰れる。潰れた先には別の
    ルートグループのファイルも集まるので、片方の閉じタグがもう片方の
    開きっぱなしを隠してしまう。
    """
    base = value.strip()
    notes: list[str] = []
    while True:
        m = TRAILING_NOTE.match(base)
        if not m:
            break
        head, note = m.group(1).strip(), m.group(2)
        # 括弧を剥がした残りがパスの途中で終わるなら、それは注記ではなく
        # ルートグループそのもの（`src/app/(auth)`）。剥がさずに置く。
        if "/" in note or head.endswith("/") or not head:
            break
        base = head
        notes.insert(0, note)
    return base, "".join(notes)


def iter_blocks(text: str, source: str) -> Iterator[Block]:
    """`// filepath:` を持つコードブロックを、現れた順に返す。

    filepath 行はブロックの1行目とは限らない（`'use client'` の下に置く日がある）ので、
    ブロックの中を最後まで見て最初に現れた1本だけを採る。filepath 行そのものは
    lines へ含めない。写経される中身ではないためである。
    """
    day = day_number(source)
    buf: list[str] = []
    value: str | None = None
    start = 0
    lang = ""
    for i, line, state, fence in fence_states(text):
        if state == "open":
            buf, value, start, lang = [], None, i, (fence.lang if fence else "")
            continue
        if state == "inside":
            m = FILEPATH.match(line)
            if m and value is None:
                value = m.group(1)
                continue
            buf.append(line)
            continue
        if state == "close" and value is not None:
            target, note = _split_target(value)
            yield Block(day, source, start, target, note, lang, tuple(buf))


def concat_by_file(paths: list[Path]) -> dict[str, list[Block]]:
    """書き込み先ファイルごとに、day 順のブロック列を返す。"""
    out: dict[str, list[Block]] = {}
    blocks: list[Block] = []
    for p in sorted(paths, key=lambda q: (day_number(q.name), q.name)):
        blocks.extend(iter_blocks(p.read_text(encoding="utf-8"), p.name))
    for b in blocks:
        if b.is_writing_target and b.lang in CODE_LANGS:
            out.setdefault(b.target, []).append(b)
    return out


def _in_jsx_text(src: str, pos: int) -> bool:
    """pos が JSX のテキスト部分（タグとタグの間）に居るなら True。

    その行で最後に現れた構造文字が `>` なら、そこから先は要素の中身である。
    `<` `{` `}` のいずれかが後に来ていれば、もうテキストではない。
    `=>` と `>=` の `>` は演算子なので数えない。
    """
    i = pos - 1
    while i >= 0 and src[i] != "\n":
        c = src[i]
        if c in "<{}":
            return False
        if c == ">" and (i == 0 or src[i - 1] != "=") and src[i + 1 : i + 2] != "=":
            return True
        i -= 1
    return False


def mask_code(src: str) -> str:
    """文字列・コメント・テンプレートリテラルを空白へ潰す。行数と桁は変えない。

    括弧やタグを数える前に通す。`"}"`  のような文字列や `// 閉じる }` のような
    コメントを数えると、収支は必ず合わなくなる。テンプレートリテラルは中身ごと
    潰す。`${...}` の中の括弧はその中で閉じているので、丸ごと消しても収支は動かない。
    """
    out = list(src)
    i = 0
    n = len(src)

    def blank(a: int, b: int) -> None:
        for k in range(a, min(b, n)):
            if out[k] != "\n":
                out[k] = " "

    while i < n:
        c = src[i]
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = src.find("\n", i)
            j = n if j < 0 else j
            blank(i, j)
            i = j
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            j = n if j < 0 else j + 2
            blank(i, j)
            i = j
            continue
        if c in "'\"`":
            j = i + 1
            closed = False
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == c:
                    j += 1
                    closed = True
                    break
                if src[j] == "\n" and c != "`":
                    # 引用符が行内で閉じていない。断片コードでは起きうるので、
                    # そこで打ち切って次の行から数え直す。
                    break
                j += 1
            if not closed and c != "`" and _in_jsx_text(src, i):
                # 行内で閉じない引用符が JSX のテキストの中に在る。
                # `<DialogTitle>Don't panic</DialogTitle>` のアポストロフィがこれで、
                # 文字列の開始として潰すと同じ行の `</DialogTitle>` まで消える。
                # 消えた閉じタグは誰にも見えないので、正しい JSX が
                # 「閉じていない」として報告される。ここでは1文字の地の文として置く。
                i += 1
                continue
            blank(i, j)
            i = j
            continue
        i += 1
    return "".join(out)
