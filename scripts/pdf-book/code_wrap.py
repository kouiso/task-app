"""vfm が出力した HTML の <pre> コード行へ安全な折返しを入れる。

Vivliostyle の行分割は行長しか見ない。word-break / overflow-wrap / text-wrap は
いずれも効かず、空白の有無に関係なく常に約65桁でトークンの途中でも切れる
（book.css の検証コメント参照）。<wbr> は候補にはなるが、break-all は候補を
優先せず語中で分断する。このため <wbr> だけではコピー安全性を保証できない。

桁あふれする行は、構文上改行できる境界を58桁以内になるよう選び、
<br class="cw-force"> で強制改行する。境界間が長い場合は8ptを下回らない範囲で
行を縮小する。どちらでも収まらない行は残件として組版を止める。

文字列リテラルの扱いはコピー可否で分ける。JSX / HTML の class / className
属性値は空白位置だけを候補にする。JSX子テキストは開始タグ直後だけを候補にし、
その他の属性値、テンプレート本文、通常文字列、正規表現、行コメントは実改行で
値や構文が変わるため内側を候補にしない。`return` 等の restricted keyword と
operand の間（block comment と tab を含む）、postfix `++` / `--`、TypeScript
non-null `!`、`=>` の直前も候補から外す。

Prism の <span class="token"> は貫通して扱う。タグをまたぐ空白境界でもよい。
"""

from __future__ import annotations

import html
import re
import unicodedata

# 実測の折れ桁は65。それより短い行は触らない。
# 強制境界間の上限もこれで検査する。余裕はフォントの個体差ぶん。
SAFE_COLS = 58
# コメント中の長い同種文字列へ候補を足す間隔。
FORCE_SEGMENT = 40

PRE_RE = re.compile(r"<pre\b[^>]*>.*?</pre>", re.DOTALL | re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]+>")
ENTITY_RE = re.compile(r"&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);")

ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

# トークン構成要素になりうる記号。これらの直後を候補にすると、コピー時に
# 識別子・数値・URL・パス・セレクタが分断される（`noto-sans-jp`→`sans-\njp`、
# `page.tsx`→`page.\ntsx`、`1.5`→`1.\n5` 等）。区切り文字（`(` `,` `=` `{`
# `;` `+` 等）の直後はどの言語でも改行を空白として読めるので折ってよい。
GLUE_PUNCTS = "-._/:@#%$\\"
JS_SAFE_BREAK_AFTER = "({[,;"

# 文字列リテラルの構文解析を行う言語。text/markdown は引用符を文字列と
# みなさない（文章中の引用符を誤認しないため）。
JS_LANGS = {"ts", "tsx", "typescript", "js", "javascript", "jsx", "console"}
MARKUP_LANGS = {"html", "xml", "markup"}
STRICT_LANGS = {
    "env", "bash", "sh", "shell", "css", "json", "yaml", "yml",
    "toml", "prisma", "sql", "ini", "dotenv",
}
PARSE_LANGS = JS_LANGS | MARKUP_LANGS | STRICT_LANGS

# ASI（自動セミコロン挿入）で意味が変わるキーワード。`return\nexpr` は
# `return; expr` に、`throw\nx` は構文エラー、`break\nlabel` はラベル喪失
# になる。これらの直後の空白位置では折れない（JS/TS のコード領域のみ）
ASI_KEYWORDS = {"return", "throw", "break", "continue", "yield", "async"}
# 直後の `<` が型引数やなく式（JSX）の開始になるキーワード。
# _js_regex_positions が正規表現リテラルの開始判定に使うものと同じ集合
EXPRESSION_KEYWORDS = {"return", "throw", "case", "yield", "await"}

# 言語ごとの行コメント・ブロックコメント構文
SLASH_COMMENT_LANGS = JS_LANGS | {"prisma", "java", "go", "rust", "csharp"}
BLOCK_COMMENT_LANGS = SLASH_COMMENT_LANGS | {"css"}
HASH_COMMENT_LANGS = {
    "env", "dotenv", "bash", "sh", "shell", "yaml", "yml", "toml", "ini",
}
DASH_COMMENT_LANGS = {"sql"}

# 改行そのものが意味を持つ言語。行内のどこで折れてもペースト結果が壊れる
# ため、行内に強制境界を入れず、あふれる行はフォント縮小で収める。
LINE_ATOMIC_LANGS = {
    "bash", "sh", "shell", "env", "dotenv", "yaml", "yml", "toml", "ini",
    "dockerfile", "docker", "make", "makefile",
}

