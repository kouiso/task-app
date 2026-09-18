#!/usr/bin/env python3
"""R03 最終検証: 生成PDFの抽出テキスト（=ビューアのコピー結果に相当）と
正本（material/**/*.md）のコード行を照合する。

各長行について、code_wrap が折り返し候補として許可した位置集合
（break_before の marks）を正本側で再計算し、PDF 上で実際に起きた折れが
その集合に収まることを確認する。集合外の位置（トークン途中・strict文字列内・
行指向言語の内部）で折れている行があればコピー破壊として不合格。

折れ位置の突合: 正本行を PDF テキストに貪欲に当てはめる。PDF 側に改行・空白
ランが現れた時、正本側が空白なら吸収（空白→改行の置換）。正本側が空白で
なければ、そのオフセットが marks に含まれることを要求する。
"""
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "pdf-book"))
from code_wrap import (  # noqa: E402
    SAFE_COLS,
    atom_char,
    atoms,
    break_before,
    classify_block,
    line_width,
)

PDF_DIR = ROOT / "dist" / "pdf"
SRC_DIR = ROOT / "material" / "30days-curriculum"


def display_width(s: str) -> int:
    w = 0
    for ch in s:
        w += 2 if unicodedata.east_asian_width(ch) in ("W", "F", "A") else 1
    return w


def fenced_code_lines(md_path: Path):
    """md から ```lang / ~~~lang の中身を (lang, [lines]) で返す。"""
    text = md_path.read_text(encoding="utf-8")
    for m in re.finditer(r"(```|~~~)([^\n`~]*)\n(.*?)\1", text, re.S):
        lang = m.group(2).strip().split()[0] if m.group(2).strip() else ""
        yield lang, m.group(3).split("\n")


def pdf_text(pdf_path: Path) -> str:
    out = subprocess.run(
        ["pdftotext", "-layout", "-enc", "UTF-8", str(pdf_path), "-"],
        capture_output=True, check=True,
    )
    text = out.stdout.decode("utf-8")
    # pdftotext は異体字セレクタを落とすので比較前に両側から除く
    return text.replace("\uFE0F", "").replace("\uFE0E", "")


def strip_page_furniture(text: str) -> str:
    """抽出テキストからノンブルと柱（走り見出し）を取り除く。

    コードブロックが改ページを跨ぐと、断片の間にページ番号と柱の行が
    抽出順で挟まり、正本との照合がそこで切れる。家具は検査対象のコード
    行ではないので、照合前に取り除く。
    ページ番号は \\f 直前の数字だけの行、柱は \\f 直後の最初の非空行で、
    各冊子で同一文字列（書名）が繰り返されることを利用して同定する。
    """
    pages = text.split("\f")
    # 柱の同定: 各ページの最初の非空行を集め、複数ページで繰り返される
    # ものを走り見出しとみなす（書名や章題が同じ文字列で毎ページ出るため。
    # 1回だけの先頭行は本文なので残す）
    first_lines: dict[str, int] = {}
    for page in pages[1:]:
        for line in page.split("\n"):
            if line.strip():
                key = line.strip()
                first_lines[key] = first_lines.get(key, 0) + 1
                break
    headers = {k for k, v in first_lines.items() if v >= 2}
    cleaned = []
    for i, page in enumerate(pages):
        lines = page.split("\n")
        for j in range(len(lines) - 1, -1, -1):
            if lines[j].strip():
                if re.fullmatch(r"\s*\d{1,4}\s*", lines[j]):
                    lines[j] = ""
                break
        if i > 0:
            for j in range(len(lines)):
                if lines[j].strip():
                    if lines[j].strip() in headers:
                        lines[j] = ""
                    break
        cleaned.append("\n".join(lines))
    return "\n".join(cleaned)


def verify_line(probe: str, marks: set[int], pdf: str, used: list[int]):
    """正本行 probe を pdf 中で照合する。marks は折れ許可オフセット集合。
    used は同じ行が複数出る場合のための開始位置候補（先頭から複数試す）。
    戻り値: (ok, kind, detail)"""
    stripped = probe.lstrip()
    lead = len(probe) - len(stripped)
    toks = stripped.split()
    head = toks[0][:20] if toks else ""
    if not head:
        return True, "blank", ""
    # アンカー: 先頭トークン最大20文字。折れ位置（marks）を跨ぐと PDF 上で
    # 連続した文字列にならないので、marks 位置に \s* を挟んだ正規表現で
    # 出現位置を列挙する（連続マッチで探すと head 内部の折れが致命的になる）
    pat = ""
    si = lead
    taken = 0
    n = len(probe)
    while si < n and probe[si] not in " \t" and taken < 20:
        if si in marks:
            pat += r"\s*"
        pat += re.escape(probe[si])
        si += 1
        taken += 1
    last = None
    for m in re.finditer(f"(?={pat})", pdf):
        ok, kind, detail, end = try_match(probe, marks, pdf, m.start())
        if ok:
            return True, kind, detail
        last = (False, kind, detail)
    if last is not None:
        return last
    return False, "missing", f"prefix not found: {head!r}"


