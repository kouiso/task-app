#!/usr/bin/env python3
"""各ページの本文埋まり具合を測り、薄いページと空白ページ換算を冊ごとに出す。

issue #407 の計測用。keep-together（pre / figure / .pdf-stacked-row の
break-inside: avoid）で改ページが起きると、手前のページが説明文だけの
薄いページになる。修正前後で同じ方法を使うため、このスクリプトに切り出す。

測り方
------
- `pdftoppm -gray -r 72` で各ページを描画し、版面（x∈[22,188]mm,
  y∈[25,272]mm。check_page_layout.py と同じ定義）の中で墨のある行が
  占める高さの割合を「埋まり具合」とする。
  行単位で見るのは、文字の密度ではなく「本文が版面のどこまで使えたか」を
  測るため。1行あればその行の高さを使ったとみなす。
- 埋まり具合が 35% 未満のページを「薄いページ」と数える。
  表紙・目次は元々埋まらないので対象外にする。表紙は先頭ページ、
  目次はドットリーダー（......）行が多いページとして検出する。
- 「空白ページ換算」は、各薄いページの空き率 (1 - 埋まり具合) の合計。
  薄いページ1枚がまるまる空なら1.0ページ分の無駄になる。

使い方: python3 scripts/pdf-book/measure_page_fill.py [dist/pdf]
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PDF_DIR = REPO_ROOT / "dist" / "pdf"

# 版面の定義は check_page_layout.py と同じ（mm）
TEXT_LEFT_MM = 22.0
TEXT_RIGHT_MM = 188.0
TEXT_TOP_MM = 25.0
TEXT_BOTTOM_MM = 272.0
RENDER_DPI = 72
INK_LEVEL = 230

# 薄いページのしきい値。issue #407 の「本文35%未満」に合わせる
THIN_FILL_LIMIT = 0.35
# 目次ページと判定するドットリーダー行の数
TOC_DOT_LEADER_MIN = 3
# ドットリーダー1行とみなす連続ドットの長さ
TOC_DOT_RUN = "...."

INK_TABLE = bytes(1 if level < INK_LEVEL else 0 for level in range(256))


def page_fill(pgm_path: Path) -> float:
    """版面の中で、墨のある行が占める高さの割合を返す。"""
    data = pgm_path.read_bytes()
    parts = data.split(b"\n", 3)
    if len(parts) != 4 or parts[0] != b"P5":
        raise ValueError(f"PGM(P5) ではない: {pgm_path}")
    width, height = (int(n) for n in parts[1].split())
    pixels = parts[3].translate(INK_TABLE)
    left = int(TEXT_LEFT_MM * RENDER_DPI / 25.4)
    right = int(TEXT_RIGHT_MM * RENDER_DPI / 25.4)
    top = int(TEXT_TOP_MM * RENDER_DPI / 25.4)
    bottom = int(TEXT_BOTTOM_MM * RENDER_DPI / 25.4)
    inked_rows = 0
    for y in range(top, min(bottom, height)):
        row = pixels[y * width + left:y * width + right]
        if 1 in row:
            inked_rows += 1
    return inked_rows / max(1, bottom - top)


def toc_page_numbers(pdf: Path) -> set[int]:
    """ドットリーダー行が多いページ = 目次ページの集合を返す（1始まり）。"""
    extracted = subprocess.run(
        ["pdftotext", str(pdf), "-"], check=True, capture_output=True, text=True,
    ).stdout
    pages: set[int] = set()
    for index, page_text in enumerate(extracted.split("\f"), start=1):
        leaders = sum(1 for line in page_text.splitlines()
                      if TOC_DOT_RUN in line)
        if leaders >= TOC_DOT_LEADER_MIN:
            pages.add(index)
    return pages


def measure_book(pdf: Path, work: Path) -> dict:
    subprocess.run(
        ["pdftoppm", "-gray", "-r", str(RENDER_DPI), str(pdf), str(work / "p")],
        check=True, capture_output=True,
    )
    pages = sorted(work.glob("p-*.pgm"))
    fills = [page_fill(image) for image in pages]
    excluded = {1} | toc_page_numbers(pdf)
    thin = [index + 1 for index, fill in enumerate(fills)
            if fill < THIN_FILL_LIMIT and index + 1 not in excluded]
    blank_equiv = sum(1.0 - fill for index, fill in enumerate(fills)
                      if fill < THIN_FILL_LIMIT and index + 1 not in excluded)
    return {
        "name": pdf.name,
        "pages": len(pages),
        "thin_pages": len(thin),
        "thin_page_numbers": thin,
        "blank_page_equivalent": round(blank_equiv, 2),
    }


def main(argv: list[str]) -> int:
    if shutil.which("pdftoppm") is None or shutil.which("pdftotext") is None:
        print("❌ pdftoppm / pdftotext が見つかりません", file=sys.stderr)
        return 2
    pdf_dir = Path(argv[1]) if len(argv) > 1 else DEFAULT_PDF_DIR
    if len(argv) > 1 and not pdf_dir.is_dir():
        print("❌ PDF のディレクトリを1つ指定してください", file=sys.stderr)
        return 2
    pdfs = sorted(pdf_dir.glob("*.pdf"))
    if not pdfs:
        print(f"❌ PDF がありません: {pdf_dir}", file=sys.stderr)
        return 2
    results = []
    for pdf in pdfs:
        with tempfile.TemporaryDirectory() as work:
            results.append(measure_book(pdf, Path(work)))
        print(f"  {results[-1]['name']}: {results[-1]['pages']}ページ / "
              f"薄いページ{results[-1]['thin_pages']} / "
              f"空白換算{results[-1]['blank_page_equivalent']}", flush=True)
    total = {
        "books": len(results),
        "pages": sum(r["pages"] for r in results),
        "thin_pages": sum(r["thin_pages"] for r in results),
        "blank_page_equivalent": round(
            sum(r["blank_page_equivalent"] for r in results), 2),
        "results": results,
    }
    print(json.dumps({k: v for k, v in total.items() if k != "results"},
                     ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
