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
    "has_confirmation_point",
    "heading_scan_view",
    "mask_code",
    "section_end",
]

# 読者が「次へ進んでよいか」を確かめる手段。教材は日によって書き方が違い、
# `**確認ポイント**` の日もあれば `### 期待する結果` の見出しで書く日もある。
# check_comprehension.py と check_no_skip.py が別々の定義を持っていた頃は、
# 片方が合格・片方が不合格という食い違いが起きていたので、定義はここ1箇所に置く。
CONFIRMATION_MARKERS = (
    re.compile(r"✅"),
    re.compile(r"- \[[ x]\]"),
    re.compile(r"確認[：:]"),
    re.compile(r"\*\*確認ポイント\*\*"),
)

CONFIRMATION_HEADING = re.compile(
    r"^#{2,4}\s+.*(確認|期待|チェック|成功|OK|見えたら|見ておき|見たい|見てほしい)"
)
# 「〜を確認する」で終わる見出しは、確かめる手段ではなく作業の指示である。
# 「README を開いて確認する」は何が出れば正しいのかを何も言っていないので、
# これを確認ポイントとして数えると、期待結果ゼロの節が緑のまま通る。
# 「ここで確認」「作成後に確認すること」は確認の提示なので残す。
ACTION_HEADING_TAIL = re.compile(r"確認(?:する|しよう|しましょう|してください|しておく)\s*$")


# ステップ節の終わりになる h2 見出し。`## まとめ` のような後続の節を節内に
# 取り込むと、そこに置かれた確認ポイントで手前のステップが合格してしまう。
# check_no_skip.py と check_comprehension.py で切り出し位置がずれると、
# 同じ教材に対して2つの検査が逆の判定を出すので、境界もここに1本化する。
SECTION_HEADING = re.compile(r"^## (?!#)", re.MULTILINE)


def heading_scan_view(content: str) -> str:
    """見出しを探すための、コードフェンスの中身を空白で潰した同じ長さの文字列。

    生の Markdown を見ると、コード例の中の `## main`（git status の出力）や
    README 例の `## 現在できること` が節の見出しに見える。そこでステップを
    切ると、以降の本文が検査されないまま通る。長さを変えずに潰すので、
    ここで得た位置はそのまま元の文字列の切り出しに使える。
    """
    return "\n".join(
        " " * len(line) if state != "outside" else line
        for _lineno, line, state, _fence in fence_states(content)
    )


def section_end(view: str, body_start: int, next_step_start: int) -> int:
    """ステップ節の終わりを返す。次のステップと次の h2 節の早いほうで切る。

    view には heading_scan_view の結果を渡す。元の文字列と長さが同じなので、
    返る位置はそのまま切り出しに使える。
    """
    following_section = SECTION_HEADING.search(view, body_start)
    if following_section and following_section.start() < next_step_start:
        return following_section.start()
    return next_step_start


def has_confirmation_point(section: str) -> bool:
    """節の本文に、読者が動作を確かめる手段が書かれているかを返す。

    見出し行そのものは呼び出し側で落としてから渡す。「〜を確認する」という
    ステップ名だけで合格させると、本文に検証手段が無いまま通ってしまう。
    """
    if any(marker.search(section) for marker in CONFIRMATION_MARKERS):
        return True
    return any(
        CONFIRMATION_HEADING.match(line) and not ACTION_HEADING_TAIL.search(line.strip())
        for line in section.split("\n")
    )

FILEPATH = re.compile(r"^\s*(?:\{/\*\s*filepath:\s*(.+?)\s*\*/\}|(?://|#)\s*filepath:\s*(.+?))\s*$")


def filepath_value(match):
    # 2つの書き方を1つの正規表現で受けるため捕獲群が2本になる。どちらが埋まるかは
    # 書き方で決まるので、呼び出し側に群番号を意識させず値だけを返す。
    return match.group(1) if match.group(1) is not None else match.group(2)


def first_filepath_match(code: str) -> "re.Match[str] | None":
    """ブロックの中で最初に見つかった目印の Match を返す。無ければ None。

    「目印があるか」と「その値は何か」を別々の判定で持つと、片方だけが
    書き方の追加に追従して割れる。実際に、有無は全行を見るのに値の取り出しは
    先頭行だけ、という食い違いが起きていた（#369）。両方をここから作る。
    """
    for line in code.split("\n"):
        m = FILEPATH.match(line)
        if m:
            return m
    return None


