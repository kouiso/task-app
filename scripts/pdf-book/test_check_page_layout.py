#!/usr/bin/env python3
"""check_page_layout の退行テスト。

この検査は「正しく組めているページ」と「崩れているページ」の差が数ミリしかない。
版面の縁ちょうどに置かれた表の地色は右端 188.0mm に届き、崩れた5列表は 195.2mm まで
出る。許容を 1mm から動かすと、どちらかへ黙って倒れる。境界をここで固定する。

特に押さえるのは次の4点。
  - 柱とノンブルは版面の外に出るのが正しい。帯として除外せんと全ページが赤くなる。
  - 潰れた列は「1文字だけの行の積み重なり」で見る。ただし1文字の値が入った普通の
    列（ステップ番号 1/2/3/4）と区別する。間隔が行送りか行の高さかで分ける。
  - 端切れの定義は1〜3文字だけの行。狭めると過去の実測と比べられなくなる。
  - 外部コマンドの出力を読めんかったら、空で返さず必ず例外にする。

PDF も poppler も要らない。全部その場で組み立てた入力で回す。
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_page_layout import (  # noqa: E402
    EDGE_TOLERANCE_MM,
    TEXT_BOTTOM_MM,
    TEXT_LEFT_MM,
    TEXT_RIGHT_MM,
    TEXT_TOP_MM,
    Line,
    ToolFailure,
    count_orphan_lines,
    find_collapsed_columns,
    find_image_problems,
    find_ink_overflow,
    find_orphan_problems,
    find_overlaps,
    find_text_overflow,
    ink_rows,
    parse_image_table,
    parse_line_boxes,
    read_pgm,
)

# 描画は 72dpi。1px = 1pt = 25.4/72 mm
PX_PER_MM = 72 / 25.4


def px(value_mm: float) -> int:
    return round(value_mm * PX_PER_MM)


def ink(rows_mm: list[tuple[float, float, float]]) -> list[tuple[int, int, int]]:
    """(y, 左端, 右端) の mm を、描画した画素の座標へ直す。"""
    return [(px(y), px(left), px(right)) for y, left, right in rows_mm]


# 版面いっぱいに置かれた、正しい1ページぶんの墨
GOOD_PAGE = [
    (12.0, TEXT_LEFT_MM, 120.0),        # 柱（余白の帯の中）
    (60.0, TEXT_LEFT_MM, TEXT_RIGHT_MM),  # 表の地色（版面の縁ちょうど）
    (200.0, 30.0, 150.0),               # 本文
    (284.0, TEXT_LEFT_MM, 26.0),        # ノンブル（余白の帯の中）
]

# (説明, 墨のある行(mm), 期待する問題の件数)
INK_CASES: list[tuple[str, list[tuple[float, float, float]], int]] = [
    ("版面の縁ちょうどに置かれた表と柱・ノンブルは問題なし", GOOD_PAGE, 0),
    ("墨が1つも無いページは問題なし（空白ページは既存の検査の担当）", [], 0),
    ("許容の内側のはみ出しは問題にしない",
     [*GOOD_PAGE, (100.0, 30.0, TEXT_RIGHT_MM + EDGE_TOLERANCE_MM - 0.4)], 0),
    ("許容を超えて右へ出たら問題",
     [*GOOD_PAGE, (100.0, 30.0, TEXT_RIGHT_MM + EDGE_TOLERANCE_MM + 1.0)], 1),
    ("許容を超えて左へ出たら問題",
     [*GOOD_PAGE, (100.0, TEXT_LEFT_MM - EDGE_TOLERANCE_MM - 1.0, 150.0)], 1),
    ("左右どちらも出たら2件",
     [*GOOD_PAGE, (100.0, 15.0, 199.0)], 2),
    ("柱の帯と版面の間に墨が来たら問題",
     [*GOOD_PAGE, (22.5, 30.0, 150.0)], 1),
    ("版面とノンブルの帯の間に墨が来たら問題",
     [*GOOD_PAGE, (275.0, 30.0, 150.0)], 1),
    ("版面の上端ちょうどは問題にしない",
     [*GOOD_PAGE, (TEXT_TOP_MM, 30.0, 150.0)], 0),
    ("版面の下端ちょうどは問題にしない",
     [*GOOD_PAGE, (TEXT_BOTTOM_MM, 30.0, 150.0)], 0),
]


def line(page: int, block: int, left: float, top: float,
         width: float, text: str, height: float = 4.5) -> Line:
    return Line(page, block, left, top, left + width, top + height, text)


# (説明, 行の並び, 期待する問題の件数)
TEXT_OVERFLOW_CASES: list[tuple[str, list[Line], int]] = [
    ("版面に収まっていれば問題なし",
     [line(2, 0, TEXT_LEFT_MM, 40.0, 166.0, "本文")], 0),
    ("右へ大きく出たら問題",
     [line(8, 3, 190.7, 41.6, 4.5, "成")], 1),
    ("左へ大きく出たら問題",
     [line(8, 3, 15.0, 41.6, 4.5, "成")], 1),
    ("同じページの同じ向きは1件にまとめる",
     [line(8, 3, 190.7, 41.6, 4.5, "成"),
      line(8, 3, 190.7, 50.8, 4.5, "功"),
      line(8, 3, 190.7, 60.1, 4.5, "状")], 1),
    ("ページが違えば別の件として挙げる",
     [line(8, 3, 190.7, 41.6, 4.5, "成"),
      line(9, 3, 190.7, 28.7, 4.5, "成")], 2),
    ("空の行は数えない", [line(2, 0, 199.0, 40.0, 4.5, "  ")], 0),
]

# (説明, 行の並び, 期待する問題の件数)
OVERLAP_CASES: list[tuple[str, list[Line], int]] = [
    ("普通に並んだ行は重なりではない",
     [line(2, 0, 22.0, 40.0, 100.0, "1行目"),
      line(2, 1, 22.0, 49.2, 100.0, "2行目")], 0),
    ("別のブロックが大きく重なったら問題",
     [line(2, 0, 22.0, 40.0, 100.0, "表のセル"),
      line(2, 1, 30.0, 41.0, 100.0, "図のキャプション")], 1),
    ("同じブロックの中は対象外（行送りで並ぶだけ）",
     [line(2, 0, 22.0, 40.0, 100.0, "1行目"),
      line(2, 0, 30.0, 41.0, 100.0, "2行目")], 0),
    ("罫線に文字の裾が 0.5mm 触れた程度は重なりにしない",
     [line(2, 0, 22.0, 40.0, 100.0, "本文"),
      line(2, 1, 22.0, 44.0, 100.0, "罫線", height=0.6)], 0),
    ("行の高さの3分の1だけ被った程度は重なりにしない",
     [line(2, 0, 22.0, 40.0, 100.0, "本文"),
      line(2, 1, 22.0, 43.0, 100.0, "次の行")], 0),
    ("行の高さの半分を超えて被ったら重なり",
     [line(2, 0, 22.0, 40.0, 100.0, "本文"),
      line(2, 1, 22.0, 41.5, 100.0, "次の行")], 1),
    ("本文がノンブルに重なったら問題",
     [line(2, 0, 22.0, 281.0, 60.0, "本文の最終行"),
      line(2, 9, 22.0, 282.3, 4.0, "2")], 1),
]

# 潰れた5列目。行送り 9.2mm で1文字ずつ積まれる（day26 の実測）
COLLAPSED_STACK = [
    line(8, 3, 190.7, 41.6 + 9.2 * n, 4.5, char)
    for n, char in enumerate("成功状態ErrorBoun")
]
# 1文字の値が入った普通の列。表の行が変わる間隔（16mm 以上）で並ぶ
NORMAL_NARROW_COLUMN = [
    line(31, 4, 24.2, 60.0 + 16.5 * n, 3.0, char)
    for n, char in enumerate("12345678")
]

# (説明, 行の並び, 期待する問題の件数)
COLLAPSED_CASES: list[tuple[str, list[Line], int]] = [
    ("行送りで1文字ずつ積まれた細い列は潰れている", COLLAPSED_STACK, 1),
    ("積み重なりが閾値に1本足りなければ問題にしない", COLLAPSED_STACK[:7], 0),
    ("表の行の間隔で並ぶ1文字の列は普通の表", NORMAL_NARROW_COLUMN, 0),
    ("幅が残っていれば潰れていない",
     [line(8, 3, 100.0, 41.6 + 9.2 * n, 20.0, char)
      for n, char in enumerate("成功状態ErrorBoun")], 0),
    ("2文字以上の行は積み重なりに数えない",
     [line(8, 3, 190.7, 41.6 + 9.2 * n, 4.5, "あい")
      for n in range(16)], 0),
]

# 版面の中の普通の行。端切れの率を測る母数になる
FULL_LINES = [line(2, 0, 22.0, 40.0 + 9.2 * n, 120.0, "普通の長さの行") for n in range(17)]
ORPHAN_LINES = [line(2, 1, 22.0, 200.0 + 9.2 * n, 4.5, "あ") for n in range(3)]

# (説明, 行の並び, 期待する問題の件数)
ORPHAN_CASES: list[tuple[str, list[Line], int]] = [
    ("端切れが率の上限以下なら問題にしない", [*FULL_LINES, *ORPHAN_LINES], 0),
    ("率の上限を超えたら問題", [*FULL_LINES, *ORPHAN_LINES,
                               line(2, 1, 22.0, 230.0, 4.5, "い")], 1),
    ("行が1つも無ければ問題にしない（0除算を踏まない）", [], 0),
]

POPPLER_IMAGE_TABLE = (
    "page   num  type   width height color comp bpc  enc interp"
    "  object ID x-ppi y-ppi size ratio\n"
    "------------------------------------------------------------"
    "--------------------------------\n"
    "   4     0 image    1440   900  icc     3   8  image  no"
    "        59  0   220   220 31.7K 0.8%\n"
    "  28     1 image    1440   760  icc     3   8  image  no"
    "       142  0   240   240 60.6K 1.9%\n"
)

# (説明, pdfimages の行, 期待する問題の件数)
IMAGE_CASES: list[tuple[str, list[dict[str, float | int | str]], int]] = [
    ("版面いっぱいの写真は問題なし",
     [{"page": 4, "width": 1440, "height": 900, "x_ppi": 220.0, "y_ppi": 220.0}], 0),
    ("紙で小さすぎる写真は問題",
     [{"page": 4, "width": 1440, "height": 900, "x_ppi": 300.0, "y_ppi": 300.0}], 1),
    ("版面より広い写真は問題",
     [{"page": 4, "width": 1440, "height": 900, "x_ppi": 200.0, "y_ppi": 200.0}], 1),
    ("実効解像度が下限を割ったら問題",
     [{"page": 4, "width": 650, "height": 400, "x_ppi": 110.0, "y_ppi": 110.0}], 1),
    ("縦横で実効解像度がずれていたら（引き伸ばし）問題",
     [{"page": 4, "width": 1440, "height": 900, "x_ppi": 220.0, "y_ppi": 200.0}], 1),
    ("高さが紙面の上限を超えたら問題",
     [{"page": 4, "width": 1440, "height": 1440, "x_ppi": 220.0, "y_ppi": 220.0}], 1),
    ("解像度が 0 なら読めないものとして挙げる",
     [{"page": 4, "width": 1440, "height": 900, "x_ppi": 0.0, "y_ppi": 0.0}], 1),
]

BBOX_XML = """<?xml version="1.0"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "x.dtd">
<html{ns}>
<body><doc>
  <page width="595.275750" height="841.890000">
    <flow><block xMin="62.3" yMin="93.4" xMax="532.8" yMax="106.1">
      <line xMin="62.3" yMin="93.4" xMax="532.8" yMax="106.1">
        <word xMin="62.3" yMin="93.4" xMax="210.3" yMax="106.1">このカリキュラムでは、</word>
        <word xMin="212.2" yMin="93.4" xMax="532.8" yMax="106.1">30 日かけて作ります。</word>
      </line>
    </block></flow>
  </page>
