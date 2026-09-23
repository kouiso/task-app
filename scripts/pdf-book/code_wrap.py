"""vfm が出力した HTML の <pre> コード行へ、安全な位置へ実改行を挿入する。

Vivliostyle の行分割は行長しか見ない。word-break / overflow-wrap / text-wrap は
いずれも効かず、空白の有無に関係なく常に行長位置でトークンの途中でも切れる
（book.css の検証コメント参照）。<wbr> を挿入しても折れ位置は1桁も動かない
ことを @vivliostyle/cli@11.1.0 で実測した（同一行を <wbr> 有無で組版し、
折れ位置が完全一致）。つまり「折返し候補」を示す方法では位置を制御できない。

そこで、桁あふれする行だけを対象に、トークンの境界へ実改行を挿入して
折返しそのものをこちらで決める。挿入位置は「非英数字の並びの直後の英数字」
の手前。つまり `foo.bar` は `foo.` の後ろ、`(a, b)` は `(` `,` ` ` の各後ろ
で折れる。`flex-co` のような語の途中では折れない。
実改行はコピー時にそのまま改行として残るため、marks（コピーして壊れない
境界）から貪欲に選んだ位置だけに入れる。marks 全部に入れると過剰に折れる。

文字列リテラルの扱いはコピー可否で分ける。JSX の属性値（`attr="..."`）や
テンプレートリテラル・HTML属性は、途中に改行が入っても意味が変わらない
（属性値の改行は空白として畳まれる）ため、空白直後だけを折返し候補にする。
一方 `.env`・bash・CSS文字列・TSのプレーン文字列は、改行がそのまま構文を
壊す。これら「空白非許容」の文字列の内側には改行を入れず、外側の境界
だけで収まらない行は行ごとフォント縮小（cw-shrink）で1行に収める。

Prism の <span class="token"> は貫通して扱う。タグの間に改行が落ちても
HTML として問題ない。
"""

from __future__ import annotations

import re
import unicodedata

# 実測の折れ桁は65。それより短い行は触らない（実改行を増やさない）。
# 境界なしランの上限もこれで検査する。余裕はフォントの個体差ぶん。
SAFE_COLS = 58
# 英数字や記号だけの並びが SAFE_COLS を超える時、強制的に折る間隔。
FORCE_SEGMENT = 40
# 折返しの末尾断片の目標下限。これ未満だと `。"` のような端切れ行が出る
MIN_TAIL = 8
# 先頭断片の下限。`.` だけが1行に取り残される端切れを防ぐ
MIN_HEAD = 8

PRE_RE = re.compile(r"<pre\b[^>]*>.*?</pre>", re.DOTALL | re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]+>")
ENTITY_RE = re.compile(r"&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);")

ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

# トークン構成要素になりうる記号。これらの直後に改行を入れると、コピー時に
# 識別子・数値・URL・パス・セレクタが分断される（`noto-sans-jp`→`sans-\njp`、
# `page.tsx`→`page.\ntsx`、`1.5`→`1.\n5` 等）。区切り文字（`(` `,` `=` `{`
# `;` `+` 等）の直後はどの言語でも改行を空白として読めるので折ってよい。
GLUE_PUNCTS = "-._/:@#%$"

# 文字列リテラルの構文解析を行う言語。text/markdown は引用符を文字列と
# みなさない（文章中の引用符を誤認しないため）。
JS_LANGS = {"ts", "tsx", "typescript", "js", "javascript", "jsx"}
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

# `/` が除算ではなく正規表現リテラルの開始になる前置条件。
# 演算子・区切り・行頭の直後は式の先頭なので正規表現になる
REGEX_PREFIX_CHARS = set("([{,;:!&|?=*+-<>~^%")
# キーワードの直後も式の先頭（`return /re/`・`typeof /re/` 等）
REGEX_KEYWORDS = {
    "return", "typeof", "case", "in", "of", "new", "delete", "void",
    "instanceof", "throw", "yield", "await", "do", "else",
}

