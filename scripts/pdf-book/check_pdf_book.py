#!/usr/bin/env python3
"""生成した教材PDFが商品として出せる状態かを、出力そのものから確かめる。

PDFは商品そのものだが、これまで出力を検査する仕組みが無かった。品質ゲート24本は
Markdown のテキストだけを見ており、組版した結果は誰も見ていない。実際、旧経路には
「長いコード行の末尾が消える」「表の手前に空白ページが出る」「mermaid が図にならず
原文が本文に出る」という欠陥が同時に存在したまま、ビルドは成功し続けていた。

組版の失敗はビルドエラーにならない。だから出力側で見る。

本文・書体・ページ情報は poppler（pdftotext / pdfinfo / pdffonts）で判定する。
文字抽出できないoutline柱・ノンブルだけは、PDF生成にも使う固定MuPDF toolchainで
最終PDFのpathとrasterを直接検査する。

見ないもの: 注釈リンクが Drive のどのファイルを指すか（配布先IDの照合は
このスクリプトの責務外）、本文の一字一句の再現性
（長いコード行の折り返し破壊だけ verify_pdf_copy.py が見る）、
画像そのものの見た目（check_page_layout.py は座標と比率だけ見る）。
全冊経路では対応台帳の「全36冊・原稿とPDFのstem一致」契約と実原稿を照合し、
PDF名の不足・余分を完全一致で見る。変更冊だけを組む subset 経路は
`--allow-gaps` を明示したときだけ、この完全一致を退ける。

`material-gate.yml` の Gate 4 には**入れない**。この検査は先に PDF を組む必要があり、
Chromium と10分前後のビルド時間を要求する。教材の文章を1行直すたびにそれを回すのは
割に合わない。CI に載せるかどうかは別途判断する（だからこのファイルは
scripts/curriculum-qa/ ではなく scripts/pdf-book/ に置いている）。
"""

from __future__ import annotations

import json
import hashlib
import math
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPO_ROOT = Path(__file__).resolve().parents[2]

sys.path.insert(0, str(REPO_ROOT / "scripts" / "curriculum-qa"))
from markdown_scan import code_blocks, iter_prose  # noqa: E402
from build_pdf_book import strip_inline_markdown  # noqa: E402

SRC_DIR = REPO_ROOT / "material" / "30days-curriculum"
DEFAULT_PDF_DIR = REPO_ROOT / "dist" / "pdf"
BUILD_DIR = REPO_ROOT / "dist" / ".pdf-book-build"
TOOLCHAIN_DIR = REPO_ROOT / "dist" / ".pdf-book-toolchain"
TOOLCHAIN_RUNTIME = TOOLCHAIN_DIR / ".runtime-provenance.json"
GLYPH_MAP = Path(__file__).with_name("decorative-margin-glyph-map.json")
MARGIN_PDF_VERIFIER = Path(__file__).with_name("verify-margin-outline-pdf.mjs")
MUPDF_ENTRY = TOOLCHAIN_DIR / "node_modules" / "mupdf" / "dist" / "mupdf.js"
SUPPORTED_MUPDF_VERSION = "1.28.0"
CORRESPONDENCE_LEDGER = REPO_ROOT / "material" / "release-correspondence.json"
EXPECTED_RELEASE_BOOKS = 36

A4_SIZE = "595.276 x 841.89 pts"
# 検査に使う poppler のコマンド。1本でも欠けると全冊が読めないので先に確かめる
REQUIRED_TOOLS = ("pdftotext", "pdfinfo", "pdffonts")
TOOL_TIMEOUT = 120
# 商品として埋め込んでよい書体。ここを許可リストにしているのは、WenQuanYi だけを
# 弾いても足りないため。生成した機械にたまたま入っていた DejaVu や Liberation が
# 混ざれば、別の機械で組んだPDFと見た目が変わる。
ALLOWED_FONTS = frozenset({
    "BIZUDPGothic-Regular",
    "BIZUDPGothic-Bold",
    "JetBrainsMono-Regular",
    "JetBrainsMono-Bold",
    "NotoEmoji-Regular",
    "DejaVuSans",
    # Chromium が埋め込みフォントから作り直した面に付ける名前。名前が消えるだけで
    # 中身は上のどれか。fontconfig を空にしてシステムフォントを1つも見せずに組んでも、
    # 文字は正しく出たままこの名前が残ることを実測で確認した（＝環境依存の代替ではない）。
    "OTS-derived-font",
})
SUBSET_PREFIX = re.compile(r"^[A-Z]{6}\+")

# 「グラフ」「フロー」という語は本文に普通に出る。語彙ではなく mermaid の構文で拾う。
# graph / flowchart は方向の指定が必須なので、地の文と衝突しない。
MERMAID_LEAK = re.compile(
    r"^\s*(?:graph|flowchart)\s+(?:TD|TB|BT|RL|LR)\b"
    r"|^\s*(?:sequenceDiagram|classDiagram|erDiagram|stateDiagram(?:-v2)?"
    r"|gantt|journey|gitGraph)\b"
    r"|^\s*```\s*mermaid\b",
    re.M,
)

# 写経できないコードを商品に載せないための閾値。85文字超の行は329行/25ファイルある。
LONG_CODE = 85
# 図にしたコードは本文に出ない。比較の対象から外す。
NON_TEXT_LANGS = frozenset({"mermaid"})


