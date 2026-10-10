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

import contextlib
import hashlib
import io
import json
import sys
import tempfile
from collections.abc import Callable
from copy import deepcopy
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import check_pdf_book as target  # noqa: E402
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


def receipt_rect(left: float, top: float, width: float, height: float) -> dict[str, float]:
    return {
        "x": left,
        "y": top,
        "left": left,
        "top": top,
        "right": left + width,
        "bottom": top + height,
        "width": width,
        "height": height,
    }


def outline_item(page_index: int, role: str, text: str) -> dict[str, object]:
    side = "right" if page_index % 2 == 0 else "left"
    local_top = 0.0 if role == "title" else 1000.0
    page_top = page_index * 1200.0
    characters = [
        {
            "character": character,
            "global_rect": receipt_rect(10.0 + index, page_top + local_top + 10.0, 1.0, 10.0),
            "page_local_rect": receipt_rect(10.0 + index, local_top + 10.0, 1.0, 10.0),
        }
        for index, character in enumerate(text)
    ]
    return {
        "page_index": page_index,
        "role": role,
        "box": f"{'top' if role == 'title' else 'bottom'}-{side}",
        "text": text,
        "coordinate_space": "physical_page_css_px_v1",
        "outline_path_count": sum(character != " " for character in text),
        "bounds": receipt_rect(0.0, page_top + local_top, 500.0, 100.0),
        "page_local_bounds": receipt_rect(0.0, local_top, 500.0, 100.0),
        "character_rects": characters,
    }


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

    valid_item = outline_item(0, "title", "AB")
    if target.validate_outline_receipt(valid_item, 0, "title", "AB", "top-right"):
        failures.append("outline schema: 正しいglobal/page-local receiptを拒否した")
    strict_receipt_cases: list[tuple[str, dict[str, object]]] = []

    def invalid_item(label: str, mutate: Callable[[dict[str, object]], None]) -> None:
        item = deepcopy(valid_item)
        mutate(item)
        strict_receipt_cases.append((label, item))

    invalid_item("coordinate_space", lambda item: item.update(coordinate_space="legacy"))
    invalid_item("文字数", lambda item: item["character_rects"].pop())
    invalid_item("文字順", lambda item: item["character_rects"][0].update(character="B"))
    invalid_item(
        "legacy rect",
        lambda item: item["character_rects"][0].update(
            rect=item["character_rects"][0].pop("page_local_rect")
        ),
    )
    invalid_item(
        "local bounds外",
        lambda item: item["character_rects"][0].update(
            page_local_rect=receipt_rect(10.0, 95.0, 1.0, 10.0)
        ),
    )
    invalid_item(
        "global/local不一致",
        lambda item: item["character_rects"][0].update(
            global_rect=receipt_rect(11.0, 10.0, 1.0, 10.0)
        ),
    )
    large_coordinate = deepcopy(valid_item)
    page_origin = 1051200.125
    large_coordinate["bounds"] = receipt_rect(0.0, page_origin, 500.0, 100.0)
    for character_rect in large_coordinate["character_rects"]:
        local_rect = character_rect["page_local_rect"]
        character_rect["global_rect"] = receipt_rect(
            local_rect["left"], local_rect["top"] + page_origin, local_rect["width"], local_rect["height"]
        )
    large_coordinate["character_rects"][0]["global_rect"]["y"] += 0.001
    strict_receipt_cases.append(("巨大座標rel_tol", large_coordinate))
    for rect_name, rect_getter in (
        ("bounds", lambda item: item["bounds"]),
        ("page_local_bounds", lambda item: item["page_local_bounds"]),
        ("global_rect", lambda item: item["character_rects"][0]["global_rect"]),
        ("page_local_rect", lambda item: item["character_rects"][0]["page_local_rect"]),
    ):
        for field in ("x", "y", "left", "top", "right", "bottom", "width", "height"):
            invalid_item(
                f"{rect_name}.{field}=bool",
                lambda item, getter=rect_getter, key=field: getter(item).__setitem__(key, True),
            )
            invalid_item(
                f"{rect_name}.{field}=nonfinite",
                lambda item, getter=rect_getter, key=field: getter(item).__setitem__(
                    key, float("inf")
                ),
            )
        invalid_item(
            f"{rect_name} order",
            lambda item, getter=rect_getter: getter(item).__setitem__(
                "right", getter(item)["left"]
            ),
        )
        invalid_item(
            f"{rect_name} positive width",
            lambda item, getter=rect_getter: getter(item).__setitem__("width", 0.0),
        )
        invalid_item(
            f"{rect_name} vertical order",
            lambda item, getter=rect_getter: getter(item).__setitem__(
                "bottom", getter(item)["top"]
            ),
        )
        invalid_item(
            f"{rect_name} positive height",
            lambda item, getter=rect_getter: getter(item).__setitem__("height", 0.0),
        )

    for label, item in strict_receipt_cases:
        got = target.validate_outline_receipt(item, 0, "title", "AB", "top-right")
        if not got:
            failures.append(f"outline schema: {label}を拒否しなかった")
        elif any("pathが無い" in problem for problem in got):
            failures.append(f"outline schema: {label}を物理path欠落と誤分類した: {got}")

    for label, mutate in (
        (
            "空白文字bool",
            lambda rect: rect["page_local_rect"].__setitem__("top", True),
        ),
        (
            "空白文字nonfinite",
            lambda rect: rect["global_rect"].__setitem__("bottom", float("inf")),
        ),
        (
            "空白文字order",
            lambda rect: rect["page_local_rect"].__setitem__(
                "right", rect["page_local_rect"]["left"]
            ),
        ),
    ):
        item = outline_item(0, "title", "A B")
        mutate(item["character_rects"][1])
        got = target.validate_outline_receipt(item, 0, "title", "A B", "top-right")
        if not got:
            failures.append(f"outline schema: {label}を拒否しなかった")

    # 柱とノンブルを SVG path に変えた生成物は pdftotext では読めない。現在の PDF、
    # DOM 証跡、原稿、font、glyph map を SHA で結んだ場合だけ代替証跡として認める。
    original_build_dir = target.BUILD_DIR
    original_src_dir = target.SRC_DIR
    original_glyph_map = target.GLYPH_MAP
    original_direct_check = target.find_margin_outline_pdf_problems
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        target.BUILD_DIR = root / "build"
        target.SRC_DIR = root / "source"
        target.BUILD_DIR.mkdir()
        target.SRC_DIR.mkdir()
        pdf = root / "day01_receipt.pdf"
        pdf.write_bytes(b"exact pdf bytes")
        source = target.SRC_DIR / "day01_receipt.md"
        source.write_text(f"# {HEADER}\n", encoding="utf-8")
        glyph = root / "glyph.json"
        target.GLYPH_MAP = glyph
        font = root / "font.ttf"
        font.write_bytes(b"font bytes")
        glyph.write_text(
            json.dumps(
                {
                    "font": {"sha256": hashlib.sha256(font.read_bytes()).hexdigest()},
                    "supported_titles": [
                        {
                            "path": f"material/30days-curriculum/{source.name}",
                            "title": HEADER,
                            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        slug = target.work_slug(pdf.stem)
        dom_path = target.BUILD_DIR / f"{slug}.inline-layout.json"
        pdf_report_path = target.BUILD_DIR / f"{slug}.inline-pdf.json"

        def write_receipts(*, folio_two: str = "2", pdf_sha: str | None = None) -> None:
            inventory = []
            for page_index in range(2):
                folio = folio_two if page_index == 1 else "1"
                inventory += [
                    outline_item(page_index, "title", HEADER),
                    outline_item(page_index, "folio", folio),
                ]
            dom = {
                "schema_version": 1,
                "result": "dom_pass_post_pdf_pending",
                "document_id": slug,
                "margin_outline": {
                    "status": "pass",
                    "provenance": {
                        "source_title": HEADER,
                        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                        "glyph_map_path": str(glyph),
                        "glyph_map_sha256": hashlib.sha256(glyph.read_bytes()).hexdigest(),
                        "font_path": str(font),
                        "font_sha256": hashlib.sha256(font.read_bytes()).hexdigest(),
                    },
                    "conversion": {
                        "status": "pass",
                        "expected_title": HEADER,
                        "page_count": 2,
                        "converted_box_count": 4,
                        "page_body_geometry_equal": True,
                        "inventory": inventory,
                    },
                },
            }
            dom_path.write_text(json.dumps(dom), encoding="utf-8")
            report = {
                "schema_version": 1,
                "result": "pass",
                "document_id": slug,
                "issues": [],
                "page_count": {"dom": 2, "pdf": 2},
                "inputs": {
                    "final_pdf": {"sha256": pdf_sha or hashlib.sha256(pdf.read_bytes()).hexdigest()},
                    "dom_report": {"sha256": hashlib.sha256(dom_path.read_bytes()).hexdigest()},
                },
            }
            pdf_report_path.write_text(json.dumps(report), encoding="utf-8")

        try:
            target.find_margin_outline_pdf_problems = lambda _pdf, _total, _header: []
            missing = target.find_outline_receipt_problems(pdf, 2, HEADER)
            if not any("証跡を読めない" in problem for problem in missing):
                failures.append("outline証跡: 欠落した証跡を通した")

            write_receipts()
            if target.find_outline_receipt_problems(pdf, 2, HEADER):
                failures.append("outline証跡: 完全なSHA結合証跡を拒否した")
            pages_without_text_furniture = ["表紙", "本文"]
            if target.find_output_furniture_problems(
                pdf, pages_without_text_furniture, HEADER, 2
            ):
                failures.append("outline証跡: 正しいpath柱・ノンブルを欠落扱いした")

            malformed_dom = json.loads(dom_path.read_text(encoding="utf-8"))
            malformed_character = malformed_dom["margin_outline"]["conversion"]["inventory"][0][
                "character_rects"
            ][0]
            malformed_character["rect"] = malformed_character.pop("page_local_rect")
            dom_path.write_text(json.dumps(malformed_dom), encoding="utf-8")
            malformed_pdf_report = json.loads(pdf_report_path.read_text(encoding="utf-8"))
            malformed_pdf_report["inputs"]["dom_report"]["sha256"] = hashlib.sha256(
                dom_path.read_bytes()
            ).hexdigest()
            pdf_report_path.write_text(json.dumps(malformed_pdf_report), encoding="utf-8")
            direct_calls = 0

            def unexpected_direct_call(_pdf: Path, _total: int, _header: str) -> list[str]:
                nonlocal direct_calls
                direct_calls += 1
                return ["p2: 最終PDFに柱が無い"]

            target.find_margin_outline_pdf_problems = unexpected_direct_call
            malformed_output = target.find_output_furniture_problems(
                pdf, pages_without_text_furniture, HEADER, 2
            )
            if direct_calls != 0:
                failures.append("outline証跡: invalid receiptでも直接物理検査を呼んだ")
            if len(malformed_output) != 1 or not malformed_output[0].startswith(
                "outline DOM証跡が不正:"
            ):
                failures.append(f"outline証跡: invalid receipt原因をboundedに返さない {malformed_output}")
            if any("柱が無い" in problem for problem in malformed_output):
                failures.append(f"outline証跡: invalid receiptを物理欠落と誤分類した {malformed_output}")

            write_receipts()

            target.find_margin_outline_pdf_problems = (
                lambda _pdf, _total, _header: ["p2: 最終PDFに柱が無い"]
            )
            direct_failure = target.find_output_furniture_problems(
                pdf, pages_without_text_furniture, HEADER, 2
            )
            if not any("最終PDFに柱が無い" in problem for problem in direct_failure):
                failures.append("outline直接検査: valid receiptで最終PDF欠落を隠した")
            if not any("p2: 柱が無い" in problem for problem in direct_failure):
                failures.append("outline直接検査: 元のpdftotext findingを消した")
            target.find_margin_outline_pdf_problems = lambda _pdf, _total, _header: []

            # 子検査が fail を返したのに詳細が空でも、ラッパーは成功扱いしてはいけない。
            # この組は V3 の実装で pdftotext 欠落を消す fail-open を再現した。
            if not target.find_direct_result_problems(1, "fail", []):
                failures.append("outline直接検査: rc1/fail/空problemsを成功扱いした")
            if target.find_direct_result_problems(0, "pass", []):
                failures.append("outline直接検査: rc0/pass/空problemsを拒否した")
            if not target.find_direct_result_problems(0, "pass", ["p2: 欠落"]):
                failures.append("outline直接検査: rc0/pass/非空problemsを成功扱いした")

            write_receipts()
            bool_dom = json.loads(dom_path.read_text(encoding="utf-8"))
            bool_dom["margin_outline"]["conversion"]["inventory"][0]["page_index"] = True
            dom_path.write_text(json.dumps(bool_dom), encoding="utf-8")
            bool_pdf_report = json.loads(pdf_report_path.read_text(encoding="utf-8"))
            bool_pdf_report["inputs"]["dom_report"]["sha256"] = hashlib.sha256(
                dom_path.read_bytes()
            ).hexdigest()
            pdf_report_path.write_text(json.dumps(bool_pdf_report), encoding="utf-8")
            got = target.find_outline_receipt_problems(pdf, 2, HEADER)
            if not any("page_indexが整数ではない" in problem for problem in got):
                failures.append("outline証跡: boolean page_indexを整数として通した")

            write_receipts(pdf_sha="0" * 64)
            got = target.find_outline_receipt_problems(pdf, 2, HEADER)
            if not any("PDF SHA256" in problem for problem in got):
                failures.append("outline証跡: 別PDFの証跡を通した")

            write_receipts(folio_two="99")
            got = target.find_outline_receipt_problems(pdf, 2, HEADER)
            if not any("p2: folio DOM証跡の内容" in problem for problem in got):
                failures.append("outline証跡: staleなノンブルを通した")

            write_receipts()
            stale_dom = json.loads(dom_path.read_text(encoding="utf-8"))
            stale_dom["margin_outline"]["conversion"]["expected_title"] = "stale title"
            dom_path.write_text(json.dumps(stale_dom), encoding="utf-8")
            stale_pdf_report = json.loads(pdf_report_path.read_text(encoding="utf-8"))
            stale_pdf_report["inputs"]["dom_report"]["sha256"] = hashlib.sha256(
                dom_path.read_bytes()
            ).hexdigest()
            pdf_report_path.write_text(json.dumps(stale_pdf_report), encoding="utf-8")
            got = target.find_outline_receipt_problems(pdf, 2, HEADER)
            if not any("タイトルがPDF Title" in problem for problem in got):
                failures.append("outline証跡: staleなタイトルを通した")

            write_receipts()
            source.write_text(f"# {HEADER}\n変更\n", encoding="utf-8")
            got = target.find_outline_receipt_problems(pdf, 2, HEADER)
            if not any("原稿SHA256" in problem for problem in got):
                failures.append("outline証跡: staleな原稿を通した")

            write_receipts()
            cover_problem = target.find_output_furniture_problems(
                pdf, [f"{HEADER}\n1\n", "本文"], HEADER, 2
            )
            if "表紙にノンブルが出ている" not in cover_problem:
                failures.append("outline証跡: 表紙の実テキストノンブルを隠した")
        finally:
            target.BUILD_DIR = original_build_dir
            target.SRC_DIR = original_src_dir
            target.GLYPH_MAP = original_glyph_map
            target.find_margin_outline_pdf_problems = original_direct_check

    # 全冊検査は day の内側の欠番を落とす一方、変更冊だけを組む subset では
    # 欠番が仕様なので --allow-gaps のときだけ許可する。両経路を同じfixtureで固定する。
    with tempfile.TemporaryDirectory() as directory:
        pdf_dir = Path(directory)
        (pdf_dir / "day01_first.pdf").touch()
        (pdf_dir / "day03_third.pdf").touch()
        original_tools = target.REQUIRED_TOOLS
        original_check_one = target.check_one
        target.REQUIRED_TOOLS = ()
        target.check_one = lambda _pdf: []
        try:
            full_output = io.StringIO()
            with contextlib.redirect_stdout(full_output):
                full_result = target.main(["check_pdf_book.py", str(pdf_dir)])
            if full_result != 1 or "day02 の PDF がありません" not in full_output.getvalue():
                failures.append("全冊検査が day の内側の欠番を見逃している")

            subset_output = io.StringIO()
            with contextlib.redirect_stdout(subset_output):
                subset_result = target.main(
                    ["check_pdf_book.py", "--allow-gaps", str(pdf_dir)]
                )
            if subset_result != 0:
                failures.append("subset 検査が仕様上の day 欠番を拒否している")
        finally:
            target.REQUIRED_TOOLS = original_tools
            target.check_one = original_check_one

    if failures:
        print(f"❌ {len(failures)} 件失敗")
        for failure in failures:
            print(f"  {failure}")
        return 1

    total = (len(BLANK_CASES) + len(MERMAID_CASES) + len(FONT_CASES)
             + len(TOC_CASES) + len(CODE_CASES) + len(FURNITURE_CASES)
             + len(strict_receipt_cases) + 25)
    print(f"✅ {total} ケースすべて通過")
    return 0


if __name__ == "__main__":
    sys.exit(main())