# 言語ごとの行コメント・ブロックコメント構文
SLASH_COMMENT_LANGS = JS_LANGS | {"prisma", "java", "go", "rust", "csharp"}
BLOCK_COMMENT_LANGS = SLASH_COMMENT_LANGS | {"css"}
HASH_COMMENT_LANGS = {
    "env", "dotenv", "bash", "sh", "shell", "yaml", "yml", "toml", "ini",
}
DASH_COMMENT_LANGS = {"sql"}

# 改行そのものが意味を持つ言語。行内のどこで折れてもペースト結果が壊れる
# ため、行内には一切改行を入れず、あふれる行はフォント縮小で収める。
LINE_ATOMIC_LANGS = {
    "bash", "sh", "shell", "env", "dotenv", "yaml", "yml", "toml", "ini",
    "dockerfile", "docker", "make", "makefile",
}

# 文字列の開始引用符の直前に改行を入れても構文が保たれる言語。
# `? 'AAA' : 'BBB'` のような長い三項演算子は `'AAA'` の直前で折れば
# 中身に触れずに収まる。prisma 等の行指向言語は除外する
STRICT_OPEN_BREAK_LANGS = JS_LANGS | MARKUP_LANGS | {"json", "css", "sql"}

# 縮小の絶対下限。pre の実効サイズは本文 12.75pt × 90% ≒ 11.5pt なので、
# 読める下限 8pt までは 70% まで縮められる。これ未満になる行は縮小を諦めて
# 残件として報告する（相対%ではなく絶対ptで決める: 教材のコードが読めない
# 小ささは出せない）
SHRINK_MIN_PT = 8.0
PRE_FONT_PT = 12.75 * 0.9
SHRINK_MIN_PCT = int(SHRINK_MIN_PT * 100 / PRE_FONT_PT) + 1  # ≒70
SHRINK_CLASS = "cw-shrink"


def char_width(char: str) -> int:
    """East Asian の W/F を2桁、その他を1桁として数える。"""
    return 2 if unicodedata.east_asian_width(char) in ("W", "F") else 1


def atoms(text: str) -> list[str]:
    """論理行を、実体参照を1文字と数えた原子単位の列に分ける。"""
    out: list[str] = []
    i = 0
    while i < len(text):
        entity = ENTITY_RE.match(text, i)
        if entity:
            out.append(entity.group(0))
            i = entity.end()
        else:
            out.append(text[i])
            i += 1
    return out


