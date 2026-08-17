#!/usr/bin/env python3
"""check_pdf_book の退行テスト。

この検査の怖いところは、誤検出も見逃しも「PDFは出来ている」状態で起きることにある。
境界を固定しておかないと、閾値をいじった拍子にどちらかへ倒れて気づけない。

特に押さえるのは次の3点。
  - 空白ページの判定は、柱とノンブルを引いてから見る。引かないと1件も見つからない。
  - mermaid の漏れは語彙で拾わない。教材の地の文には「グラフ」も「フロー」も出る。
  - コード行の欠けは、折り返しで入った改行を無視して突き合わせる。
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_pdf_book import ToolFailure  # noqa: E402
from check_pdf_book import (  # noqa: E402
    find_blank_pages,
    find_font_problems,
    find_furniture_problems,
    find_mermaid_leaks,
    find_toc_problems,
    find_truncated_code,
    page_residue,
    parse_font_table,
    run_tool,
)

HEADER = "Day 01: 開発環境を整えて、初めてのアプリを動かそう"

# (説明, ページ本文の並び, 期待する空白ページ番号)
BLANK_CASES: list[tuple[str, list[str], list[int]]] = [
    ("表紙は対象外", ["task-app\nDay 01\n", f"{HEADER}\n本文\n2\n"], []),
    ("柱とノンブルだけのページは空白",
     ["表紙", f"{HEADER}\n本文\n2\n", f"{HEADER}\n\n3\n"], [3]),
    ("図のキャプションだけでも中身あり",
     ["表紙", f"{HEADER}\n図 1: 構成\n2\n"], []),
    ("空白が連続しても全部拾う",
     ["表紙", f"{HEADER}\n2\n", f"{HEADER}\n3\n"], [2, 3]),
]

# (説明, ページ本文の並び, 期待する漏れページ番号)
MERMAID_CASES: list[tuple[str, list[str], list[int]]] = [
    ("flowchart の原文は漏れ", ["表紙", "flowchart TD\n  A --> B\n"], [2]),
    ("graph LR の原文は漏れ", ["表紙", "graph LR\n  A --> B\n"], [2]),
    ("sequenceDiagram の原文は漏れ", ["表紙", "sequenceDiagram\n  A->>B: x\n"], [2]),
    ("地の文の「グラフ」は漏れではない",
     ["表紙", "ここでグラフを表示します。棒グラフが基本です。"], []),
    ("地の文の「フロー」は漏れではない",
     ["表紙", "ログインのフローを図で確認します。"], []),
    ("方向指定の無い graph は漏れではない",
     ["表紙", "graph という語が単体で出ることもある"], []),
]

# (説明, pdffonts の行, 期待する問題の件数)
FONT_CASES: list[tuple[str, list[tuple[str, str, str]], int]] = [
    ("許可した書体だけなら問題なし",
     [("AAAAAA+BIZUDPGothic-Regular", "CID TrueType", "yes"),
      ("BBBBBB+JetBrainsMono-Bold", "CID TrueType", "yes")], 0),
    ("中国語フォントの混入は問題",
     [("CCCCCC+WenQuanYiZenHei", "CID TrueType", "yes")], 1),
    ("生成機械の書体の混入も問題",
     [("DDDDDD+LiberationSans", "CID TrueType", "yes")], 1),
    ("Type 3 は許可書体でも問題",
     [("AAAAAA+BIZUDPGothic-Regular", "Type 3", "yes")], 1),
    ("未埋め込みは問題",
     [("AAAAAA+BIZUDPGothic-Regular", "CID TrueType", "no")], 1),
    ("同じ書体が何度出ても1件にまとめる",
     [("EEEEEE+NotoSansCJKjp", "CID TrueType", "yes"),
      ("EEEEEE+NotoSansCJKjp", "CID TrueType", "yes")], 1),
]

TOC_HEADINGS = ["この日でできること", "今日のゴール"]

# (説明, ページ本文の並び, 総ページ数, 見出し, 期待する問題の件数)
TOC_CASES: list[tuple[str, list[str], int, list[str], int]] = [
    ("番号が解決できていれば問題なし",
     ["表紙", "目次\nこの日でできること .... 3\n今日のゴール .... 8\n", "本文"],
     40, TOC_HEADINGS, 0),
    ("target-counter が 0 に落ちたら問題",
     ["表紙", "目次\nこの日でできること .... 0\n今日のゴール .... 8\n", "本文"],
     40, TOC_HEADINGS, 1),
    ("総ページ数を超える番号は問題",
     ["表紙", "目次\nこの日でできること .... 99\n今日のゴール .... 8\n", "本文"],
     40, TOC_HEADINGS, 1),
    ("見出しが目次に出ていなければ問題",
     ["表紙", "目次\nこの日でできること .... 3\n", "本文"], 40, TOC_HEADINGS, 1),
    ("目次が2ページに渡っても拾う",
     ["表紙", "目次\nこの日でできること .... 4\n", "今日のゴール .... 6\n", "本文"],
     40, TOC_HEADINGS, 0),
    ("目次の後ろの地の文は目次として読まない",
     ["表紙", "目次\nこの日でできること .... 3\n今日のゴール .... 8\n",
      "本文にも ... 3 のような行が出ることがある"], 40, TOC_HEADINGS, 0),
    ("長い見出しが折り返されて番号が2行目に回っても見落とさない",
     ["表紙",
      "目次\nこの日でできること .... 3\n今日のゴールというとても長い見出しでここで折り返す\n"
      "                                                    .... 8\n", "本文"],
     40, ["この日でできること", "今日のゴールというとても長い見出しでここで折り返す"], 0),
    ("行内マークダウンの記号は照合で無視する",
     ["表紙", "目次\nnpm run dev で起動する .... 3\n今日のゴール .... 8\n", "本文"],
     40, ["`npm run dev` で起動する", "今日のゴール"], 0),
]

LONG_LINE = (
    '<div className="overflow-hidden rounded-[28px] border border-border '
    'bg-card shadow-md transition-transform duration-200">'
)

# (説明, 原稿, PDFの本文, 期待する欠け件数)
CODE_CASES: list[tuple[str, str, str, int]] = [
    ("折り返されていても全文あれば欠けなし",
     f"```tsx\n{LONG_LINE}\n```\n",
     f"{LONG_LINE[:60]}\n{LONG_LINE[60:]}\n", 0),
    ("末尾が消えていれば欠け",
     f"```tsx\n{LONG_LINE}\n```\n", LONG_LINE[:60], 1),
    ("短い行は対象外",
     "```tsx\n<div>短い</div>\n```\n", "", 0),
    ("mermaid は図になるので対象外",
     "```mermaid\nflowchart TD\n  " + "A" * 100 + "\n```\n", "", 0),
]

# (説明, ページ本文の並び, 期待する問題の件数)
FURNITURE_CASES: list[tuple[str, list[str], int]] = [
    ("柱とノンブルが揃っていれば問題なし",
     ["表紙", f"{HEADER}\n本文\n2\n"], 0),
    ("柱が無ければ問題", ["表紙", "本文\n2\n"], 1),
    ("ノンブルが無ければ問題", ["表紙", f"{HEADER}\n本文\n"], 1),
    ("表紙にノンブルが出ていれば問題", [f"{HEADER}\n表紙\n1\n"], 1),
    # 付録は書名がそのまま表紙の題字になる。柱と区別できないので問題にしない。
    ("表紙の題字が柱と同じ文字でも問題にしない", [f"{HEADER}\n"], 0),
]


def main() -> int:
    failures: list[str] = []

    for label, pages, expected in BLANK_CASES:
        got = find_blank_pages(pages, HEADER)
        if got != expected:
            failures.append(f"空白ページ／{label}: 期待 {expected} 実際 {got}")

    for label, pages, expected in MERMAID_CASES:
        got = find_mermaid_leaks(pages)
        if got != expected:
            failures.append(f"mermaid漏れ／{label}: 期待 {expected} 実際 {got}")

    for label, rows, expected in FONT_CASES:
        got = find_font_problems(rows)
        if len(got) != expected:
            failures.append(f"書体／{label}: 期待 {expected}件 実際 {got}")

    for label, pages, total, heads, expected in TOC_CASES:
        got = find_toc_problems(pages, total, heads)
        if len(got) != expected:
            failures.append(f"目次／{label}: 期待 {expected}件 実際 {got}")

    for label, source, pdf_text, expected in CODE_CASES:
        got = find_truncated_code(source, pdf_text)
        if len(got) != expected:
            failures.append(f"コード欠け／{label}: 期待 {expected}件 実際 {got}")

    for label, pages, expected in FURNITURE_CASES:
        got = find_furniture_problems(pages, HEADER)
        if len(got) != expected:
            failures.append(f"柱・ノンブル／{label}: 期待 {expected}件 実際 {got}")

    # pdffonts の列構成は実装で違う。poppler は encoding 列があり、xpdf は代わりに
    # prob 列が入る。どちらでも emb 列を読めること、特に emb=no / sub=yes の書体を
    # 「埋め込み済み」と取り違えないことを固定する。取り違えると、埋め込みが欠けた
    # PDF を検査が緑で通してしまう。
    poppler_table = (
        "name                         type          encoding    emb sub uni object ID\n"
        "---------------------------- ------------- ----------- --- --- --- ---------\n"
        "AAAAAA+BIZUDPGothic-Regular  CID TrueType  Identity-H  yes yes yes      4  0\n"
        "BBBBBB+BIZUDPGothic-Bold     CID TrueType  Identity-H  no  yes yes      5  0\n"
    )
    xpdf_table = (
        "name                         type          emb sub uni prob object ID\n"
        "---------------------------- ------------- --- --- --- ---- ---------\n"
        "AAAAAA+BIZUDPGothic-Regular  CID TrueType  yes yes yes no        4  0\n"
        "BBBBBB+BIZUDPGothic-Bold     CID TrueType  no  yes yes no        5  0\n"
    )
    for label, table in (("poppler", poppler_table), ("xpdf", xpdf_table)):
        rows = parse_font_table(table)
        if [row[2] for row in rows] != ["yes", "no"]:
            failures.append(f"書体表({label}): emb 列を読めていない {rows}")
        if [row[1] for row in rows] != ["CID TrueType", "CID TrueType"]:
            failures.append(f"書体表({label}): 種別を読めていない {rows}")
        # 許可リスト外の名前で試すと、埋め込み判定を消しても許可リスト側で引っかかって
        # テストが通ってしまう。埋め込みだけを見るために許可済みの書体を使う。
        if not any(p.startswith("埋め込まれていない:") for p in find_font_problems(rows)):
            failures.append(f"書体表({label}): 埋め込みが欠けた書体を通してしまう")

    # 外部コマンドの失敗を空の出力で返すと、「読めなかった」と「問題が無かった」が
    # 同じ結果になる。書体を一度も見ていないPDFが合格として出るのが最悪の形なので、
    # 起動失敗と異常終了のどちらも例外になることを固定する。
    for label, command in (
        ("起動できない", ["definitely-not-a-real-command-xyz"]),
        ("異常終了", ["python3", "-c", "import sys; sys.exit(3)"]),
    ):
        try:
            run_tool(command)
            failures.append(f"外部コマンド({label}): 例外にならず素通りする")
        except ToolFailure:
            pass

    # 柱を引かずに数えると空白ページは1件も見つからない。この前提が崩れると
    # 検査全体が緑のまま素通りするので、単体で固定しておく。
    if page_residue(f"{HEADER}\n\n7\n", HEADER, 7) != "":
        failures.append("柱とノンブルを引き切れていない")

    # poppler は数字と日本語の間に半角空白を入れる（「30日」→「30 日」）。
    # ここを素の文字列一致にすると、柱が出ているのに「柱が無い」と言い出す。
    spaced = "学びのロードマップ（30 日カリキュラム全体像）"
    exact = "学びのロードマップ（30日カリキュラム全体像）"
    if find_furniture_problems(["表紙", f"{spaced}\n本文\n2\n"], exact):
        failures.append("poppler が入れる空白で柱を見失っている")
    if page_residue(f"{spaced}\n\n5\n", exact, 5) != "":
        failures.append("空白入りの柱を引き切れていない")

    if failures:
        print(f"❌ {len(failures)} 件失敗")
        for failure in failures:
            print(f"  {failure}")
        return 1

    total = (len(BLANK_CASES) + len(MERMAID_CASES) + len(FONT_CASES)
             + len(TOC_CASES) + len(CODE_CASES) + len(FURNITURE_CASES) + 11)
    print(f"✅ {total} ケースすべて通過")
    return 0


if __name__ == "__main__":
    sys.exit(main())
