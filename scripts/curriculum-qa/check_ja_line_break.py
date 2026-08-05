#!/usr/bin/env python3
"""画面に出る日本語の文が、JSX の中で途中改行されていないかを見る。

JSX は要素の中の改行とインデントを、半角スペース1個に畳んでから描画する。
そのため日本語の文を途中で折り返すと、画面には文の途中に空白が1つ入る。
Day 21 の「プロジェクトの進捗とタスクの 状況を確認できます。」がこれで、
通し実行の実測で見つかった。

教材はコードの行幅を狭く保つために折り返す。その折り返しが、コードでは無害でも
日本語の文では欠陥になる。書いた側の画面では改行に見えるので、目では気づけない。

判定は「画面に出る文字だけ」に絞る。ASCII の記号を1つも含まない行だけを対象にすると、
コメントや式やオブジェクトの値が外れる。この絞り方に至るまで、広い条件では115件、
中間の条件では73件の誤検出が出た。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from markdown_scan import code_blocks

JSX_LANGS = {"tsx", "jsx", "typescript", "javascript", "ts", "js"}
# 画面に出る文字の行かどうか。日本語を含み、かつコードにしか出ない記号を含まない行に限る。
#
# 「ASCII を1つも含まない」で絞ると、半角数字を含む文を丸ごと取り落とす。
# 実例: day25 の「8文字以上で、大文字・小文字・数字・」は、8 と 1 があるだけで
# 検査をすり抜けていた。数字は画面に出る文にごく普通に現れるので、除外の根拠にできない。
# 代わりに、コードにしか出ない記号の有無で分ける。
# さらに、行にタグや記号が1つでもあると外していたのも狭すぎた。
# 実例: `<p>プロジェクトが` は `<p>` があるだけで、
# `` `Hello Task-App` から、`` は逆クォートとハイフンがあるだけで外れていた。
# どちらも画面に出る文で、次の行との間に空白が入る。
# タグと埋め込みを先に取り除いてから、残った文字を見る。
JA = re.compile(r"[ぁ-んァ-ヶ一-龥]")
TAG = re.compile(r"<[^<>]*>")
EXPR = re.compile(r"\{[^{}]*\}")
# 取り除いたあとに残ってはいけない記号。式・呼び出し・文字列・コメントの目印だけを挙げる。
# 逆クォート・ハイフン・句点は画面に出る文にも普通に現れるので、ここには入れない。
CODE_CHAR = re.compile(r"""[=;()'":,$|&<>{}\[\]\\_]""")
# スラッシュは `/dashboard` のように画面に出る文へ普通に現れるので、
# 記号そのものでは弾かない。代わりにコメントの形だけを外す。
COMMENT = re.compile(r"^\s*(//|/\*|\*)")
# 文の切れ目。ここで終わっていれば、次の行は別の文なので折り返しではない。
# 読点（、）と中黒（・）は文を終わらせない。「一つ目、」の次の行は同じ文の続きで、
# 画面では「一つ目、 二つ目」と空白が入る。だから切れ目に数えない。
# 閉じかっこ（」』）) は文を終わらせない。「管理者」の次の行が
# 「を選択してください。」なら同じ文の続きで、画面では空白が入る。
SENTENCE_END = re.compile(r"[。！？]$")
# 要素の始まりの行。これが1行も無いブロックは JSX ではない。
ELEMENT_HEAD = re.compile(r"^\s*</?[A-Za-z]")


def screen_text(line: str) -> str:
    """行からタグと埋め込みを取り除き、画面に出る文字だけを返す。

    画面の文でなければ空文字を返す。
    """
    if COMMENT.match(line.strip()):
        return ""
    text = EXPR.sub("", TAG.sub("", line)).strip()
    if not JA.search(text) or CODE_CHAR.search(text) or "*/" in text:
        return ""
    return text


def find_violations(root: Path) -> tuple[list[tuple[str, int, str, str]], int]:
    hits: list[tuple[str, int, str, str]] = []
    scanned = 0

    for path in sorted(root.rglob("*.md")):
        for lang, body in code_blocks(path.read_text(encoding="utf-8")):
            # テンプレート文字列や複数行コメントの中の日本語を、JSX の子要素と
            # 取り違えないようにする。要素が1つも無いブロックは対象外。
            if lang not in JSX_LANGS:
                continue
            if not any(ELEMENT_HEAD.match(line) for _, line in body):
                continue

            scanned += 1
            for k in range(len(body) - 1):
                nk = k + 1
                while nk < len(body) and not body[nk][1].strip():
                    nk += 1
                if nk >= len(body):
                    break
                cur_raw = body[k][1].rstrip()
                nxt_raw = body[nk][1].lstrip()
                # 行の終わりで要素が閉じている、または次の行が要素で始まるなら、
                # 2つは別の要素であって1つの文の折り返しではない。
                # 例: <TableHead>ユーザー</TableHead> と <TableHead>メール…</TableHead>。
                if cur_raw.endswith(">") or nxt_raw.startswith("<"):
                    continue
                cur = screen_text(cur_raw)
                nxt = screen_text(nxt_raw)
                if cur and nxt and not SENTENCE_END.search(cur):
                    hits.append((str(path.relative_to(root)), body[k][0], cur, nxt))

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
        print(f"❌ 日本語の文が JSX の中で途中改行されている箇所が {len(hits)} 件あります")
        for name, line, cur, nxt in hits:
            print(f"  {name}:{line}: {cur} ⏎ {nxt}")
        print("  1行に繋いでください。そのままだと画面で文の途中に空白が入ります。")
        return 1

    print(f"✅ 日本語の文の折り返し OK（コードブロック {scanned} 個）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
