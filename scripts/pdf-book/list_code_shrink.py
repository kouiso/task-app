#!/usr/bin/env python3
"""dist/.pdf-book-build の HTML から、縮んだコード行を列挙する診断。

`make book-pdf` のあと「どの冊のどの見出しのどの行が何%へ縮んだか」を出す
手段が無かった。`cw-shrink` の grep では件数しか分からず、HTML の名前は
`day17-00a436` のような作業用の短い名前なので Day も見出しも辿れない。
原稿側から work_slug で逆引きして冊名に戻し、縮んだ行の直前の h2 / h3 を
付けて1行に1箇所出す。

使い方: 先に `make book-pdf`（または `make book-pdf-one`）で dist/.pdf-book-build
を作ってから `python3 scripts/pdf-book/list_code_shrink.py` を実行する。
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "pdf-book"))

from build_pdf_book import work_slug  # noqa: E402
from code_wrap import (  # noqa: E402
    BLOCK_SHRINK_CLASS,
    LANG_RE,
    PRE_RE,
    SHRINK_CLASS,
    TAG_RE,
    atoms,
    line_width,
)

SRC_DIR = REPO_ROOT / "material" / "30days-curriculum"
WORK_DIR = REPO_ROOT / "dist" / ".pdf-book-build"

HEADING_RE = re.compile(r"<h([23])\b[^>]*>(.*?)</h\1>", re.DOTALL)
SHRINK_OPEN_RE = re.compile(
    rf'<span class="({SHRINK_CLASS}(?: {BLOCK_SHRINK_CLASS})?)"'
    r' style="font-size:(\d+)%">'
)
SPAN_TAG_RE = re.compile(r"</?span\b[^>]*>")


def _span_inner(text: str, body_start: int) -> str:
    """開始タグの直後から、対応する </span> の手前までを返す。"""
    depth = 1
    for tag in SPAN_TAG_RE.finditer(text, body_start):
        if tag.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                return text[body_start : tag.start()]
        else:
            depth += 1
    return text[body_start:]


def _plain(fragment: str) -> str:
    """断片 HTML の表示文字だけを取り出す（cw-force の改行は文字ではない）。"""
    return html.unescape(TAG_RE.sub("", fragment))


def _widest_line(inner: str) -> str:
    """ブロック縮小の中でいちばん幅の広い行（縮小率を決めた行）の文字を返す。"""
    widest = ""
    widest_width = -1.0
    for raw in _plain(inner).split("\n"):
        width = line_width(atoms(raw))
        if width > widest_width:
            widest_width = width
            widest = raw
    return widest.strip()


def shrunk_lines(document: str) -> list[tuple[str, str, int, str]]:
    """1冊ぶんの HTML から (h2, h3, 縮小率%, 行の文字) の一覧を返す。

    mermaid の枠は図に変わるので数えない。`.env` の枠のような
    cw-block-shrink（枠全体を同率で縮める）は1箇所と数える。
    """
    events = sorted(
        [
            *((m.start(), "h", m) for m in HEADING_RE.finditer(document)),
            *((m.start(), "pre", m) for m in PRE_RE.finditer(document)),
        ]
    )
    h2 = ""
    h3 = ""
    found: list[tuple[str, str, int, str]] = []
    for _pos, kind, match in events:
        if kind == "h":
            heading = _plain(match.group(2)).strip()
            if match.group(1) == "2":
                h2, h3 = heading, ""
            else:
                h3 = heading
            continue
        block = match.group(0)
        open_tag = block[: block.index(">") + 1]
        lang_match = LANG_RE.search(open_tag)
        if lang_match and lang_match.group(1).lower() == "mermaid":
            continue
        inner = block[block.index(">") + 1 : -len("</pre>")]
        for shrink in SHRINK_OPEN_RE.finditer(inner):
            body = _span_inner(inner, shrink.end())
            if BLOCK_SHRINK_CLASS in shrink.group(1):
                # 枠全体の縮小は1箇所。率を決めた最長行の文字を出す
                found.append((h2, h3, int(shrink.group(2)), _widest_line(body)))
            else:
                found.append(
                    (h2, h3, int(shrink.group(2)), _plain(body).strip())
                )
    return found


def main() -> int:
    pages = sorted(WORK_DIR.glob("*.html"))
    if not pages:
        print(
            f"組版済みの HTML がありません: {WORK_DIR}\n"
            "先に make book-pdf（または make book-pdf-one）を実行してください",
            file=sys.stderr,
        )
        return 2

    slug_to_stem = {
        work_slug(source.stem): source.stem for source in SRC_DIR.glob("*.md")
    }
    total = 0
    books: set[str] = set()
    for page in pages:
        book = slug_to_stem.get(page.stem, page.stem)
        for h2, h3, pct, line in shrunk_lines(page.read_text(encoding="utf-8")):
            print(f"{book}\t{h2}\t{h3}\t{pct}%\t{line}")
            total += 1
            books.add(book)
    print(f"{total} 箇所 / {len(books)} 冊")
    return 0


if __name__ == "__main__":
    sys.exit(main())