def strip_subset(name: str) -> str:
    """pdffonts が付けるサブセット接頭辞（ABCDEF+）を落とす。"""
    return SUBSET_PREFIX.sub("", name)


def find_font_problems(rows: list[tuple[str, str, str]]) -> list[str]:
    """(書体名, 種別, 埋め込み) の一覧から、商品として出せない書体を挙げる。

    Type 3 を弾くのは、字形をPDF内の描画命令へ分解して埋める形式で、
    容量が跳ね上がり、閲覧環境によっては文字が選択・検索できなくなるため。
    """
    problems: list[str] = []
    for name, kind, embedded in rows:
        base = strip_subset(name)
        if base not in ALLOWED_FONTS:
            problems.append(f"許可していない書体が混ざっている: {base}")
        if kind == "Type 3":
            problems.append(f"Type 3 で埋め込まれている: {base}")
        if embedded != "yes":
            problems.append(f"埋め込まれていない: {base}")
    return sorted(set(problems))


def flatten(text: str) -> str:
    """空白を全部落とす。

    poppler は数字と日本語の間に半角空白を入れる（「30日」→「30 日」）。
    原文とそのまま突き合わせると、正しく出ているものまで欠落に見える。
    """
    return re.sub(r"\s", "", text)


def page_residue(text: str, header: str, page_number: int) -> str:
    """柱とノンブルを取り除いた、そのページの中身。

    「文字が無いページ」で空白を判定すると1件も見つからない。表紙以外の全ページに
    柱とノンブルが入るため、白紙でも文字は取れる。差し引いてから見る。
    """
    lines = [line for line in text.split("\n") if line.strip() != str(page_number)]
    return flatten("\n".join(lines)).replace(flatten(header), "")


def find_blank_pages(pages: list[str], header: str) -> list[int]:
    """中身が無いページの番号を返す。表紙（1ページ目）は対象外。"""
    return [
        number
        for number, text in enumerate(pages, start=1)
        if number > 1 and not page_residue(text, header, number)
    ]


def find_mermaid_leaks(pages: list[str]) -> list[int]:
    """mermaid の原文が本文に出ているページの番号を返す。"""
    return [
        number
        for number, text in enumerate(pages, start=1)
        if MERMAID_LEAK.search(text)
    ]


def has_folio(text: str, page_number: int) -> bool:
    """そのページにノンブル（ページ番号だけの行）があるか。"""
    return any(line.strip() == str(page_number) for line in text.split("\n"))


def find_furniture_problems(pages: list[str], header: str) -> list[str]:
    """柱とノンブルの欠けを挙げる。表紙には両方出ないのが正しい。

    表紙で柱の有無を文字列で見ると、表紙に印刷された書名そのものと区別できない
    （付録は書名がそのまま表紙の題字になる）。テーマは表紙のマージンボックスを
    まとめて隠すので、ノンブルの有無で代表させる。
    """
    problems: list[str] = []
    flat_header = flatten(header)
    for number, text in enumerate(pages, start=1):
        if number == 1:
            if has_folio(text, number):
                problems.append("表紙にノンブルが出ている")
            continue
        if flat_header not in flatten(text):
            problems.append(f"p{number}: 柱が無い")
        if not has_folio(text, number):
            problems.append(f"p{number}: ノンブルが無い")
    return problems


def sha256_file(path: Path) -> str:
    """証跡が指す入力と、現在検査している実体を結び付ける。"""
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def work_slug(stem: str) -> str:
    """build_pdf_book.py と同じ規則で証跡の basename を求める。"""
    head = re.match(r"[A-Za-z0-9_-]*", stem).group(0)[:6].strip("_-") or "book"
    # 生成側と同じく NFC に揃えてからハッシュする。ズレると検査側だけ
    # 別の document_id を探しに行って証跡を読めなくなる。
    normalized = unicodedata.normalize("NFC", stem)
    return f"{head}-{hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:6]}"


def read_json_object(path: Path, label: str) -> tuple[dict[str, object] | None, list[str]]:
    """JSON 証跡を読む。欠落・壊れた JSON・非 object は必ず不合格にする。"""
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return None, [f"{label}を読めない: {error}"]
    if not isinstance(value, dict):
        return None, [f"{label}がJSON objectではない"]
    return value, []


def is_json_int(value: object) -> bool:
    """JSON booleanを整数として受理しない。"""
    return type(value) is int


def is_json_number(value: object) -> bool:
    """geometryのboolean/NaN/Infinityを拒否する。"""
    return type(value) in (int, float) and math.isfinite(value)


def find_rect_problems(value: object, label: str) -> list[str]:
    """producer receiptの矩形を狭い契約で検査する。"""
    if not isinstance(value, dict):
        return [f"{label}がobjectではない"]
    fields = ("x", "y", "left", "top", "right", "bottom", "width", "height")
    if any(not is_json_number(value.get(field)) for field in fields):
        return [f"{label}に数値ではない座標がある"]
    if (
        value["right"] <= value["left"]
        or value["bottom"] <= value["top"]
        or value["width"] <= 0
        or value["height"] <= 0
        or not math.isclose(value["x"], value["left"], rel_tol=0.0, abs_tol=1e-9)
        or not math.isclose(value["y"], value["top"], rel_tol=0.0, abs_tol=1e-9)
        or not math.isclose(
            value["width"], value["right"] - value["left"], rel_tol=0.0, abs_tol=1e-9
        )
        or not math.isclose(
            value["height"], value["bottom"] - value["top"], rel_tol=0.0, abs_tol=1e-9
        )
    ):
        return [f"{label}の大きさが不正"]
    return []