def has_filepath_marker(code: str) -> bool:
    # 「`{/* filepath:` を含むか」で数えると、閉じの `*/}` が無い壊れた目印まで
    # 有効として通る。そのまま貼ると構文エラーになるので、抽出側と同じ
    # FILEPATH で行ごとに判定して、検査と抽出の判定を1つに揃える。
    return first_filepath_match(code) is not None
# 値の末尾に付く注記1つ。入れ子は取らない（注記は `（続き）` 程度の平坦な語）。
TRAILING_NOTE = re.compile(r"^(.*?)\s*([（(][^（()）]*[）)])\s*$")
REAL_PREFIXES = ("src/", "prisma/", "scripts/")
# 写経対象として扱う言語。bash は同じ `# filepath:` の書式を使うが、
# 波括弧の意味が違う（`${VAR}` や関数定義）ので構文の収支検査には載せない。
CODE_LANGS = frozenset({"typescript", "ts", "tsx", "javascript", "js", "jsx"})
IDENT = re.compile(r"[A-Za-z0-9_$]")
# `/` の直前に来ると、その `/` が除算になる文字。値の終わりだからである。
# `>` と `<` も入れる。JSX の `<div>/` は要素の中身の文字であり、`</div>` の `/` は
# 閉じタグの一部で、どちらも正規表現の開始ではない。
DIVISION_AFTER = ")]}><"
# 直後に式が来る予約語。`return /\d+/.test(s)` の `/` は除算ではない。
# 直前が識別子でも、この語なら正規表現の開始として読む。
REGEX_KEYWORDS = frozenset(
    {
        "return", "typeof", "case", "in", "of", "new",
        "delete", "void", "throw", "yield", "await", "do", "else",
    }
)


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
                value = filepath_value(m)
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


def _starts_regex(src: str, pos: int) -> bool:
    """pos の `/` が正規表現リテラルの開始なら True。

    直前の非空白文字を見る。`scan_tags` が開始タグを見分けるのと同じ形である。
    値の終わり（識別子・`)`・`]`・`}`）の後ろに来る `/` は除算で、それ以外の位置に
    来る `/` は正規表現の開始しかありえない。ただし識別子でも、直後に式が来る
    予約語なら正規表現として読む（`return /\\d+/.test(s)`）。

    直後が `>` のときは自己終了タグ（`<Input />`）なので数えない。
    """
    if src[pos + 1 : pos + 2] == ">":
        return False
    j = pos - 1
    while j >= 0 and src[j] in " \t\n":
        j -= 1
    if j < 0:
        return True
    if src[j] in DIVISION_AFTER:
        return False
    if IDENT.match(src[j]):
        k = j
        while k >= 0 and IDENT.match(src[k]):
            k -= 1
        return src[k + 1 : j + 1] in REGEX_KEYWORDS
    return True


def mask_code(src: str) -> str:
    """文字列・コメント・テンプレートリテラル・正規表現を空白へ潰す。行数と桁は変えない。

    括弧やタグを数える前に通す。`"}"`  のような文字列や `// 閉じる }` のような
    コメントを数えると、収支は必ず合わなくなる。テンプレートリテラルは中身ごと
    潰す。`${...}` の中の括弧はその中で閉じているので、丸ごと消しても収支は動かない。

    正規表現リテラルも潰す。`const pattern = /<form>/;` の `<form>` を開始タグとして
    数えると、`</form>` はどこにも要らないのに「閉じていない」と報告される。
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
        if c == "/" and _starts_regex(src, i):
            j = i + 1
            in_class = False
            closed = False
            while j < n:
                d = src[j]
                if d == "\\":
                    j += 2
                    continue
                if d == "\n":
                    break
                if in_class:
                    if d == "]":
                        in_class = False
                elif d == "[":
                    # 文字クラスの中の `/` は終端にならない（`/[/]/`）。
                    in_class = True
                elif d == "/":
                    j += 1
                    closed = True
                    break
                j += 1
            if not closed:
                # 行内で閉じない。正規表現は行を跨げないので、これは正規表現ではなく
                # 断片コードに残った除算の片割れである。潰すと同じ行の閉じタグまで
                # 消えるので、そのまま置いて次の文字から数え直す。
                i += 1
                continue
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
