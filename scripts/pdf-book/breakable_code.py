"""版面の半分を超える <pre> にだけ分割許可のクラスを付ける。

issue #407。book.css の `pre { break-inside: avoid }` は写経向けに
コードブロックを丸ごと次ページへ送る。送られる塊が版面の大半を
占めると、手前のページは説明文だけの薄いページになる（36冊・
3410ページのうち本文35%未満の薄いページが695ページ、
空白ページ換算537ページ分が実測された）。

分割できるのは表示行数がしきい値以上の塊だけにする。行数は
code_wrap が <br class="cw-force"> で入れた強制改行と原文の
改行の合計で、版面（約247mm ≒ 表示30行）に対する高さを近似する。
しきい値未満の塊は送られても版面の6割を超えないため、従来どおり
丸ごと送って薄いページにならない。
"""

from __future__ import annotations

import html
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
# inner は `</code></pre>` まで含む。数えるのはコード本文だけにする
CLOSE_TAIL_RE = re.compile(r"</code\s*>\s*</pre\s*>$|</pre\s*>$", re.IGNORECASE)


TAG_RE = re.compile(r"<[^>]+>")
# 区切りのタグも結果に残す分割用（re.split は捕捉群があると区切りを返す）
TAG_SPLIT_RE = re.compile(r"(<[^>]+>)")

# 論理行を1つの箱にまとめるための印。中身は改行できない（cw-force による
# 表示上の折返しを含む）。これが無いとページ境目で 1 文の途中が割れ、
# 行の間に柱が入り込む（issue #763 通し番号11）。
CODELINE_CLASS = "pdf-codeline"
CODE_OPEN_RE = re.compile(r"<code\b[^>]*>")
CODE_CLOSE_TAIL_RE = re.compile(r"</code\s*>\s*</pre\s*>\s*$|</pre\s*>\s*$")
# pre をブロック要素（.pdf-codeline）の並びに変えると CSS の orphans / widows が
# 効かなくなる。両端がこの表示行数未満で切れないよう塊の側で束ねる
EDGE_MIN_RENDERED_LINES = 4
# 継続行の束ねが長くなりすぎて版面の大半を占める塊に戻らないための上限
MAX_CHUNK_RENDERED_LINES = 8
CONTINUATION_ENDINGS = ("=", "&&", "||", "??", "+", "?")
CONTINUATION_STARTS = (".", "?", ":", "|", "&")


TAG_NAME_RE = re.compile(r"</?\s*([a-zA-Z][a-zA-Z0-9-]*)")
# 対にならない単独タグは開いた集合に入れない
VOID_TAG_NAMES = {"br", "wbr", "hr", "img"}


def _line_rendered_height(line_html: str) -> int:
    return 1 + len(BR_RE.findall(line_html))


def _plain_code_line(line_html: str) -> str:
    return html.unescape(TAG_RE.sub("", line_html))


def _joins_next_statement_line(curr_plain: str, next_plain: str) -> bool:
    """2つの論理行が1文の途中改行（または直下への見出しコメント）なら True。"""
    curr = curr_plain.strip()
    nxt = next_plain.strip()
    if not curr or not nxt:
        return False
    # コメント行だけ前ページに残ると何の説明か分からなくなる
    if curr.startswith("//") or (curr.startswith("/*") and curr.endswith("*/")):
        return True
    # 代入・論理式などの演算子で終わる未完の行（`=>` のブロック開始は除く）
    if curr.endswith(CONTINUATION_ENDINGS) and not curr.endswith("=>"):
        return True
    # 次行がメソッドチェーンや三項・型合併の続きで始まる
    if nxt.startswith(CONTINUATION_STARTS) and not nxt.startswith("..."):
        return True
    # JSX 開始タグが属性の途中で改行され、まだ `>` で閉じていない
    if curr.startswith("<") and not curr.startswith(("</", "<!--")) and ">" not in curr:
        return True
    return False


