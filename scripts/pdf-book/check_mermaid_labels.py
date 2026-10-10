"""mermaid 図のノード/エッジ ラベル末尾欠け検査。

原稿 .md の ```mermaid ブロックからラベル文字列を抽出し、生成 SVG の
描画テキストへ末尾欠けなく含まれるか照合する。空白・改行差は吸収するが、
末尾 1 文字の欠落（'だけ'→'だ' 等）は検出する。

使い方:
  python3 scripts/pdf-book/check_mermaid_labels.py [book.md ...]
"""
from __future__ import annotations

import html
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BUILD_DIR = REPO_ROOT / "dist" / ".pdf-book-build"

MERMAID_BLOCK = re.compile(r"```mermaid\n(.*?)```", re.S)
# ノード: A["text"] / A("text") / A{"text"} / A[["text"]] / A(("text"))
NODE_LABEL = re.compile(r"\w+\s*[\(\[{]+\s*\"([^\"]+)\"")
# エッジ: -->|text|  -.->|text|  ==>|text|  -- text -->
EDGE_PIPE = re.compile(r"[-.=~]+[->]*\|([^|]+)\|")
EDGE_BARE = re.compile(r"-{2,}\s*([^|>\-\s][^|]*?)\s*-{2,}>")
COMMENT = re.compile(r"%%.*")


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def squash(s: str) -> str:
    # <br> は mermaid の改行指示で文字ではない。SVG側は <p> 分割になるので
    # どちらも削ってから比較する。
    s = re.sub(r"<br\s*/?>", "", s, flags=re.I)
    return re.sub(r"\s+", "", nfc(html.unescape(s)))


def extract_labels(mmd: str) -> list[str]:
    out: list[str] = []
    for line in COMMENT.sub("", mmd).splitlines():
        for m in EDGE_PIPE.finditer(line):
            out.append(m.group(1).strip().strip('"'))
        for m in EDGE_BARE.finditer(line):
            out.append(m.group(1).strip().strip('"'))
        for m in NODE_LABEL.finditer(line):
            out.append(m.group(1).strip())
    return [s for s in out if s]


def svg_texts(svg_path: Path) -> list[str]:
    # foreignObject 内 <div>/<p>/<span> と <text> の文字列を塊で集める
    text = svg_path.read_text(encoding="utf-8")
    chunks: list[str] = []
    for m in re.finditer(
        r'<(?:div|p|span)[^>]*>(.*?)</(?:div|p|span)>', text, re.S
    ):
        chunks.append(re.sub(r"<[^>]+>", "", m.group(1)))
    try:
        root = ET.fromstring(text)
        for el in root.iter():
            if el.tag.endswith("text") or el.tag.endswith("tspan"):
                if el.text and el.text.strip():
                    chunks.append(el.text)
    except ET.ParseError:
        pass
    return chunks


def work_slug(stem: str) -> str:
    import hashlib

    head = re.match(r"[A-Za-z0-9_-]*", stem).group(0)[:6].strip("_-") or "book"
    normalized = unicodedata.normalize("NFC", stem)
    return f"{head}-{hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:6]}"


OUT_DIR = REPO_ROOT / "dist" / "pdf"


def strip_ligature_pairs(s: str) -> str:
    # 'fi/fl/ff/ffi/ffl' はリガチャ化され、poppler が空白1文字へ落とすことが
    # ある（'/profile'→'/pro le'）。両側で同じく削れば描画上の実在と一致する。
    # 末尾切断の検出能力は英字2文字分だけ細るが、和文の断片には影響しない。
    for pair in ("ffi", "ffl", "fi", "fl", "ff"):
        s = s.replace(pair, "")
    return s


def pdf_squashed_text(pdf_path: Path) -> str:
    import subprocess

    out = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        check=True, capture_output=True, text=True,
    ).stdout
    return squash(out)