def validate_outline_receipt(
    item: object, page_index: int, role: str, text: str, box: str
) -> list[str]:
    """page-local schemaのDOM証跡を、旧rectへ後退できない形で検査する。"""
    label = f"p{page_index + 1}: {role} DOM証跡"
    if not isinstance(item, dict):
        return [f"{label}がobjectではない"]
    problems: list[str] = []
    if item.get("coordinate_space") != "physical_page_css_px_v1":
        problems.append(f"{label}のcoordinate_spaceが不正")
    if item.get("text") != text or item.get("box") != box:
        problems.append(f"{label}の内容または位置が不正")
    bounds = item.get("bounds")
    local_bounds = item.get("page_local_bounds")
    bounds_problems = find_rect_problems(bounds, f"{label}.bounds")
    bounds_problems += find_rect_problems(local_bounds, f"{label}.page_local_bounds")
    problems += bounds_problems
    characters = list(text)
    character_rects = item.get("character_rects")
    if not isinstance(character_rects, list) or len(character_rects) != len(characters):
        problems.append(f"{label}のcharacter_rects件数が文字列と一致しない")
        return problems

    if bounds_problems or not isinstance(bounds, dict) or not isinstance(local_bounds, dict):
        return problems
    offset_x = bounds["left"] - local_bounds["left"]
    offset_y = bounds["top"] - local_bounds["top"]
    for character_index, (character_rect, expected_character) in enumerate(
        zip(character_rects, characters, strict=True)
    ):
        character_label = f"{label}.character_rects[{character_index}]"
        if not isinstance(character_rect, dict):
            problems.append(f"{character_label}がobjectではない")
            continue
        if character_rect.get("character") != expected_character:
            problems.append(f"{character_label}.characterが文字列順と一致しない")
        if "rect" in character_rect:
            problems.append(f"{character_label}.rectは廃止済みschemaです")
        global_rect = character_rect.get("global_rect")
        local_rect = character_rect.get("page_local_rect")
        rect_problems = find_rect_problems(global_rect, f"{character_label}.global_rect")
        rect_problems += find_rect_problems(local_rect, f"{character_label}.page_local_rect")
        problems += rect_problems
        if rect_problems or not isinstance(global_rect, dict) or not isinstance(local_rect, dict):
            continue
        if (
            local_rect["left"] < local_bounds["left"] - 0.01
            or local_rect["top"] < local_bounds["top"] - 0.01
            or local_rect["right"] > local_bounds["right"] + 0.01
            or local_rect["bottom"] > local_bounds["bottom"] + 0.01
        ):
            problems.append(f"{character_label}.page_local_rectがpage_local_bounds外です")
        if any(
            not math.isclose(
                global_rect[field] - local_rect[field], offset, rel_tol=0.0, abs_tol=0.13
            )
            for field, offset in (
                ("left", offset_x),
                ("right", offset_x),
                ("top", offset_y),
                ("bottom", offset_y),
            )
        ) or any(
            not math.isclose(
                global_rect[field], local_rect[field], rel_tol=0.0, abs_tol=1e-9
            )
            for field in ("width", "height")
        ):
            problems.append(f"{character_label}のglobal/page-local座標対応が不正")
    return problems