def atom_char(atom: str) -> str:
    """原子単位が表す1文字。実体参照は & < > " ' のみ対応すれば足りる。"""
    if atom.startswith("&#x"):
        return chr(int(atom[3:-1], 16))
    if atom.startswith("&#"):
        return chr(int(atom[2:-1], 10))
    return {"&amp;": "&", "&lt;": "<", "&gt;": ">",
            "&quot;": '"', "&#x27;": "'", "&apos;": "'"}.get(atom, atom)


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

    戻り値は行ごとの "out" / "tolerant" / "strict" の列。複数行にまたがる
    JSXタグ（`<div` と `className=` が別行）を扱うため、文字列・タグの
    状態は行を跨いで継続する。
    - JSX属性値（タグ内で `=` 直後の引用符）・バッククォート・HTMLの引用符は
      内側の改行が空白として扱われるため "tolerant"
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
    str_tol = False
    in_tag = False
    prev_sig = ""
    prev_atom_ch = ""
    comment_line = False
    comment_block = False
    regex_class = False  # 正規表現内の [...] 文字クラス
    regex_escape = False
    pending = ""  # "/" や "*" の直後に来る文字で意味が変わるもの
    for line_atoms in lines_atoms:
        states: list[str] = []
        comment_line = False
        pending = ""
        # 正規表現リテラルは行を跨げないので、行頭では閉じた扱いにする
        if stack and stack[-1] == "regex":
            stack.pop()
        regex_class = regex_escape = False
        chars = [atom_char(a) for a in line_atoms]

        def opens_regex(i: int) -> bool:
            """chars[i] == '/' が正規表現の開始か（除算か）を直前の文字で決める。"""
            j = i - 1
            while j >= 0 and chars[j].isspace():
                j -= 1
            if j < 0:
                return True
            pc = chars[j]
            if pc in REGEX_PREFIX_CHARS:
                return True
            if pc not in ALNUM + "_":
                return False
            k = j
            while k >= 0 and chars[k] in ALNUM + "_":
                k -= 1
            word = "".join(chars[k + 1 : j + 1])
            # `foo.return /x/` のようなメンバー名はキーワードではない
            return word in REGEX_KEYWORDS and (k < 0 or chars[k] != ".")

        for ai, atom in enumerate(line_atoms):
            ch = atom_char(atom)
            mode = stack[-1] if stack else "out"
            if comment_line:
                # // や # の行コメント：中で折れるとコピー時に尻尾がコード化する
                states.append("strict")
            elif mode == "regex":
                # 正規表現リテラル内。改行は構文エラーになるので内側は全部 strict
                if regex_escape:
                    regex_escape = False
                    states.append("strict")
                elif ch == "\\":
                    regex_escape = True
                    states.append("strict")
                elif regex_class:
                    if ch == "]":
                        regex_class = False
                    states.append("strict")
                elif ch == "[":
                    regex_class = True
                    states.append("strict")
                elif ch == "/":
                    # 閉じ `/` の直前で折ると改行がリテラル内に入るので strict
                    stack.pop()
                    states.append("strict")
                else:
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
                    if (
                        ch == "/"
                        and lang in JS_LANGS
                        and opens_regex(ai)
                        # `//` `/*` は常にコメント（pending 経由で次文字が決める）
                        and (ai + 1 >= len(chars) or chars[ai + 1] not in "/*")
                    ):
                        # 除算でなく正規表現の開始（`/[\nA-Z]/` は構文エラー
                        # なのでリテラル内には改行を入れられない）
                        stack.append("regex")
                        pending = ""
                        states.append("strict")
                        prev_sig = "/"
                        prev_atom_ch = ch
                        continue
                    elif ch == "{":
                        depth += 1
                    elif ch == "}":
                        if depth > 0:
                            depth -= 1
                        elif len(stack) > 1:
                            stack.pop()  # ${} のコード領域を閉じる
                    elif ch in "\"'" and (
                        prev_sig not in ALNUM + "_" or prev_atom_ch.isspace()
                    ):
                        stack.append("str:" + ch)
                        str_tol = lang in JS_LANGS and in_tag and prev_sig == "="
                    elif ch == "`" and lang in JS_LANGS:
                        stack.append("tpl")
                    elif ch == "#" and lang in HASH_COMMENT_LANGS:
                        comment_line = True
                        states.append("strict")
                        prev_sig = "#"
                        prev_atom_ch = ch
                        continue
                    elif lang in JS_LANGS:
                        if ch == "<":
                            in_tag = True
                        elif ch == ">":
                            in_tag = False
                    states.append("out")
            elif mode == "tpl":
                if ch == "`":
                    # 閉じ `` ` `` の直前で折ると改行がリテラル内に入るので strict
                    stack.pop()
                    states.append("strict")
                elif ch == "{" and prev_sig == "$":
                    stack.append("out")
                    depth = 0
                    states.append("out")
                else:
                    states.append("tolerant")
            else:  # str:X
                if ch == mode[-1]:
                    # 閉じ引用符の直前で折ると改行がリテラル内に入るので strict
                    stack.pop()
                    states.append("strict")
                else:
                    states.append("tolerant" if str_tol else "strict")
            if not ch.isspace():
                prev_sig = ch
            prev_atom_ch = ch
        result.append(states)
    return result