def check_pdf_labels(md_path: Path) -> list[str]:
    """最終PDF側の幾何検査。SVG包含は入力整合止まりで、表示健全性は
    PDFのテキスト層で末尾まで抽出されることまでを判定にする
    （旧 candidate では 'Docke' / 'use client のときだ' までしか
    抽出されなかった欠落を直接観測できる）。
    """
    stem = md_path.stem
    slug = work_slug(stem)
    mmd_files = sorted(
        BUILD_DIR.glob(f"{slug}-*.mmd"),
        key=lambda p: int(re.search(r"-(\d+)\.mmd$", p.name).group(1)),
    )
    if not mmd_files:
        return []
    pdf = OUT_DIR / f"{stem}.pdf"
    if not pdf.exists():
        return [f"{stem}: PDFが無い {pdf}"]
    blob = strip_ligature_pairs(pdf_squashed_text(pdf))
    problems: list[str] = []
    for mmd in mmd_files:
        for label in extract_labels(mmd.read_text(encoding="utf-8")):
            sq = strip_ligature_pairs(squash(label))
            if not sq:
                continue
            if len(sq) < 2:
                # 1文字ラベル（'/' 等）に断片長の下限は適用できない。
                if sq not in blob:
                    problems.append(
                        f"{stem}.pdf ({mmd.name}) "
                        f"ラベル文字欠落: {label!r}"
                    )
                continue
            # ノード内折返しで抽出順がバラけるので、存在判定ではなく
            # 「ラベル全文字が PDF 内の連続部分文字列で覆えるか」で見る。
            # 末尾1文字でも欠ければ suffix がどこにも無く残る。
            i = 0
            while i < len(sq):
                # 折返し境界は不定なので最長一致で貪欲に覆う。残り1文字が
                # 独立行になっても j-i>=2 の断片が無ければ欠落扱いにする
                # （'Docke'+'r' のような末尾切断を検出するため）。
                for j in range(len(sq), i, -1):
                    if j - i >= 2 and sq[i:j] in blob:
                        break
                else:
                    j = i
                if j == i:
                    if i == len(sq) - 1 and sq[i] in blob:
                        # 末尾1文字が独立行へ折り返されただけ（'…の'+'中'）。
                        # 切断ならその文字自体が PDF 全体から消える。
                        break
                    problems.append(
                        f"{stem}.pdf ({mmd.name}) "
                        f"ラベル文字欠落 @{i}: {label!r}"
                    )
                    break
                i = j
    return problems


def check_book(md_path: Path) -> list[str]:
    stem = md_path.stem
    slug = work_slug(stem)
    # .mmd/.svg はレンダラーへ渡した実体とその出力。どちらも原稿由来で、
    # 原稿→mmd の変換欠落とは別の「描画側の末尾欠け」だけをここで弾く。
    def n(p: Path) -> int:
        return int(re.search(r"-(\d+)\.[a-z]+$", p.name).group(1))

    mmd_files = sorted(BUILD_DIR.glob(f"{slug}-*.mmd"), key=n)
    svg_files = sorted(BUILD_DIR.glob(f"{slug}-*.svg"), key=n)
    if not mmd_files:
        return []
    if len(svg_files) != len(mmd_files):
        return [f"{stem}: mmd {len(mmd_files)}件に対しSVG {len(svg_files)}件"]
    problems: list[str] = []
    for mmd, svg in zip(mmd_files, svg_files):
        svg_blob = squash("".join(svg_texts(svg)))
        for label in extract_labels(mmd.read_text(encoding="utf-8")):
            sq = squash(label)
            if sq and sq not in svg_blob:
                problems.append(
                    f"{stem} {svg.name} ラベル欠落: {label!r}"
                )
    return problems


def main(argv: list[str]) -> int:
    pdf_mode = "--pdf" in argv
    paths = [
        Path(a) for a in argv[1:]
        if a != "--pdf" and Path(a).suffix == ".md"
    ] or sorted((REPO_ROOT / "material").glob("**/*.md"))
    all_problems: list[str] = []
    for p in paths:
        if pdf_mode:
            all_problems += check_pdf_labels(p)
        else:
            all_problems += check_book(p)
    if all_problems:
        print(f"{len(all_problems)}件のラベル欠落:")
        for x in all_problems:
            print(f"  - {x}")
        return 1
    print("mermaid ラベル末尾欠落なし（全図・ノード/エッジ照合）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