_WS = " \t\n\f"


def try_match(probe: str, marks: set[int], pdf: str, idx: int):
    """idx を行頭として、probe の各文字を pdf に当てはめる。

    空白の突合ルール:
    - 正本側が空白 → PDF 側が空白・改行ランなら両方まとめて読み飛ばす
      （空白位置での折れ・桁揃え幅の違いはコピーを壊さないので常に安全）
    - 正本側が非空白で PDF 側が空白ラン → そのオフセットが marks に
      含まれる場合だけ許可（許可位置での折れ）
    - 正本側の空白が PDF で非空白に潰れている → 空白喪失なので不一致
    """
    stripped = probe.lstrip()
    lead = len(probe) - len(stripped)
    # idx は stripped 先頭を指しているはず（probe のインデントをスキップ）
    si = lead
    pi = idx
    n = len(probe)
    plen = len(pdf)
    while si < n and pi < plen:
        sc = probe[si]
        pc = pdf[pi]
        if sc in " \t":
            if pc in _WS:
                # 空白ランの中に改行が混ざるなら「折れ」が起きている。
                # 折り点は空白ランの中か直後の文字位置に立つので、正本側の
                # 空白ランの範囲 [si, si2] のどこかに marks が無いと不許可
                # （LINE_ATOMIC 言語や `return` 直後の空白で折れた場合は
                # 貼り付け結果が壊れる）。空白だけのランは桁揃え差なので吸収。
                si2 = si
                while si2 < n and probe[si2] in " \t":
                    si2 += 1
                end = pi
                while end < plen and pdf[end] in _WS:
                    end += 1
                if "\n" in pdf[pi:end] or "\f" in pdf[pi:end]:
                    if not any(o in marks for o in range(si, si2 + 1)):
                        return False, "unsafe-break", (
                            f"break at src space offset {si}-{si2} "
                            f"ctx {probe[max(0, si - 15):si2 + 15]!r}"
                        ), pi
                si = si2
                pi = end
                continue
            return False, "mismatch", (
                f"src space lost at {si}: pdf={pc!r} "
                f"ctx {probe[max(0, si - 15):si + 15]!r}"
            ), pi
        if pc in _WS:
            if si in marks:
                while pi < plen and pdf[pi] in _WS:
                    pi += 1
                continue
            return False, "unsafe-break", (
                f"break at src offset {si} char {sc!r} "
                f"ctx {probe[max(0, si - 15):si + 15]!r}"
            ), pi
        if sc == pc:
            si += 1
            pi += 1
            continue
        return False, "mismatch", (
            f"src[{si}]={sc!r} pdf[{pi}]={pc!r} "
            f"ctx {probe[max(0, si - 15):si + 15]!r}"
        ), pi
    if si < n:
        return False, "truncated", f"matched {si - lead}/{n - lead}", pi
    return True, "ok", "", pi


def main() -> int:
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    md_by_stem = {p.stem: p for p in SRC_DIR.glob("*.md")}
    total = ok = 0
    failures = []
    for pdf_path in pdfs:
        md = md_by_stem.get(pdf_path.stem)
        if not md:
            print(f"SKIP no source: {pdf_path.name}")
            continue
        pdf = strip_page_furniture(pdf_text(pdf_path))
        for lang, lines in fenced_code_lines(md):
            if lang == "mermaid":
                continue
            # pdftotext は異体字セレクタを落とすので、照合は正本側も
            # 除いた形で行い、オフセットを marks と揃える
            lines = [
                line.replace("\uFE0F", "").replace("\uFE0E", "")
                for line in lines
            ]
            lines_atoms = [atoms(line) for line in lines]
            states_per = classify_block(lines_atoms, lang)
            for line, la, states in zip(lines, lines_atoms, states_per):
                if line_width(la) <= SAFE_COLS:
                    continue
                probe = line.rstrip()
                if not probe:
                    continue
                total += 1
                marks = break_before(la, states, lang)
                good, kind, detail = verify_line(probe, marks, pdf, [])
                if good:
                    ok += 1
                else:
                    failures.append(
                        (pdf_path.name, lang, kind, probe[:60], detail)
                    )
    print(f"checked {total} over-length code lines across {len(pdfs)} PDFs")
    print(f"ok: {ok}")
    if failures:
        print(f"FAILURES: {len(failures)}")
        for f in failures[:50]:
            print(" ", f)
        return 1
    print("ALL LINES COPY-SAFE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