def break_before(
    text_atoms: list[str], states: list[str], lang: str = ""
) -> set[int]:
    """折返し位置にできる原子単位の添字集合（その添字の直前で折れる）。

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
        if state == "strict":
            # strict ランの開始がリテラル境界そのもの（正規表現の `/` 等）
            # ならその直前で折れる。直前が out の引用符なら文字列本体の
            # 先頭なので折らない（折り点は引用符の手前側で別途立てる）。
            # tolerant→strict の遷移（閉じ引用符・閉じバッククォート）は
            # リテラル内に改行が入るので対象外
            return (
                states[i - 1] == "out"
                and atom_char(text_atoms[i - 1]) not in "\"'"
                and lang in STRICT_OPEN_BREAK_LANGS
                and not asi_hazard(i)
            )
        if state == "comment":
            # ブロックコメント内は改行してもコメントのまま。空白直後とCJK直後に
            # 限る（CJKは日本語組版と同じく文字間で折れる）
            prev = atom_char(text_atoms[i - 1])
            return prev == " " or prev_kind == "WIDE"
        if state == "tolerant":
            # JSX属性値・テンプレート本文は空白直後だけ（コピー時に
            # 空白1つ分の差に留まる。CJK途中は値が変わるので入れない）
            return atom_char(text_atoms[i - 1]) == " "
        if (
            atom_char(text_atoms[i]) in "\"'"
            and i + 1 < len(text_atoms)
            and states[i + 1] in ("strict", "tolerant")
        ):
            # 開始引用符の直前で折れる（`? 'AAA'` → `'` の手前）。引用符の
            # 状態自体は out だが次が文字列本体なので、この引用符が文字列を
            # 開く位置と分かる。ASI 危険語の直後は `return\n'x'` が
            # `return; 'x'` になるため除く
            return lang in STRICT_OPEN_BREAK_LANGS and not asi_hazard(i)
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


def _emit_line(
    chunks: list[tuple[str, str]],
    states: list[str],
    residuals: list[str],
    lang: str = "",
) -> str:
    """(断片, その断片中の論理文字列) の列を、必要なら改行入りで結合する。

    断片はタグまたはテキスト。テキスト断片の論理文字は実体参照を1原子として
    持つ。行全体の表示桁が SAFE_COLS 以下なら無変換で結合して返す。
    states は classify_block がその行に付けた out/tolerant/strict の列。

    Vivliostyle は <wbr> も word-break も無視して行長だけで語を割る
    （<wbr> 有無で折れ位置が一致することを実測）。そのため折返し候補を
    示すのではなく、候補の中から貪欲に選んだ位置へ実改行を入れて
    折返しを強制する。改行位置は marks（コピーしても壊れない境界）に
    限るため、verify_pdf_copy の照合規則と一致する。
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
    # 折返し候補で区切った各区間が SAFE_COLS に収まるか検査する
    bounds = [0] + sorted(marks) + [len(text_atoms)]
    feasible = all(
        sum(char_width(atom_char(a)) for a in text_atoms[b1:b2]) <= SAFE_COLS
        for b1, b2 in zip(bounds, bounds[1:])
    )
    if not feasible:
        pct = int(SAFE_COLS * 100 / width)
        if pct >= SHRINK_MIN_PCT:
            joined = "".join(body for _, body in chunks)
            return (
                f'<span class="{SHRINK_CLASS}" style="font-size:{pct}%">'
                f"{joined}</span>"
            )
        residuals.append(
            "".join(atom_char(a) for a in text_atoms)[:80]
        )
        return "".join(body for _, body in chunks)
    # marks 全部に改行を入れると過剰に折れる。左から詰めて SAFE_COLS を
    # 超える直前の、最も右の候補でだけ折る（貪欲な行分割）
    # 先頭が MIN_HEAD 桁未満になる候補は `.` だけの端切れ行を生むので、
    # 最初の折り点には使えない（後続ピースの起点より前にあり使われない）。
    # 判定はインデントを除いた実質幅で行う（空白だけでは中身にならない）
    head_base = 0
    while (
        head_base < len(text_atoms)
        and atom_char(text_atoms[head_base]).isspace()
    ):
        head_base += 1
    marks = {
        m
        for m in marks
        if sum(
            char_width(atom_char(a)) for a in text_atoms[head_base:m]
        ) >= MIN_HEAD
    }
    splits: list[int] = []
    piece_start = 0
    pending: int | None = None
    infeasible = False
    for m in sorted(marks):
        w = sum(char_width(atom_char(a)) for a in text_atoms[piece_start:m])
        if w <= SAFE_COLS:
            pending = m
            continue
        if pending is None:
            infeasible = True
            break
        splits.append(pending)
        piece_start = pending
        w = sum(char_width(atom_char(a)) for a in text_atoms[piece_start:m])
        pending = m if w <= SAFE_COLS else None
        if pending is None:
            infeasible = True
            break
    if not infeasible and sum(
        char_width(atom_char(a)) for a in text_atoms[piece_start:]
    ) > SAFE_COLS:
        if pending is None:
            infeasible = True
        else:
            splits.append(pending)
    # 端切れ対策。貪欲に詰めると末尾が1〜2桁だけの行になる（`。` や `");` が
    # 単独行に取り残される）。marks の範囲で直前の折り点を左へずらし、
    # 末尾を MIN_TAIL 桁以上に太らせる。ずらせる候補が無い時はそのままに
    # する（コピーは安全なまま。見た目の問題だけが残る）
    ordered = sorted(marks)
    while splits:
        last = splits[-1]
        tail_w = sum(char_width(atom_char(a)) for a in text_atoms[last:])
        if tail_w >= MIN_TAIL:
            break
        prev = splits[-2] if len(splits) >= 2 else 0
        cand = [
            m
            for m in ordered
            if prev < m < last
            and MIN_TAIL
            <= sum(char_width(atom_char(a)) for a in text_atoms[m:])
            <= SAFE_COLS
        ]
        if not cand:
            break
        splits[-1] = cand[-1]
    if infeasible:
        # feasible 検査を通る限り到達しないが、仮に選定に失敗した場合も
        # 語の途中折れを出すくらいなら残件として止める（fail-closed）
        pct = int(SAFE_COLS * 100 / width)
        if pct >= SHRINK_MIN_PCT:
            joined = "".join(body for _, body in chunks)
            return (
                f'<span class="{SHRINK_CLASS}" style="font-size:{pct}%">'
                f"{joined}</span>"
            )
        residuals.append(
            "".join(atom_char(a) for a in text_atoms)[:80]
        )
        return "".join(body for _, body in chunks)
    # 各テキスト断片内で、どの原子の直前に改行を入れるか
    insert_at: dict[int, set[int]] = {}
    for idx in splits:
        ci, ai = origin[idx]
        insert_at.setdefault(ci, set()).add(ai)
    out: list[str] = []
    for ci, (kind, body) in enumerate(chunks):
        if kind == "tag" or ci not in insert_at:
            out.append(body)
            continue
        piece_atoms = atoms(body)
        marks_in_piece = insert_at[ci]
        rebuilt = "".join(
            ("\n" if ai in marks_in_piece else "") + atom
            for ai, atom in enumerate(piece_atoms)
        )
        out.append(rebuilt)
    return "".join(out)