</doc></body>
</html>
"""


def main() -> int:
    failures: list[str] = []

    for label, rows, expected in INK_CASES:
        got = find_ink_overflow(ink(rows))
        if len(got) != expected:
            failures.append(f"はみ出し／{label}: 期待 {expected}件 実際 {got}")

    for label, lines, expected in TEXT_OVERFLOW_CASES:
        got = find_text_overflow(lines)
        if len(got) != expected:
            failures.append(f"文字のはみ出し／{label}: 期待 {expected}件 実際 {got}")

    for label, lines, expected in OVERLAP_CASES:
        got = find_overlaps(lines)
        if len(got) != expected:
            failures.append(f"重なり／{label}: 期待 {expected}件 実際 {got}")

    for label, lines, expected in COLLAPSED_CASES:
        got = find_collapsed_columns(lines)
        if len(got) != expected:
            failures.append(f"潰れた列／{label}: 期待 {expected}件 実際 {got}")

    for label, lines, expected in ORPHAN_CASES:
        got = find_orphan_problems(lines)
        if len(got) != expected:
            failures.append(f"端切れ／{label}: 期待 {expected}件 実際 {got}")

    for label, rows, expected in IMAGE_CASES:
        got = find_image_problems(rows)
        if len(got) != expected:
            failures.append(f"写真／{label}: 期待 {expected}件 実際 {got}")

    # 端切れの定義は「1〜3文字だけの行」。柱とノンブルは版面の外なので数えん。
    # ノンブルを数に入れると全ページが1件ずつ端切れになり、率が意味を失う。
    folio = line(2, 9, 22.0, 282.3, 4.0, "12")
    header = line(2, 9, 22.0, 10.3, 100.0, "Day 01: 開発環境を整えて")
    orphans, total, worst = count_orphan_lines([*FULL_LINES, *ORPHAN_LINES, folio, header])
    if (orphans, total) != (3, 20):
        failures.append(f"端切れの数え方: 期待 (3, 20) 実際 {(orphans, total)}")
    if worst != [(2, 3)]:
        failures.append(f"端切れの多いページ: 期待 [(2, 3)] 実際 {worst}")
    if count_orphan_lines([line(2, 0, 22.0, 40.0, 12.0, "あいう")])[0] != 1:
        failures.append("端切れ: 3文字の行を数えていない（定義を狭めている）")
    if count_orphan_lines([line(2, 0, 22.0, 40.0, 16.0, "あいうえ")])[0] != 0:
        failures.append("端切れ: 4文字の行まで数えている（定義を広げている）")

    # PGM を読めんかったときに空を返すと、崩れたページが「墨が無い」として通る。
    # 大きさの行が壊れている場合と、画素が足りない場合の両方を例外に倒す。
    good = b"P5\n4 2\n255\n" + bytes([255, 255, 0, 255, 255, 255, 255, 255])
    width, height, pixels = read_pgm(good)
    if (width, height, len(pixels)) != (4, 2, 8):
        failures.append(f"PGM: 読めていない {(width, height, len(pixels))}")
    if ink_rows(width, height, pixels) != [(0, 2, 2)]:
        failures.append(f"PGM: 墨の位置が違う {ink_rows(width, height, pixels)}")
    for label, broken in (
        ("P5 でない", b"P6\n4 2\n255\n" + bytes(8)),
        ("大きさが読めない", b"P5\nx y\n255\n" + bytes(8)),
        ("画素が足りない", b"P5\n4 2\n255\n" + bytes(3)),
    ):
        try:
            read_pgm(broken)
            failures.append(f"PGM({label}): 例外にならず素通りする")
        except ToolFailure:
            pass

    # pdfimages の行は `object ID` だけが見出し2語・値2語で、真ん中の列数が
    # 見出しと合わない。前後の両端から数えて x-ppi / y-ppi を取り違えないこと。
    rows = parse_image_table(POPPLER_IMAGE_TABLE)
    if [(row["page"], row["width"], row["x_ppi"]) for row in rows] != [
        (4, 1440, 220.0), (28, 1440, 240.0)
    ]:
        failures.append(f"画像表: 列を取り違えている {rows}")
    for label, broken in (
        ("見出しが無い", "1 2 3\n"),
        ("数値が壊れている",
         POPPLER_IMAGE_TABLE.replace("   220   220", "   n/a   n/a")),
    ):
        try:
            parse_image_table(broken)
            failures.append(f"画像表({label}): 例外にならず素通りする")
        except ToolFailure:
            pass

    # poppler の版によって xhtml の名前空間が付いたり付かなかったりする。
    # 決め打ちで探すと片方で1行も取れず、検査全体が「問題なし」で通ってしまう。
    for label, namespace in (
        ("名前空間あり", ' xmlns="http://www.w3.org/1999/xhtml"'),
        ("名前空間なし", ""),
    ):
        parsed = parse_line_boxes(BBOX_XML.format(ns=namespace))
        if len(parsed) != 1:
            failures.append(f"行の座標({label}): {len(parsed)} 行しか取れない")
            continue
        only = parsed[0]
        if only.text != "このカリキュラムでは、30 日かけて作ります。":
            failures.append(f"行の座標({label}): 語を繋げていない {only.text!r}")
        # 62.3pt = 21.98mm。pt のまま比べると版面の判定が全部ずれる
        if not (21.9 < only.left < 22.1 and 187.9 < only.right < 188.1):
            failures.append(f"行の座標({label}): mm に直せていない {only}")
    try:
        parse_line_boxes("pdftotext: command produced no xhtml")
        failures.append("行の座標: <html> が無くても素通りする")
    except ToolFailure:
        pass

    if failures:
        print(f"❌ {len(failures)} 件失敗")
        for failure in failures:
            print(f"  {failure}")
        return 1

    total_cases = (len(INK_CASES) + len(TEXT_OVERFLOW_CASES) + len(OVERLAP_CASES)
                   + len(COLLAPSED_CASES) + len(ORPHAN_CASES) + len(IMAGE_CASES) + 14)
    print(f"✅ {total_cases} ケースすべて通過")
    return 0


if __name__ == "__main__":
    sys.exit(main())