# 縮小の絶対下限。pre の実効サイズは本文 12.75pt × 90% ≒ 11.5pt なので、
# 読める下限 8pt までは 70% まで縮められる。これ未満になる行は縮小を諦めて
# 残件として報告する（相対%ではなく絶対ptで決める: 教材のコードが読めない
# 小ささは出せない）
SHRINK_MIN_PT = 8.0
PRE_FONT_PT = 12.75 * 0.9
SHRINK_MIN_PCT = int(SHRINK_MIN_PT * 100 / PRE_FONT_PT) + 1  # ≒70
SHRINK_CLASS = "cw-shrink"
BLOCK_SHRINK_CLASS = "cw-block-shrink"
FORCE_BREAK_CLASS = "cw-force"
BLOCK_UNIFORM_LANGS = {"env", "dotenv"}

# 実改行を空白として解釈できることを確認した文法だけを対象にする。
# Python 等の `x =\ny` は構文エラーなので、未確認言語へ広げない。
FORCE_BREAK_LANGS = JS_LANGS | MARKUP_LANGS | {
    "css", "json", "prisma", "text", "md", "markdown",
}
FORCE_OUT_LANGS = JS_LANGS | {
    "css", "json", "prisma", "text", "md", "markdown",
}


def char_width(char: str) -> int:
    """East Asian の W/F を2桁、その他を1桁として数える。"""
    return 2 if unicodedata.east_asian_width(char) in ("W", "F") else 1


def atoms(text: str) -> list[str]:
    """論理行を、実体参照を1文字と数えた原子単位の列に分ける。"""
    out: list[str] = []
    i = 0
    while i < len(text):
        entity = ENTITY_RE.match(text, i)
        # 1文字に解決できん名前（未定義や複数文字になるもの）はブラウザも字面のまま
        # 描くので、実体参照として1桁に数えると幅を読み違える
        if entity and len(html.unescape(entity.group(0))) == 1:
            out.append(entity.group(0))
            i = entity.end()
        else:
            out.append(text[i])
            i += 1
    return out


def atom_char(atom: str) -> str:
    """原子単位が表す1文字。名前付き実体参照は &nbsp; なども含めて解決する。"""
    if atom.startswith("&#x"):
        return chr(int(atom[3:-1], 16))
    if atom.startswith("&#"):
        return chr(int(atom[2:-1], 10))
    if atom.startswith("&") and atom.endswith(";"):
        return html.unescape(atom)
    return atom


def classify(atom: str) -> str:
    """ALNUM=ASCII英数字 / PUNCT=その他ASCII / WIDE=非ASCII（CJK等はどこでも折れる）。"""
    char = atom_char(atom)
    if char in ALNUM:
        return "ALNUM"
    if ord(char) < 128:
        return "PUNCT"
    return "WIDE"