def _group_unbreakable_chunks(lines: list[str]) -> list[list[str]]:
    """論理行の列を、ページ境目で割ってはいけない塊ごとに束ねる。"""
    if not lines:
        return []
    plains = [_plain_code_line(line) for line in lines]
    heights = [_line_rendered_height(line) for line in lines]

    chunks: list[list[str]] = [[lines[0]]]
    chunk_heights: list[int] = [heights[0]]
    for idx in range(1, len(lines)):
        # 先頭側は orphans 相当（4表示行）に達するまで束ねる
        need_head = len(chunks) == 1 and chunk_heights[0] < EDGE_MIN_RENDERED_LINES
        want_join = _joins_next_statement_line(plains[idx - 1], plains[idx])
        can_fit = chunk_heights[-1] + heights[idx] <= MAX_CHUNK_RENDERED_LINES
        if need_head or (want_join and can_fit):
            chunks[-1].append(lines[idx])
            chunk_heights[-1] += heights[idx]
        else:
            chunks.append([lines[idx]])
            chunk_heights.append(heights[idx])

    # 末尾側も widows 相当（4表示行）に達するまで手前の塊へ畳む
    while len(chunks) > 1 and chunk_heights[-1] < EDGE_MIN_RENDERED_LINES:
        tail_chunk = chunks.pop()
        tail_h = chunk_heights.pop()
        chunks[-1].extend(tail_chunk)
        chunk_heights[-1] += tail_h

    return chunks


def _lines_as_unbreakable_blocks(inner: str) -> str:
    """pre 内の各論理行を span の塊にして返す。改行は塊と塊の境目でのみ起こる。

    Prism の装飾タグは改行をまたぐ。行の境目では開いているタグを一度
    閉じ、次の行の先頭で開き直す。これで各行は常に対応の取れた断片に
    なる（行中で `</code>` までタグが残る事故の防止）。
    """
    head_m = CODE_OPEN_RE.match(inner)
    head = head_m.group(0) if head_m else ""
    rest = inner[head_m.end():] if head_m else inner
    tail_m = CODE_CLOSE_TAIL_RE.search(rest)
    tail = tail_m.group(0) if tail_m else ""
    body = rest[: tail_m.start()] if tail_m else rest
    # 末尾の構造的な改行は新しい行を作らない。空行は中身に改行を残して
    # 高さを持たせる（空の span は高さ 0 に潰れて空行が消える）。
    if body.endswith("\n"):
        body = body[:-1]

    lines: list[str] = []
    current: list[str] = []
    open_names: list[str] = []
    open_texts: list[str] = []
    for token in TAG_SPLIT_RE.split(body):
        if not token:
            continue
        if token.startswith("<"):
            name_m = TAG_NAME_RE.match(token)
            name = name_m.group(1).lower() if name_m else ""
            if token.startswith("</"):
                if open_names and open_names[-1] == name:
                    open_names.pop()
                    open_texts.pop()
            elif name not in VOID_TAG_NAMES:
                open_names.append(name)
                open_texts.append(token)
            current.append(token)
            continue
        for i, segment in enumerate(token.split("\n")):
            if i:
                current.extend(f"</{n}>" for n in reversed(open_names))
                lines.append("".join(current))
                current = open_texts.copy()
            current.append(segment)
    lines.append("".join(current))

    chunks = _group_unbreakable_chunks(lines)
    wrapped = "".join(
        f'<span class="{CODELINE_CLASS}">'
        f'{chr(10).join(chunk) + (chr(10) if chunk[-1] == "" else "")}'
        f"</span>"
        for chunk in chunks
    )
    return head + wrapped + tail


def rendered_line_count(inner: str) -> int:
    """pre の中身の表示行数（原文の改行 + 強制改行 + 1）を返す。

    生成 HTML はコードの末尾を改行で閉じる。その改行は新しい行を
    作らないので数える前に1個だけ落とす。`<span>\n</span>` のように
    タグで包まれた格好で出てくることがあるので、行を作らないタグは
    全部外してから判定する（`<br>` は行を足すので残す）。
    """
    body = CLOSE_TAIL_RE.sub("", inner)
    body = TAG_RE.sub(
        lambda m: m.group(0) if m.group(0).lower().startswith("<br") else "",
        body,
    )
    if body.endswith("\n"):
        body = body[:-1]
    return body.count("\n") + len(BR_RE.findall(body)) + 1


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
        return new_tag + _lines_as_unbreakable_blocks(inner)

    return PRE_RE.sub(repl, html_text)