def find_outline_receipt_problems(pdf: Path, total: int, header: str) -> list[str]:
    """文字抽出できない SVG 柱・ノンブルを、生成時の SHA 結合証跡で検査する。"""
    slug = work_slug(pdf.stem)
    dom_path = BUILD_DIR / f"{slug}.inline-layout.json"
    pdf_path = BUILD_DIR / f"{slug}.inline-pdf.json"
    dom, problems = read_json_object(dom_path, "margin outline DOM証跡")
    pdf_report, pdf_problems = read_json_object(pdf_path, "生成PDF証跡")
    problems += pdf_problems
    if dom is None or pdf_report is None:
        return problems

    if (
        not is_json_int(dom.get("schema_version"))
        or dom.get("schema_version") != 1
        or dom.get("result") != "dom_pass_post_pdf_pending"
    ):
        problems.append("margin outline DOM証跡のresultがpassではない")
    if dom.get("document_id") != slug:
        problems.append("margin outline DOM証跡のdocument_idが一致しない")

    margin = dom.get("margin_outline")
    if not isinstance(margin, dict) or margin.get("status") != "pass":
        problems.append("margin outline変換がpassではない")
        margin = {}
    conversion = margin.get("conversion")
    if not isinstance(conversion, dict) or conversion.get("status") != "pass":
        problems.append("margin outline変換結果がpassではない")
        conversion = {}
    if unicodedata.normalize("NFC", str(conversion.get("expected_title") or "")) != unicodedata.normalize("NFC", str(header)):
        problems.append("margin outlineのタイトルがPDF Titleと一致しない")
    if not is_json_int(conversion.get("page_count")) or conversion.get("page_count") != total:
        problems.append("margin outlineのページ数がPDFと一致しない")
    if (
        not is_json_int(conversion.get("converted_box_count"))
        or conversion.get("converted_box_count") != total * 2
    ):
        problems.append("margin outlineの変換数が2件/ページではない")
    if conversion.get("page_body_geometry_equal") is not True:
        problems.append("margin outline変換前後の本文geometryが一致しない")

    inventory = conversion.get("inventory")
    if not isinstance(inventory, list) or len(inventory) != total * 2:
        problems.append("margin outline inventoryが2件/ページではない")
        inventory = []
    indexed: dict[tuple[int, str], list[dict[str, object]]] = {}
    for item in inventory:
        if not isinstance(item, dict):
            problems.append("margin outline inventoryにobjectではない項目がある")
            continue
        if not is_json_int(item.get("page_index")):
            problems.append("margin outline inventoryのpage_indexが整数ではない")
            continue
        key = (item.get("page_index"), item.get("role"))
        indexed.setdefault(key, []).append(item)
    for page_index in range(total):
        side = "right" if page_index % 2 == 0 else "left"
        expected = (
            ("title", header, f"top-{side}"),
            ("folio", str(page_index + 1), f"bottom-{side}"),
        )
        for role, text, box in expected:
            matches = indexed.get((page_index, role), [])
            if len(matches) != 1:
                problems.append(f"p{page_index + 1}: outline {role}が一意ではない")
                continue
            item = matches[0]
            count = item.get("outline_path_count")
            expected_path_count = sum(character != " " for character in text)
            if not is_json_int(count) or count != expected_path_count:
                problems.append(f"p{page_index + 1}: outline {role}のpath数が文字列と一致しない")
            problems += validate_outline_receipt(item, page_index, role, text, box)

    provenance = margin.get("provenance")
    source = SRC_DIR / f"{pdf.stem}.md"
    glyph_map, glyph_map_problems = read_json_object(GLYPH_MAP, "固定glyph map")
    problems += glyph_map_problems
    if not isinstance(provenance, dict):
        problems.append("margin outline provenanceが無い")
    else:
        if unicodedata.normalize("NFC", str(provenance.get("source_title") or "")) != unicodedata.normalize("NFC", str(header)):
            problems.append("margin outline provenanceのタイトルが一致しない")
        if not source.is_file() or provenance.get("source_sha256") != sha256_file(source):
            problems.append("margin outline provenanceの原稿SHA256が一致しない")
        for label, key in (("glyph map", "glyph_map"), ("font", "font")):
            raw_path = provenance.get(f"{key}_path")
            expected_sha = provenance.get(f"{key}_sha256")
            artifact = Path(raw_path) if isinstance(raw_path, str) else Path()
            if not raw_path or not artifact.is_file() or sha256_file(artifact) != expected_sha:
                problems.append(f"margin outline provenanceの{label} SHA256が一致しない")
            if key == "glyph_map" and (
                not artifact.is_file() or artifact.resolve() != GLYPH_MAP.resolve()
            ):
                problems.append("margin outline provenanceのglyph map pathが固定実体と一致しない")
        if glyph_map is not None:
            supported_titles = glyph_map.get("supported_titles")
            expected_source_path = f"material/30days-curriculum/{source.name}"
            # glyph map は生成環境の正規化形で記録されている（クラウド/NFC
            # と macOS/NFD でズレる）。生成側と同じく NFC 等価で照合する。
            header_nfc = unicodedata.normalize("NFC", header)
            expected_path_nfc = unicodedata.normalize("NFC", expected_source_path)
            title_entries = (
                [
                    entry
                    for entry in supported_titles
                    if isinstance(entry, dict)
                    and unicodedata.normalize("NFC", str(entry.get("title") or ""))
                    == header_nfc
                    and unicodedata.normalize("NFC", str(entry.get("path") or ""))
                    == expected_path_nfc
                ]
                if isinstance(supported_titles, list)
                else []
            )
            if (
                len(title_entries) != 1
                or not source.is_file()
                or title_entries[0].get("sha256") != sha256_file(source)
            ):
                problems.append("固定glyph mapの原稿path/title/SHA256が一致しない")
            map_font = glyph_map.get("font")
            if (
                not isinstance(map_font, dict)
                or provenance.get("font_sha256") != map_font.get("sha256")
            ):
                problems.append("margin outline provenanceのfontが固定glyph mapと一致しない")

    if (
        not is_json_int(pdf_report.get("schema_version"))
        or pdf_report.get("schema_version") != 1
        or pdf_report.get("result") != "pass"
    ):
        problems.append("生成PDF証跡のresultがpassではない")
    if pdf_report.get("document_id") != slug or pdf_report.get("issues") != []:
        problems.append("生成PDF証跡のdocumentまたはissuesが不正")
    counts = pdf_report.get("page_count")
    if (
        not isinstance(counts, dict)
        or not is_json_int(counts.get("dom"))
        or not is_json_int(counts.get("pdf"))
        or counts.get("dom") != total
        or counts.get("pdf") != total
    ):
        problems.append("生成PDF証跡のページ数が一致しない")
    inputs = pdf_report.get("inputs")
    if not isinstance(inputs, dict):
        problems.append("生成PDF証跡のinputsが無い")
    else:
        final_pdf = inputs.get("final_pdf")
        dom_report = inputs.get("dom_report")
        if not isinstance(final_pdf, dict) or final_pdf.get("sha256") != sha256_file(pdf):
            problems.append("生成PDF証跡のPDF SHA256が現在のPDFと一致しない")
        if not isinstance(dom_report, dict) or dom_report.get("sha256") != sha256_file(dom_path):
            problems.append("生成PDF証跡のDOM SHA256が現在の証跡と一致しない")
    return problems