def classify_block(lines_atoms: list[list[str]], lang: str) -> list[list[str]]:
    """<pre> ブロック全体で各行の各原子位置の状態を分類する。

    戻り値は行ごとの "out" / "tolerant" / "strict" / "comment" /
    "jsx-text" の列。複数行にまたがる
    JSXタグ（`<div` と `className=` が別行）を扱うため、文字列・タグの
    状態は行を跨いで継続する。
    - JSX / HTML の class / className 属性値は、内側の空白位置を改行しても
      class token列が変わらないため "tolerant"
    - title 等、その他の属性値は実改行で値が変わるため "strict"
    - JSX子テキストは開始タグ直後だけを選別できるよう "jsx-text"
    - テンプレートリテラル本文は実改行が値に入るため "strict"
    - テンプレートリテラル中の `${}` 内部はコード領域なので "out"
      （`${foo(\nbar)}` のような区切り位置の改行はJSとして合法）
    - それ以外の文字列内は "strict"（内側に折れを入れない）
    - lang が PARSE_LANGS 外なら全て "out"
    """
    if lang not in PARSE_LANGS:
        return [["out"] * len(line) for line in lines_atoms]
    if lang in LINE_ATOMIC_LANGS:
        return [["strict"] * len(line) for line in lines_atoms]
    result: list[list[str]] = []
    # モードのスタック。"out"=コード、"tpl"=テンプレート文字列本文、
    # "str:X"=引用符Xの文字列。"str"は開いた時点で許容/非許容を確定する。
    # 行コメントとブロックコメントは別フラグで管理する。
    stack: list[str] = []
    depth = 0  # ${} 内のコードモードでのブレース深さ
    jsx_depth = 0
    # [式を開いたJSX深さ, 波括弧深さ]。JSX式内にさらにJSXがある場合、
    # その深いタグの子は外側の式中でもJSX textとして扱う。
    jsx_expr_stack: list[list[int]] = []
    tag_expr_depth = 0
    tag_buffer = ""
    literal_escaped = False
    previous_literal_char_was_escaped = False
    str_tol = False
    in_tag = False
    prev_sig = ""
    # 直前の識別子。return <p> の `<` を JSX 開始と見分けるために持つ
    prev_word = ""
    prev_was_word_char = False
    prev_atom_ch = ""
    comment_line = False
    comment_block = False
    pending = ""  # "/" や "*" の直後に来る文字で意味が変わるもの
    for line_index, line_atoms in enumerate(lines_atoms):
        states: list[str] = []
        line_chars = "".join(atom_char(item) for item in line_atoms)
        comment_line = False
        pending = ""
        for atom_index, atom in enumerate(line_atoms):
            ch = atom_char(atom)
            mode = stack[-1] if stack else "out"
            if (
                mode == "out"
                and lang in JS_LANGS
                and line_index == 0
                and atom_index == 0
                and line_chars.startswith("#!")
            ):
                comment_line = True
                states.append("strict")
            elif comment_line:
                # // や # の行コメント：中で折れるとコピー時に尻尾がコード化する
                states.append("strict")
            elif comment_block:
                # /* */ の中は改行してもコメントのままなので空白・CJK位置で折ってよい
                if pending == "*" and ch == "/":
                    comment_block = False
                    pending = ""
                    states.append("out")
                else:
                    pending = "*" if ch == "*" else ""
                    states.append("comment")
            elif (
                mode == "out"
                and lang in JS_LANGS
                and jsx_depth > 0
                and not in_tag
                and (
                    not jsx_expr_stack
                    or jsx_depth > jsx_expr_stack[-1][0]
                )
            ):
                # JSX の子テキストでは空白・改行も値の一部になる。たとえば
                # `<Icon /> 編集` の空白位置へ改行を足すと先頭空白が消え、
                # `URL（任意）` の途中へ足すと新しい空白が生じる。
                if ch == "<":
                    in_tag = True
                    tag_buffer = "<"
                    states.append("out")
                elif ch == "{":
                    jsx_expr_stack.append([jsx_depth, 1])
                    states.append("out")
                else:
                    states.append("jsx-text")
            elif mode == "out":
                if pending == "/" and ch == "/" and lang in SLASH_COMMENT_LANGS:
                    comment_line = True
                    pending = ""
                    states.append("strict")
                elif pending == "/" and ch == "*" and lang in BLOCK_COMMENT_LANGS:
                    comment_block = True
                    pending = ""
                    states.append("comment")
                elif pending == "-" and ch == "-" and lang in DASH_COMMENT_LANGS:
                    comment_line = True
                    pending = ""
                    states.append("strict")
                else:
                    pending = ch if ch in "/-" else ""
                    if ch == "{" and len(stack) > 1:
                        depth += 1
                    elif ch == "{" and in_tag:
                        tag_expr_depth += 1
                    elif ch == "{" and jsx_expr_stack:
                        jsx_expr_stack[-1][1] += 1
                    elif ch == "{":
                        pass
                    elif ch == "}":
                        if len(stack) > 1:
                            if depth > 0:
                                depth -= 1
                            else:
                                stack.pop()  # ${} のコード領域を閉じる
                        elif in_tag and tag_expr_depth > 0:
                            tag_expr_depth -= 1
                        elif jsx_expr_stack:
                            jsx_expr_stack[-1][1] -= 1
                            if jsx_expr_stack[-1][1] == 0:
                                jsx_expr_stack.pop()
                    elif ch in "\"'":
                        stack.append("str:" + ch)
                        prefix = "".join(
                            atom_char(item) for item in line_atoms[:atom_index]
                        )
                        str_tol = bool(
                            in_tag
                            and re.search(
                                r"(?:^|\s)(?:class|className)\s*=\s*$", prefix
                            )
                        )
                        literal_escaped = False
                    elif ch == "`" and lang in JS_LANGS:
                        stack.append("tpl")
                        literal_escaped = False
                    elif ch == "#" and lang in HASH_COMMENT_LANGS:
                        comment_line = True
                        states.append("strict")
                        prev_sig = "#"
                        prev_atom_ch = ch
                        continue
                    elif lang in JS_LANGS:
                        # 識別子直後の `<T>` は型引数でありJSXタグではない。
                        # JSX開始になり得る式境界の `<` だけをタグとして追う。
                        if ch == "<" and (
                            not prev_sig
                            or prev_sig not in ALNUM + "_$)]'\"`"
                            or prev_word in EXPRESSION_KEYWORDS
                        ):
                            in_tag = True
                            tag_buffer = "<"
                        elif ch == ">" and tag_expr_depth == 0:
                            if in_tag and lang in JS_LANGS:
                                tag_buffer += ">"
                                stripped = tag_buffer.rstrip()
                                if stripped.startswith("</"):
                                    jsx_depth = max(0, jsx_depth - 1)
                                elif not stripped.endswith("/>"):
                                    jsx_depth += 1
                            in_tag = False
                    states.append("out")
            elif mode == "tpl":
                was_escaped = literal_escaped
                if was_escaped:
                    literal_escaped = False
                    states.append("strict")
                elif ch == "\\":
                    literal_escaped = True
                    states.append("strict")
                elif ch == "`":
                    stack.pop()
                    states.append("out")
                elif (
                    ch == "{"
                    and prev_sig == "$"
                    and not previous_literal_char_was_escaped
                ):
                    stack.append("out")
                    depth = 0
                    states.append("out")
                else:
                    # テンプレート本文では実改行が文字列値へ入る。
                    states.append("strict")
            else:  # str:X
                if literal_escaped:
                    literal_escaped = False
                    states.append("tolerant" if str_tol else "strict")
                elif ch == "\\":
                    literal_escaped = True
                    states.append("tolerant" if str_tol else "strict")
                elif ch == mode[-1]:
                    stack.pop()
                    states.append("out")
                else:
                    states.append("tolerant" if str_tol else "strict")
            if not ch.isspace():
                prev_sig = ch
            if ch in ALNUM or ch in "_$":
                prev_word = prev_word + ch if prev_was_word_char else ch
            elif not ch.isspace():
                prev_word = ""
            prev_was_word_char = ch in ALNUM or ch in "_$"
            previous_literal_char_was_escaped = (
                was_escaped if mode == "tpl" else False
            )
            if in_tag and ch != "<":
                tag_buffer += ch
            prev_atom_ch = ch
        result.append(states)
    return result


