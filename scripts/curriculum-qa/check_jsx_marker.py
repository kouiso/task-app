#!/usr/bin/env python3
"""JSX の子要素の位置に `//` 形式の目印が残っていないかを見る。

`//` は JavaScript のコメントだが、JSX の子要素の位置に置くとコメントにならず、
画面に文字としてそのまま出る。型検査もビルドも通るので、書いた側にも読者にも
見えない。通し実行では、ログイン画面5箇所、登録画面4箇所、ダッシュボード6箇所で
目印の文字が表示されていた。

一度直しても、次に写経ブロックを足したときに同じ形が戻る。目で見て直す限り、
言語表記が `tsx` でないブロック（`typescript` と書かれた JSX 断片）を取り落とす。
実際に1度目の修正はそこで328行を見落とした。だから機械で見る。

判定は言語表記ではなく中身で行う。フェンス内の最初の実体行が `<` で始まれば
JSX の要素、`{式` で始まれば JSX の埋め込みで、どちらも子要素の位置になる。
素の `{` だけの行はオブジェクトリテラルの開始なので対象外にする。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from curriculum_blocks import _split_target, filepath_value, first_filepath_match
from markdown_scan import code_blocks

# JSX を書きうる言語表記。ここに無い表記（bash, json 等）は最初から対象外。
JSX_LANGS = {"tsx", "jsx", "typescript", "javascript", "ts", "js"}
SLASH = re.compile(r"^(\s*)//\s?(.*?)\s*$")
# コードの行。JSX の記号を含むか、式の途中で終わるか、JS の語で始まるもの。
# ここに当たらない行だけを「画面に出る文字」とみなす。数え方を反転させているのは、
# 文字の側を列挙すると `Welcome (back)` のような普通の句読点で漏れるためである。
CODE_LINE = re.compile(
    r"[=<>{}]"
    # オブジェクトの項目。末尾のカンマは省けるので、キーの形で見る。
    r"|^\s*[A-Za-z_$][\w$]*\s*:"
    # 引数や配列の要素。識別子だけの行にカンマが付く形。
    r"|^\s*[A-Za-z_$][\w$.]*\s*,\s*$"
    # 式が続く合図。行末のカンマやセミコロンは、文字の側にも出る（`Welcome&nbsp;`）ので見ない。
    r"|\(\s*$"
    # 関数呼び出し。`refetchRequiredData();` は onClick の中に続く JS の文で、
    # `//` が正しいコメントになる。`(` が識別子に直結する形だけを見るので、
    # `Welcome (back)` のような空白を挟んだ文字の行には当たらない。
    r"|^\s*[A-Za-z_$][\w$.]*\("
    r"|^\s*(?:return|if|else|for|while|switch|case|default|const|let|var|function"
    r"|export|import|await|async|try|catch|finally|throw|new|delete|typeof)\b"
    r"|^\s*[)\]}]"
)
# 自分で閉じるタグは開きっぱなしにならない。数えると外側の閉じタグと
# 対応してしまい、開いていない閉じタグを見落とす。
OPEN_TAG = re.compile(r"<([A-Za-z][\w.]*)(?![^>]*/>)")
SELF_CLOSING = re.compile(r"<([A-Za-z][\w.]*)[^>]*/>")
# 断片の短縮形 `</>` も閉じタグである。名前が無いので別に拾う。
CLOSE_TAG = re.compile(r"</([A-Za-z][\w.]*)?\s*>")
# 教材で実際に分割されている JSX 三項演算子の形。文字列や別の波括弧を含む行は
# 式の開始だと推測せず、誤検知を残す側へ倒す。
TERNARY_OPEN = re.compile(
    r"^\s*(?:"
    r"\{(?![/*])"
    r"|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*<[A-Za-z][\w.]*>\{"
    r")[^{}\"'`]+\?[^{}\"'`]*\(\s*$"
)
TERNARY_ELSE_OPEN = re.compile(r"^\s*\)\s*:\s*\(\s*$")
TERNARY_CLOSE = re.compile(r"^\s*\)\}\s*[,;]?\s*$")
JSX_COMMENT = re.compile(r"^\s*\{/\*.*\*/\}\s*$")


def block_target(body: list[tuple[int, str]]) -> str | None:
    """filepath の末尾注記を除いた、写経先の同一性を返す。"""
    match = first_filepath_match("\n".join(line for _, line in body))
    if match is None:
        return None
    return _split_target(filepath_value(match))[0]


def opens_ternary_else(lang: str, body: list[tuple[int, str]]) -> bool:
    """ブロック末尾が、JSX 内の三項演算子の else 式を開いた状態か。"""
    if lang not in JSX_LANGS:
        return False

    lines = [line for _, line in body if line.strip()]
    if not lines or not TERNARY_ELSE_OPEN.match(lines[-1]):
        return False

    # filepath と完成版の目印を除いた最初の実体行だけを式の開始として認める。
    # 後続行まで検索すると、JS コメントや JSX の画面文字にある同じ記号列を
    # JavaScript 式だと誤認してしまう。
    first = 0
    while first < len(lines) - 1 and (
        SLASH.match(lines[first]) or JSX_COMMENT.match(lines[first])
    ):
        first += 1
    if not TERNARY_OPEN.match(lines[first]):
        return False

    return not any(TERNARY_CLOSE.match(line) for line in lines[first + 1 : -1])


def find_violations(root: Path) -> tuple[list[tuple[str, int, str]], int]:
    hits: list[tuple[str, int, str]] = []
    scanned = 0

    for path in sorted(root.rglob("*.md")):
        previous: tuple[str, list[tuple[int, str]], str | None] | None = None
        for lang, body in code_blocks(path.read_text(encoding="utf-8")):
            target = block_target(body)
            if lang not in JSX_LANGS:
                previous = (lang, body, target)
                continue

            scanned += 1
            lead: list[tuple[int, str]] = []
            k = 0
            while k < len(body) and (
                body[k][1].strip() == "" or SLASH.match(body[k][1])
            ):
                if body[k][1].strip():
                    lead.append(body[k])
                k += 1

            first = body[k][1].strip() if k < len(body) else ""
            # 画面に出る文字が続く形。`<p>` の途中から始まる続きのブロックは、
            # 最初の行が要素でも埋め込みでもなく、ただの文字になる。閉じタグが
            # 数行のうちに来ることを合図にする。ここを見ないと、day01 の
            # 「Day 02 では〜」のように文字で始まる続きブロックを取り落とす。
            # 最初の行がコードでないなら、画面に出る文字かもしれない。
            # 確定させるのは、そのブロックの中に「開いていないのに閉じるタグ」が
            # あるとき。開いていない閉じタグは、ブロックの外で開いた要素の中に
            # 自分がいることの証拠になる。行数の窓では、閉じタグが遠い断片を
            # 取り落とす（codex 指摘）ので、ブロック全体を走る。
            text_child = False
            if k < len(body) and not CODE_LINE.search(body[k][1]):
                opened: list[str] = []
                for _, line in body[k:]:
                    selfclosed = set(SELF_CLOSING.findall(line))
                    if re.search(r"<>", line):
                        opened.append("<>")
                    for name in OPEN_TAG.findall(line):
                        if name not in selfclosed:
                            opened.append(name)
                    for name in CLOSE_TAG.findall(line):
                        key = name or "<>"
                        if key in opened:
                            opened.remove(key)
                        else:
                            text_child = True
                            break
                    if text_child:
                        break

            in_jsx = (
                first.startswith("<")
                or (first.startswith("{") and first != "{")
                or text_child
            )
            continues_expression = (
                previous is not None
                and target is not None
                and previous[2] == target
                and opens_ternary_else(previous[0], previous[1])
            )
            if in_jsx and not continues_expression:
                for lineno, line in lead:
                    hits.append((str(path.relative_to(root)), lineno, line.strip()))

            previous = (lang, body, target)

    return hits, scanned


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]
    if len(args) != 1 or not Path(args[0]).is_dir():
        print("❌ 教材ディレクトリを1つ指定してください", file=sys.stderr)
        return 2
    root = Path(args[0])

    hits, scanned = find_violations(root)
    if scanned == 0:
        print(f"❌ コードブロックがありません: {root}", file=sys.stderr)
        return 2

    if hits:
        print(f"❌ JSX の位置に `//` の目印が {len(hits)} 行残っています")
        for name, line, text in hits:
            print(f"  {name}:{line}: {text}")
        print("  `{/* ... */}` に変えてください。そのままだと画面に文字として出ます。")
        return 1

    print(f"✅ JSX の位置の目印 OK（コードブロック {scanned} 個）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