def rewrite_pre_inner(inner: str, lang: str, residuals: list[str]) -> str:
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
    states_per_line = classify_block(lines_atoms, lang)

    out: list[str] = []
    for line, states in zip(lines, states_per_line):
        out.append(_emit_line(line, states, residuals, lang))
        out.append("\n")
    if out:
        out.pop()  # 最終行の改行を除く
    return "".join(out)


LANG_RE = re.compile(r"language-([a-zA-Z0-9]+)")


def wrap_code_in_html(html_text: str, residuals: list[str] | None = None) -> str:
    """HTML全体の <pre> を走査して実改行を挿入した文字列を返す。

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
    """折返し候補の無い表示桁が SAFE_COLS を超える論理行を返す（検査用）。

    改行挿入後のHTMLに対して使い、空なら「語の途中折れが起き得ない」ことを
    保証する。起き得る行が残っていればその内容を返す。
    フォント縮小（cw-shrink）で1行に収めた行は意図的に無折れなので除外する。
    """
    bad: list[str] = []
    for match in PRE_RE.finditer(html_text):
        block = match.group(0)
        inner = block[block.index(">") + 1:-len("</pre>")]
        # 折り返し位置として論理行を切り、残った最長ランを見る
        inner = inner.replace("<wbr>", "\u0000")
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