def break_before(
    text_atoms: list[str], states: list[str], lang: str = ""
) -> set[int]:
    """折返しを検討できる原子単位の添字集合（その添字の直前で折れる）。

    - 区切り記号・空白 → 英数字の境界は折返し候補（`(`, `=`, スペースの後）
    - トークン構成記号（GLUE_PUNCTS）の直後は折らない（識別子・URL・数値の
      途中で折れるとコピーが壊れる）
    - JS/TS の ASI 危険キーワード直後の空白位置も折らない（`return\nx` 等）
    - 非ASCII文字は前後どちらでも折れる（CJKのコメントが桁あふれしても拾う）
    - 空白許容の文字列内では空白直後のみ候補（コピーしても空白1つ分の差に留まる）
    - 空白非許容の文字列内には入れない（改行がそのまま構文を壊すため）
    - 超長ランの FORCE_SEGMENT はコメント内だけ（コピー後もコメントのまま）
    """
    marks: set[int] = set()
    kinds = [classify(a) for a in text_atoms]

    def asi_hazard(i: int) -> bool:
        """境界 i の直前の空白を遡り、その前の単語が ASI 危険語か。"""
        if lang not in JS_LANGS:
            return False
        j = i - 1
        while j >= 0 and atom_char(text_atoms[j]) == " ":
            j -= 1
        k = j
        while k >= 0 and kinds[k] == "ALNUM":
            k -= 1
        if k == j:  # 直前が英数でない（記号・CJK）なら対象外
            return False
        word = "".join(atom_char(a) for a in text_atoms[k + 1 : j + 1])
        if word not in ASI_KEYWORDS:
            return False
        # `foo.return` のようなメンバーアクセスはキーワードではない
        return k < 0 or atom_char(text_atoms[k]) != "."

    def allowed(i: int, prev_kind: str, cur_kind: str) -> bool:
        state = states[i]
        if state in {"strict", "jsx-text"}:
            return False
        if state == "comment":
            # ブロックコメント内は改行してもコメントのまま。空白直後とCJK直後に
            # 限る（CJKは日本語組版と同じく文字間で折れる）
            prev = atom_char(text_atoms[i - 1])
            return prev == " " or prev_kind == "WIDE"
        if state == "tolerant":
            # JSX / HTML 属性値は空白直後だけ（コピー時に
            # 空白1つ分の差に留まる。CJK途中は値が変わるので入れない）
            return atom_char(text_atoms[i - 1]) == " "
        if prev_kind == "PUNCT" and cur_kind == "ALNUM":
            prev_char = atom_char(text_atoms[i - 1])
            if prev_char in GLUE_PUNCTS:
                # JS/TS の `.` は英字の前ならメンバーアクセスとして
                # `foo.\nbar` が合法なので折ってよい。数字の前（`1.5`）と
                # 他言語（CSSセレクタ・URL内ドット等）はトークン分断になる
                if not (
                    prev_char == "."
                    and lang in JS_LANGS
                    and not atom_char(text_atoms[i]).isdigit()
                ):
                    return False
            if prev_char == " " and asi_hazard(i):
                return False
            return True
        return "WIDE" in (prev_kind, cur_kind)

    for i in range(1, len(text_atoms)):
        if allowed(i, kinds[i - 1], kinds[i]):
            marks.add(i)
    # 連続ランが長すぎる場合の最後の手段。コメント内だけに限る（コメントは
    # どこで折れてもペースト後もコメントのまま）。コード領域のトークン途中に
    # 入れるとコピーが壊れるため、収まらない行は縮小側へ回す
    run_start = 0
    for i in range(1, len(text_atoms) + 1):
        same = i < len(text_atoms) and kinds[i] == kinds[run_start]
        if same:
            continue
        run_len = sum(char_width(atom_char(a)) for a in text_atoms[run_start:i])
        if run_len > SAFE_COLS:
            col = 0
            for j in range(run_start, i):
                col += char_width(atom_char(text_atoms[j]))
                if (
                    col >= FORCE_SEGMENT
                    and j + 1 < i
                    and states[j + 1] == "comment"
                ):
                    marks.add(j + 1)
                    col = 0
        run_start = i
    return marks