def find_direct_result_problems(
    returncode: int, reported_result: object, direct_problems: list[str]
) -> list[str]:
    """子検査の唯一の成功状態を、プロセス境界でfail-closedにする。"""
    problems = []
    if returncode != 0 or reported_result != "pass" or direct_problems:
        problems.append("margin outline PDF直接検査が不合格")
    if reported_result != ("pass" if returncode == 0 else "fail"):
        problems.append("margin outline PDF直接検査のresultとexit statusが一致しない")
    problems += [f"最終PDF: {problem}" for problem in direct_problems]
    return problems


def find_margin_outline_pdf_problems(pdf: Path, total: int, header: str) -> list[str]:
    """最終PDFのvector pathとrasterを、source-pinned glyph mapから直接検査する。"""
    runtime, problems = read_json_object(TOOLCHAIN_RUNTIME, "PDF toolchain runtime証跡")
    if runtime is None:
        return problems
    node_value = runtime.get("node_exec_path")
    node = Path(node_value) if isinstance(node_value, str) else Path()
    if not node_value or not node.is_absolute() or not node.is_file():
        return ["PDF toolchainのNode実体が無い"]
    if runtime.get("node_exec_sha256") != sha256_file(node):
        return ["PDF toolchainのNode SHA256が一致しない"]
    if (
        not GLYPH_MAP.is_file()
        or not MARGIN_PDF_VERIFIER.is_file()
        or not MUPDF_ENTRY.is_file()
    ):
        return ["margin outline PDF直接検査の入力が無い"]
    dom_report_path = BUILD_DIR / f"{work_slug(pdf.stem)}.inline-layout.json"
    if not dom_report_path.is_file():
        return ["margin outline PDF直接検査のDOM証跡が無い"]
    result = subprocess.run(
        [
            str(node),
            str(MARGIN_PDF_VERIFIER),
            "--pdf",
            str(pdf),
            "--title",
            header,
            "--source",
            str(SRC_DIR / f"{pdf.stem}.md"),
            "--glyph-map",
            str(GLYPH_MAP),
            "--dom-report",
            str(dom_report_path),
            "--toolchain",
            str(TOOLCHAIN_DIR),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    try:
        report = json.loads(result.stdout)
    except json.JSONDecodeError:
        return [f"margin outline PDF直接検査がJSONを返さない: {(result.stderr or result.stdout)[-300:]}"]
    if not isinstance(report, dict):
        return ["margin outline PDF直接検査の結果がobjectではない"]
    direct_problems = report.get("problems")
    if not isinstance(direct_problems, list) or any(
        not isinstance(problem, str) for problem in direct_problems
    ):
        return ["margin outline PDF直接検査のproblemsが不正"]
    inputs = report.get("inputs")
    if not isinstance(inputs, dict):
        return ["margin outline PDF直接検査のinputsが無い"]
    contract_problems = find_direct_result_problems(
        result.returncode, report.get("result"), direct_problems
    )
    if not is_json_int(report.get("schema_version")) or report.get("schema_version") != 1:
        contract_problems.append("margin outline PDF直接検査のschemaが不正")
    if result.returncode not in (0, 1):
        contract_problems.append(
            f"margin outline PDF直接検査を実行できない: {(result.stderr or result.stdout)[-300:]}"
        )
    if inputs.get("pdf_sha256") != sha256_file(pdf):
        contract_problems.append("margin outline PDF直接検査のPDF SHA256が一致しない")
    if inputs.get("glyph_map_sha256") != sha256_file(GLYPH_MAP):
        contract_problems.append("margin outline PDF直接検査のglyph map SHA256が一致しない")
    if inputs.get("dom_report_sha256") != sha256_file(dom_report_path):
        contract_problems.append("margin outline PDF直接検査のDOM証跡SHA256が一致しない")
    if inputs.get("mupdf_version") != SUPPORTED_MUPDF_VERSION:
        contract_problems.append("margin outline PDF直接検査のMuPDF versionが一致しない")
    if inputs.get("mupdf_entry_sha256") != sha256_file(MUPDF_ENTRY):
        contract_problems.append("margin outline PDF直接検査のMuPDF entry SHA256が一致しない")
    source = SRC_DIR / f"{pdf.stem}.md"
    if not source.is_file() or inputs.get("source_sha256") != sha256_file(source):
        contract_problems.append("margin outline PDF直接検査の原稿SHA256が一致しない")
    if not is_json_int(inputs.get("page_count")) or inputs.get("page_count") != total:
        contract_problems.append("margin outline PDF直接検査のページ数が一致しない")
    if inputs.get("title") != header:
        contract_problems.append("margin outline PDF直接検査のタイトルが一致しない")
    return contract_problems


def find_output_furniture_problems(
    pdf: Path, pages: list[str], header: str, total: int
) -> list[str]:
    """文字の柱を優先し、全欠落時だけ outline の厳密な証跡へ切り替える。"""
    text_problems = find_furniture_problems(pages, header)
    if not text_problems:
        return []
    if any(problem.startswith("表紙") for problem in text_problems):
        return text_problems
    receipt_problems = find_outline_receipt_problems(pdf, total, header)
    if receipt_problems:
        return [f"outline DOM証跡が不正: {receipt_problems[0]}"]
    direct_problems = find_margin_outline_pdf_problems(pdf, total, header)
    if direct_problems:
        return (
            text_problems
            + [f"outline直接検査が不正: {problem}" for problem in direct_problems]
        )
    return []


TOC_ENTRY = re.compile(r"\.{3,}\s*(\d+)\s*$", re.M)
H2 = re.compile(r"^##\s+(?!#)(.+)$")
# 目次の2段目に出る `### Step N:`。build_pdf_book.py の H3_STEP_RE と同じ形。
H3_STEP = re.compile(r"^###\s+(Step\s+[\d.]+\s*[:：].+)$")


def toc_entries(pages: list[str]) -> tuple[list[int], int]:
    """目次に並ぶページ番号と、目次が終わるページ番号を返す。

    ページを跨いで連結してから数えると、前ページの末尾と次ページの先頭が1行に
    繋がって実在しない項目を1件拾う。ページ単位で数える。
    目次は表紙の次から始まり、リーダー行が無いページに当たったところで終わる。
    """
    numbers: list[int] = []
    last = 1
    for number, text in enumerate(pages[1:], start=2):
        found = [int(n) for n in TOC_ENTRY.findall(text)]
        if not found:
            break
        numbers += found
        last = number
    return numbers, last


def toc_key(heading: str) -> str:
    """目次と見出しを突き合わせるための照合キー。

    producer と同じ関数で行内マークダウンを表示文字へ変え、poppler が足す空白を落とす。
    目次内の改行も照合前に消えるため、折り返す長い見出しも全文で区別できる。
    """
    return flatten(strip_inline_markdown(heading))


def find_toc_problems(pages: list[str], total_pages: int,
                      headings: list[str]) -> list[str]:
    """目次が見出しを網羅し、ページ番号が解決できているかを見る。

    target-counter は参照先の id が無いと 0 になる。組版は成功したまま、
    目次だけが役に立たない状態で出荷される。

    件数ではなく見出しの文字で突き合わせるのは、長い見出しが目次で折り返されると
    リーダー点と番号が2行目に回り、行数と項目数が一致しなくなるため。
    """
    numbers, last = toc_entries(pages)
    listed = flatten("".join(pages[1:last]))
    problems = [
        f"目次に出ていない見出し: {heading[:24]}"
        for heading in headings
        if toc_key(heading) not in listed
    ]
    if not numbers:
        problems.append("目次にページ番号が無い")
    for number in numbers:
        if not last < number <= total_pages:
            problems.append(f"目次のページ番号が範囲外: {number}")
    return sorted(set(problems))


def long_code_lines(source: str) -> list[str]:
    """原稿から、折り返しが要る長さのコード行を集める。"""
    lines: list[str] = []
    for lang, block in code_blocks(source):
        if lang in NON_TEXT_LANGS:
            continue
        lines += [line for _, line in block if len(line) > LONG_CODE]
    return lines


def normalize_code(text: str) -> str:
    """コード比較用に、抽出側の癖を吸収した形にする。

    空白を落とすのは、紙面で折り返された行に改行が入るため。
    ハイフンも落とす。pdftotext は行末のハイフンを「単語の分割」とみなして
    結合時に取り除く。`border-border` が折り返し位置に当たると `borderborder`
    として出てくるので、そのままでは欠落と区別がつかない。
    ハイフンの有無だけが違う行を見逃す代わりに、誤検出をゼロにする。
    """
    return flatten(text).replace("-", "")


def find_truncated_code(source: str, body_text: str) -> list[str]:
    """PDF から末尾が消えたコード行を挙げる。

    渡すのは柱とノンブルを抜いた本文。抜かずに繋ぐと、改ページを跨いだコード行の
    途中に柱が挟まって、正しく出ているものまで欠落に見える。
    """
    flat = normalize_code(body_text)
    missing: list[str] = []
    for line in long_code_lines(source):
        if normalize_code(line) not in flat:
            missing.append(line.strip())
    return missing


class ToolFailure(RuntimeError):
    """poppler のコマンドが結果を返せんかった。"""


def run_tool(command: list[str]) -> str:
    """poppler のコマンドを1つ動かして標準出力を返す。

    失敗を空文字で返してはいけない。「読めなかった」と「問題が無かった」が
    区別できなくなり、書体を1行も読めなかったPDFが合格として出てしまう。
    検査が見逃す形の失敗が一番たちが悪いので、必ず例外にして問題一覧へ載せる。
    """
    try:
        done = subprocess.run(
            command, capture_output=True, text=True, timeout=TOOL_TIMEOUT
        )
    except subprocess.TimeoutExpired:
        raise ToolFailure(f"{command[0]} が{TOOL_TIMEOUT}秒を超えても返らない") from None
    except OSError as error:
        raise ToolFailure(f"{command[0]} を起動できない: {error}") from error
    if done.returncode != 0:
        detail = done.stderr.strip()[:200] or "詳細なし"
        raise ToolFailure(f"{command[0]} が異常終了({done.returncode}): {detail}")
    return done.stdout


def read_pages(pdf: Path, count: int) -> list[str]:
    """ページごとの本文を返す。

    pdftotext はページの区切りに改ページ文字を入れる。ページ単位で呼び分けると
    36冊で2500回プロセスを起こすことになるので、1冊1回で取って割る。
    """
    pages = run_tool(["pdftotext", str(pdf), "-"]).split("\f")
    # 末尾の改ページ文字の後ろに空文字が1つ残る
    return pages[:count]


def read_info(pdf: Path) -> dict[str, str]:
    output = run_tool(["pdfinfo", str(pdf)])
    info: dict[str, str] = {}
    for line in output.split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            info[key.strip()] = value.strip()
    return info


def parse_font_table(output: str) -> list[tuple[str, str, str]]:
    """pdffonts の表を (書体名, 種別, 埋め込み) にほどく。

    列は固定位置で数えん。区切り線の `-` の並びから列の範囲を読み、見出し行と
    突き合わせて名前で引く。pdffonts は実装で列構成が違い、poppler は
    `name type encoding emb sub uni object ID`、xpdf は encoding が無く代わりに
    prob が入る。端から数える書き方だと、片方で emb ではなく隣の列を読む。
    """
    lines = output.split("\n")
    ruler = next(
        (n for n, line in enumerate(lines)
         if "-" in line and set(line) <= {"-", " "}),
        -1,
    )
    if ruler < 1:
        return []
    spans: list[tuple[int, int]] = []
    start: int | None = None
    for index, char in enumerate(lines[ruler] + " "):
        if char == "-" and start is None:
            start = index
        elif char != "-" and start is not None:
            spans.append((start, index))
            start = None
    header = [lines[ruler - 1][a:b].strip() for a, b in spans]
    rows: list[tuple[str, str, str]] = []
    for line in lines[ruler + 1:]:
        if not line.strip():
            continue
        cells = dict(zip(header, (line[a:b].strip() for a, b in spans)))
        # 読めなかった列は空文字で残す。埋め込み判定は「yes 以外は不合格」なので、
        # 取り違えたときは黙って通さず必ず落ちる側へ倒れる。
        rows.append((cells.get("name", ""), cells.get("type", ""), cells.get("emb", "")))
    return rows


def read_fonts(pdf: Path) -> list[tuple[str, str, str]]:
    return parse_font_table(run_tool(["pdffonts", str(pdf)]))


def find_link_problems(output: str) -> list[str]:
    """pdfinfo -url の注釈から、ビルド機械にしかないリンクを見つける。"""
    problems: list[str] = []
    for line in output.splitlines():
        match = re.match(r"\s*(\d+)\s+Annotation\s+(\S+)", line)
        if not match:
            continue
        page, url = match.groups()
        parsed = urlsplit(url)
        path = unquote(parsed.path)
        if ('/vivliostyle/' in path
                or (parsed.hostname in {'localhost', '127.0.0.1', '::1'}
                    and (parsed.port == 13000 or path.lower().endswith('.md')))
                or (not parsed.scheme and path.lower().endswith('.md'))):
            problems.append(f'p{page}: 配布先で開けないリンク: {url}')
    return sorted(set(problems))


def check_one(pdf: Path) -> list[str]:
    """1冊を見て、見つかった問題を並べる。"""
    problems: list[str] = []
    problems += find_link_problems(run_tool(['pdfinfo', '-url', str(pdf)]))
    info = read_info(pdf)
    total = int(info.get("Pages", "0"))
    if total == 0:
        return [f"{pdf.name}: ページが無い"]
    if A4_SIZE not in info.get("Page size", ""):
        problems.append(f"用紙が A4 でない: {info.get('Page size')}")

    header = info.get("Title", "")
    if not header:
        problems.append("タイトルが空（柱とPDFのプロパティに出る）")

    pages = read_pages(pdf, total)
    if len(pages) != total:
        return [f"{pdf.name}: 本文を {len(pages)} ページ分しか取り出せない（全 {total}）"]
    problems += [f"p{n}: 中身が無い" for n in find_blank_pages(pages, header)]
    problems += [f"p{n}: mermaid の原文が出ている" for n in find_mermaid_leaks(pages)]
    problems += find_output_furniture_problems(pdf, pages, header, total)
    fonts = read_fonts(pdf)
    # 表が空でも書体検査は「問題なし」を返す。読めなかったのか本当に無いのかを
    # 区別できんまま通すと、埋め込みを一度も見ていないPDFが合格になる。
    if not fonts:
        problems.append("書体を1つも読み取れない")
    problems += find_font_problems(fonts)

    source = SRC_DIR / f"{pdf.stem}.md"
    if source.is_file():
        text = source.read_text(encoding="utf-8")
        # コードブロックの中にも `## ` で始まる行があるので、地の文だけを拾う
        headings = [
            matched.group(1).strip()
            for matched in (
                (H2.match(line) or H3_STEP.match(line))
                for _, line in iter_prose(text)
            )
            if matched
        ]
        problems += find_toc_problems(pages, total, headings)
        body = "".join(
            page_residue(page, header, number)
            for number, page in enumerate(pages, start=1)
        )
        for line in find_truncated_code(text, body):
            problems.append(f"コード行が欠けている: {line[:60]}…")
    else:
        problems.append(f"対応する原稿が見つからない: {source.name}")

    return [f"{pdf.name}: {p}" for p in problems]


def expected_release_pdf_names() -> tuple[set[str], list[str]]:
    """対応台帳と実原稿から、販売用PDFの完全な名前集合を返す。"""
    problems: list[str] = []
    try:
        ledger = json.loads(CORRESPONDENCE_LEDGER.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        ledger = {}
        problems.append(f"対応台帳を読めない: {error}")

    combinations = ledger.get("combinations", []) if isinstance(ledger, dict) else []
    pdf_sets = [
        item for item in combinations
        if isinstance(item, dict) and item.get("id") == "pdf-set"
    ]
    if len(pdf_sets) != 1:
        problems.append("対応台帳の pdf-set が一意に定義されていない")
    else:
        pdf_set = pdf_sets[0]
        subject = pdf_set.get("subject", "")
        corresponds_to = pdf_set.get("corresponds_to", {})
        source_rule = (
            corresponds_to.get("sources", "")
            if isinstance(corresponds_to, dict)
            else ""
        )
        if f"全{EXPECTED_RELEASE_BOOKS}冊" not in subject:
            problems.append(
                f"対応台帳の pdf-set が全{EXPECTED_RELEASE_BOOKS}冊を宣言していない"
            )
        if "stem一致" not in source_rule:
            problems.append("対応台帳の pdf-set に原稿とPDFの stem一致規則が無い")

    sources = sorted(SRC_DIR.glob("*.md"))
    if len(sources) != EXPECTED_RELEASE_BOOKS:
        problems.append(
            f"販売用原稿が{EXPECTED_RELEASE_BOOKS}冊ではない（実際 {len(sources)}冊）"
        )
    names = {source.with_suffix(".pdf").name for source in sources}
    if len(names) != len(sources):
        problems.append("販売用原稿から導いたPDF名が重複している")
    return names, problems


def main(argv: list[str]) -> int:
    missing = [tool for tool in REQUIRED_TOOLS if shutil.which(tool) is None]
    if missing:
        print(f"❌ poppler のコマンドが見つかりません: {', '.join(missing)}", file=sys.stderr)
        print("   macOS: brew install poppler / Debian系: apt install poppler-utils",
              file=sys.stderr)
        return 2

    raw_args = argv[1:]
    # subset 組版では「抜け」は仕様（変更のあった冊だけ dist/pdf にある）なので、
    # pdf-book-gate の subset 経路から渡される --allow-gaps で連続性検査を退ける。
    # 全冊経路（make book-pdf-verify）では従来どおり抜けを検出する。
    allow_gaps = "--allow-gaps" in raw_args
    args = [argument for argument in raw_args if argument != "--allow-gaps"]
    if not args:
        args = [str(DEFAULT_PDF_DIR)]
    if len(args) != 1 or not Path(args[0]).is_dir():
        print("❌ PDF のディレクトリを1つ指定してください", file=sys.stderr)
        return 2
    pdfs = sorted(Path(args[0]).glob("*.pdf"))
    if not pdfs:
        print(f"❌ PDF がありません: {args[0]}", file=sys.stderr)
        return 2

    problems: list[str] = []

    if not allow_gaps:
        expected_names, inventory_problems = expected_release_pdf_names()
        problems += inventory_problems
        actual_names = {pdf.name for pdf in pdfs}
        missing_names = sorted(expected_names - actual_names)
        unexpected_names = sorted(actual_names - expected_names)
        if missing_names:
            problems.append("販売用PDFが不足: " + ", ".join(missing_names))
        if unexpected_names:
            problems.append("想定外のPDFがある: " + ", ".join(unexpected_names))

    # dayNN の内側の抜けを見る。glob で見つかった分しか検査しないので、
    # day07 だけ消えても今までは静かに緑だった。両端の欠落はここでは
    # 見つけられない（冊数の保証は release_manifest.py の側でやる）。
    day_numbers = {
        int(m.group(1)) for p in pdfs
        if (m := re.match(r"day(\d{2})_", p.name))
    }
    if day_numbers and not allow_gaps:
        for d in sorted(set(range(min(day_numbers), max(day_numbers) + 1)) - day_numbers):
            problems.append(f"day{d:02d} の PDF がありません")
    for pdf in pdfs:
        try:
            problems += check_one(pdf)
        except ToolFailure as failure:
            # 1冊が読めんかっただけで残りの検査ごと落とさない
            problems.append(f"{pdf.name}: 検査できない: {failure}")

    if problems:
        print(f"❌ {len(pdfs)}冊中に {len(problems)} 件の問題があります")
        for problem in problems:
            print(f"  {problem}")
        return 1

    if allow_gaps:
        print(
            f"✅ subset {len(pdfs)}冊の個別検査に合格しました"
            "（全36冊の販売用inventoryは未確認）"
        )
    else:
        print(f"✅ {len(pdfs)}冊すべて商品として出せる状態です")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