def line_width(text_atoms: list[str]) -> int:
    return sum(char_width(atom_char(a)) for a in text_atoms)


def _without_block_comments(prefix: str) -> str:
    """同じ論理行の block comment を空白へ置き換え、直前の構文tokenを見えるようにする。"""
    return re.sub(r"/\*.*?\*/", " ", prefix).rstrip()


def _js_regex_positions(text_atoms: list[str], states: list[str]) -> set[int]:
    """JS の正規表現リテラルらしい範囲を保守的に返す。

    `/` は除算にもなるため、行頭または式を開始できる記号・キーワードの直後だけを
    開始候補にする。誤って除算を正規表現扱いしても強制改行候補が減るだけで、構文を
    書き換える方向には倒れない。
    """
    if not text_atoms:
        return set()
    chars = "".join(atom_char(atom) for atom in text_atoms)
    positions: set[int] = set()
    i = 0
    while i < len(chars):
        if chars[i] != "/" or states[i] != "out":
            i += 1
            continue
        if i > 0 and chars[i - 1] == "*" and states[i - 1] == "comment":
            i += 1
            continue
        if i + 1 < len(chars) and chars[i + 1] in "/*":
            i += 1
            continue
        prefix = _without_block_comments(chars[:i])
        previous = prefix[-1:] if prefix else ""
        word_match = re.search(r"[A-Za-z_$][A-Za-z0-9_$]*$", prefix)
        previous_word = word_match.group(0) if word_match else ""
        can_start = (
            not prefix
            or previous in "=(:,[!&|?{};+*%^~<>"
            or previous == ")"
            or previous_word in {"return", "throw", "case", "yield", "await"}
        )
        if not can_start:
            i += 1
            continue
        j = i + 1
        escaped = False
        in_class = False
        while j < len(chars):
            ch = chars[j]
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == "[":
                in_class = True
            elif ch == "]" and in_class:
                in_class = False
            elif ch == "/" and not in_class:
                end = j + 1
                while end < len(chars) and chars[end].isalpha():
                    end += 1
                positions.update(range(i, end))
                i = end
                break
            j += 1
        else:
            i += 1
    return positions


def _restricted_comment_positions(
    text_atoms: list[str], states: list[str]
) -> set[int]:
    """改行禁止tokenの間にある block comment 群の範囲を返す。

    block comment 内の実改行も ECMAScript では LineTerminator になるため、
    `return /*...*/ 7`、`value /*...*/ ++`、`(x) /*...*/ => x` 等の
    comment 内・直後を強制改行してはいけない。
    """
    chars = "".join(atom_char(atom) for atom in text_atoms)
    blocked: set[int] = set()
    comment_group = re.compile(r"(?:/\*.*?\*/\s*)+")
    for match in comment_group.finditer(chars):
        if not any(states[index] == "comment" for index in range(*match.span())):
            continue
        prefix = _without_block_comments(chars[:match.start()])
        word_match = re.search(r"[A-Za-z_$][A-Za-z0-9_$]*$", prefix)
        previous_word = word_match.group(0) if word_match else ""
        suffix = chars[match.end():].lstrip()
        if previous_word in ASI_KEYWORDS or suffix.startswith(("++", "--", "=>", "!")):
            blocked.update(
                range(match.start(), min(len(chars), match.end() + 1))
            )
    return blocked


def forced_breaks(
    text_atoms: list[str], states: list[str], marks: set[int], lang: str
) -> set[int]:
    """実改行しても意味が変わらない境界を、58桁以内になるよう選ぶ。

    JS/TSは既存の空白と `({[,;` の直後だけに絞る。`marks` の全候補を安全とは
    みなさない。`.` 後の候補は optional chain や数値リテラルを壊し得るため
    強制しない。テンプレート本文・通常文字列・行コメントは classify_block が
    strict にしているため対象外になる。
    """
    if lang not in FORCE_BREAK_LANGS:
        return set()
    forbidden: set[int] = set()
    if lang in JS_LANGS:
        forbidden |= _js_regex_positions(text_atoms, states)
        forbidden |= _restricted_comment_positions(text_atoms, states)
        chars = "".join(atom_char(atom) for atom in text_atoms)
        for index in range(1, len(text_atoms)):
            if atom_char(text_atoms[index - 1]) == ".":
                forbidden.add(index)
            next_word = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", chars[index:])
            if next_word and next_word.group(0) in {"as", "satisfies"}:
                forbidden.add(index)
            if atom_char(text_atoms[index - 1]) != " ":
                continue
            if chars[index:index + 2] in {"++", "--"} or chars[index] == "!":
                forbidden.add(index)
                continue
            if chars[index:index + 2] == "=>":
                forbidden.add(index)
                continue
            prefix = chars[:index].rstrip()
            word_match = re.search(r"[A-Za-z_$][A-Za-z0-9_$]*$", prefix)
            previous_word = word_match.group(0) if word_match else ""
            word_start = word_match.start() if word_match else 0
            if previous_word in ASI_KEYWORDS and (
                word_start == 0 or prefix[word_start - 1] != "."
            ):
                forbidden.add(index)
    candidate_pool = set(marks)
    candidate_pool.update(
        index
        for index in range(1, len(text_atoms))
        if atom_char(text_atoms[index - 1]) == " "
        and states[index] in {"out", "tolerant", "comment"}
    )
    if lang in JS_LANGS:
        candidate_pool.update(
            index
            for index in range(1, len(text_atoms))
            if states[index] == "jsx-text"
            and atom_char(text_atoms[index - 1]) == ">"
            and not atom_char(text_atoms[index]).isspace()
            and classify(text_atoms[index]) in {"ALNUM", "WIDE"}
        )
    candidates = [
        index
        for index in sorted(candidate_pool)
        if index not in forbidden
        if (
            states[index] == "comment"
            or (
                states[index] == "jsx-text"
                and atom_char(text_atoms[index - 1]) == ">"
                and not atom_char(text_atoms[index]).isspace()
            )
            or (
                states[index] == "tolerant"
                and atom_char(text_atoms[index - 1]) == " "
            )
            or (
                states[index] == "out"
                and lang in FORCE_OUT_LANGS
                and (
                    atom_char(text_atoms[index - 1]) == " "
                    or (
                        lang in JS_LANGS
                        and atom_char(text_atoms[index - 1]) in JS_SAFE_BREAK_AFTER
                    )
                    or (
                        lang not in JS_LANGS
                        and
                        len(atom_char(text_atoms[index - 1])) == 1
                        and ord(atom_char(text_atoms[index - 1])) < 128
                        and not atom_char(text_atoms[index - 1]).isspace()
                    )
                )
            )
        )
    ]
    selected: set[int] = set()
    start = 0
    while line_width(text_atoms[start:]) > SAFE_COLS:
        fitting = [
            index
            for index in candidates
            if index > start
            and line_width(text_atoms[start:index]) <= SAFE_COLS
        ]
        if not fitting:
            later = [index for index in candidates if index > start]
            if not later:
                break
            boundary = later[0]
        else:
            boundary = fitting[-1]
        selected.add(boundary)
        start = boundary
    return selected


def _emit_line(
    chunks: list[tuple[str, str]],
    states: list[str],
    residuals: list[str],
    lang: str = "",
) -> str:
    """(断片, その断片中の論理文字列) の列へ安全な強制境界を入れる。

    断片はタグまたはテキスト。テキスト断片の論理文字は実体参照を1原子として
    持つ。行全体の表示桁が SAFE_COLS 以下なら無変換で結合して返す。
    states は classify_block がその行に付けた out/tolerant/strict の列。
    折返し可能な境界だけでは SAFE_COLS に収まらない行（非許容文字列をまたぐ
    場合など）は、行ごとフォント縮小して1行に収める。縮小下限を下回る行は
    residuals に記録する。
    """
    text_atoms: list[str] = []
    # (chunk_index, atom_index_in_chunk) — 原子単位の出所を記録
    origin: list[tuple[int, int]] = []
    for ci, (kind, body) in enumerate(chunks):
        if kind == "tag":
            continue
        for ai, atom in enumerate(atoms(body)):
            text_atoms.append(atom)
            origin.append((ci, ai))
    width = line_width(text_atoms)
    if width <= SAFE_COLS:
        return "".join(body for _, body in chunks)
    marks = break_before(text_atoms, states, lang)
    hard_marks = forced_breaks(text_atoms, states, marks, lang)
    hard_bounds = [0] + sorted(hard_marks) + [len(text_atoms)]
    max_segment = max(
        line_width(text_atoms[b1:b2])
        for b1, b2 in zip(hard_bounds, hard_bounds[1:])
    )
    pct = min(100, int(SAFE_COLS * 100 / max_segment))
    if pct < SHRINK_MIN_PCT and lang in JS_LANGS and all(
        state == "jsx-text" for state in states
    ):
        # JSX 本文だけの行では、元の改行に続く字下げは表示値に含まれない。
        # 本文中へ改行を足すと空白が増えるため、8pt未満になる場合だけ字下げを除く。
        indent = 0
        while indent < len(text_atoms) and atom_char(text_atoms[indent]) in {" ", "\t"}:
            indent += 1
        content_width = line_width(text_atoms[indent:])
        if indent and content_width and int(SAFE_COLS * 100 / content_width) >= SHRINK_MIN_PCT:
            remaining = indent
            trimmed: list[tuple[str, str]] = []
            for kind, body in chunks:
                if kind == "tag":
                    trimmed.append((kind, body))
                    continue
                body_atoms = atoms(body)
                removed = min(remaining, len(body_atoms))
                remaining -= removed
                trimmed.append((kind, "".join(body_atoms[removed:])))
            return _emit_line(trimmed, states[indent:], residuals, lang)
    if pct < SHRINK_MIN_PCT:
        residuals.append(
            "".join(atom_char(a) for a in text_atoms)[:80]
        )
    # renderer が危険な候補を選ばないよう、選んだ強制境界だけを出力する。
    insert_at: dict[int, set[int]] = {}
    for idx in hard_marks:
        ci, ai = origin[idx]
        insert_at.setdefault(ci, set()).add(ai)
    out: list[str] = []
    for ci, (kind, body) in enumerate(chunks):
        if kind == "tag" or ci not in insert_at:
            out.append(body)
            continue
        piece_atoms = atoms(body)
        forced_in_piece = insert_at[ci]
        rebuilt = "".join(
            (f'<br class="{FORCE_BREAK_CLASS}">' if ai in forced_in_piece else "")
            + atom
            for ai, atom in enumerate(piece_atoms)
        )
        out.append(rebuilt)
    joined = "".join(out)
    if pct < 100:
        code_open = re.search(r"<code\b[^>]*>", joined, re.IGNORECASE)
        code_close = joined.lower().rfind("</code>")
        start = code_open.end() if code_open else 0
        end = code_close if code_close >= start else len(joined)
        return (
            joined[:start]
            + f'<span class="{SHRINK_CLASS}" style="font-size:{pct}%">'
            + joined[start:end]
            + "</span>"
            + joined[end:]
        )
    return joined


def _balance_multiline_spans(inner: str) -> tuple[str, bool]:
    """改行を跨ぐPrism spanを行境界で閉じて開き直す。"""
    out: list[str] = []
    open_spans: list[str] = []
    changed = False
    pos = 0

    def append_text(text: str) -> None:
        nonlocal changed
        segments = text.split("\n")
        for index, segment in enumerate(segments):
            out.append(segment)
            if index == len(segments) - 1:
                continue
            if open_spans:
                changed = True
                out.extend("</span>" for _ in reversed(open_spans))
            out.append("\n")
            out.extend(open_spans)

    for match in TAG_RE.finditer(inner):
        append_text(inner[pos:match.start()])
        tag = match.group(0)
        lowered = tag.lower()
        out.append(tag)
        if re.match(r"<span\b", lowered) and not lowered.rstrip().endswith("/>"):
            open_spans.append(tag)
        elif lowered == "</span>" and open_spans:
            open_spans.pop()
        pos = match.end()
    append_text(inner[pos:])
    return "".join(out), changed


def rewrite_pre_inner(
    inner: str, lang: str, residuals: list[str], spans_balanced: bool = False
) -> str:
    """<pre> 内を論理行に切り、長い行だけ _emit_line で処理する。"""
    chunks: list[tuple[str, str]] = []  # ("tag"|"text", 断片)
    pos = 0
    for match in TAG_RE.finditer(inner):
        if match.start() > pos:
            chunks.append(("text", inner[pos:match.start()]))
        chunks.append(("tag", match.group(0)))
        pos = match.end()
    if pos < len(inner):
        chunks.append(("text", inner[pos:]))

    # 論理行の境界 = テキスト断片中の改行。行ごとに chunks の部分列を組み立てる
    lines: list[list[tuple[str, str]]] = []
    current: list[tuple[str, str]] = []
    for kind, body in chunks:
        if kind == "tag" or "\n" not in body:
            current.append((kind, body))
            continue
        segments = body.split("\n")
        for i, segment in enumerate(segments):
            if segment:
                current.append(("text", segment))
            if i < len(segments) - 1:
                lines.append(current)
                current = []
    if current:
        lines.append(current)

    # 状態はブロック全体で先に分類する（複数行JSXタグの className 等を
    # 正しく「属性値の中」と判定するために、タグ状態を行を跨いで引き継ぐ）
    lines_atoms = [
        [atom for kind, body in line if kind != "tag" for atom in atoms(body)]
        for line in lines
    ]

    # .env は実改行がレコード境界なので強制改行できない。行ごとに異なる
    # font-size を付けたPDFはChromeのコピーで隣接行が結合した実測があるため、
    # env/dotenv だけは最長行に合わせてコードブロック全体を同率で縮小する。
    if lang in BLOCK_UNIFORM_LANGS and lines_atoms:
        widest = max(lines_atoms, key=line_width)
        max_width = line_width(widest)
        pct = min(100, int(SAFE_COLS * 100 / max_width))
        if pct < SHRINK_MIN_PCT:
            residuals.append("".join(atom_char(a) for a in widest)[:80])
            return inner
        if pct < 100:
            code_open = re.search(r"<code\b[^>]*>", inner, re.IGNORECASE)
            code_close = inner.lower().rfind("</code>")
            start = code_open.end() if code_open else 0
            end = code_close if code_close >= start else len(inner)
            return (
                inner[:start]
                + f'<span class="{SHRINK_CLASS} {BLOCK_SHRINK_CLASS}" '
                  f'style="font-size:{pct}%">'
                + inner[start:end]
                + "</span>"
                + inner[end:]
            )
        return inner

    states_per_line = classify_block(lines_atoms, lang)

    line_residuals: list[str] = []
    out: list[str] = []
    for line, states in zip(lines, states_per_line):
        out.append(_emit_line(line, states, line_residuals, lang))
        out.append("\n")
    if out:
        out.pop()  # 最終行の改行を除く
    rendered = "".join(out)
    if not spans_balanced and f'class="{SHRINK_CLASS}"' in rendered:
        balanced, changed = _balance_multiline_spans(inner)
        if changed:
            return rewrite_pre_inner(balanced, lang, residuals, spans_balanced=True)
    residuals.extend(line_residuals)
    return rendered


LANG_RE = re.compile(r"language-([a-zA-Z0-9]+)")


def wrap_code_in_html(html_text: str, residuals: list[str] | None = None) -> str:
    """HTML全体の <pre> を走査して安全な折返しを入れた文字列を返す。

    residuals にリストを渡すと、縮小でも救えない行が記録される。
    """
    if residuals is None:
        residuals = []

    def repl(match: re.Match[str]) -> str:
        block = match.group(0)
        open_end = block.index(">") + 1
        open_tag = block[:open_end]
        lang_m = LANG_RE.search(open_tag)
        lang = lang_m.group(1).lower() if lang_m else ""
        inner = block[open_end:-len("</pre>")]
        return open_tag + rewrite_pre_inner(inner, lang, residuals) + "</pre>"
    return PRE_RE.sub(repl, html_text)


def unsafe_runs(html_text: str) -> list[str]:
    """強制改行間の表示桁が SAFE_COLS を超える論理行を返す（検査用）。

    Vivliostyle の break-all は <wbr> を無視して語中で折り得るため、<wbr> は
    境界として数えない。cw-force または元の論理改行だけを境界として扱う。
    フォント縮小（cw-shrink）で1行に収めた行は意図的に無折れなので除外する。
    """
    bad: list[str] = []
    for match in PRE_RE.finditer(html_text):
        block = match.group(0)
        if BLOCK_SHRINK_CLASS in block:
            continue
        inner = block[block.index(">") + 1:-len("</pre>")]
        # 強制改行だけを境界として論理行を切る。<wbr> は取り除く。
        inner = re.sub(
            rf'<br class="{FORCE_BREAK_CLASS}">', "\u0000", inner
        ).replace("<wbr>", "")
        for raw_line in inner.split("\n"):
            if SHRINK_CLASS in raw_line:
                continue
            text = TAG_RE.sub("", raw_line)
            text = text.replace("&amp;", "&").replace("&#x27;", "'")
            for entity in ENTITY_RE.findall(text):
                text = text.replace(entity, "x", 1)
            for run in text.split("\u0000"):
                if sum(char_width(c) for c in run) > SAFE_COLS:
                    bad.append(text.strip()[:80])
                    break
    return bad
