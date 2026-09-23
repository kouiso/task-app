#!/usr/bin/env python3
"""PDF の Poppler 抽出テキストと教材の fenced code を照合する診断。

この診断が確認するのは、``pdftotext`` が返すテキストに、Mermaid 以外の
トップレベル fenced code の文字列が原稿順・行順・出現回数どおり含まれる
ことです。原稿側の空白を正規化し、レンダラーが許可した位置で増える空白と
改行を許容します。blockquote 内の fence は未対応なので黙って除外せず失敗します。

この診断はブラウザや PDF ビューアのクリップボードを操作しません。
したがって、実ビューアからコピーした結果との同一性は証明しません。また、
Poppler はコードの視覚的な字下げや連続空白を保持しないため、空白の個数は
検証対象外です。コードブロックの外枠も抽出されないため、同じ文字列が本文に
ある場合の出所、ブロック境界、空行、ブロック間や最終行の次に独立して増えた
行は判定できません。実ビューアでのコピー確認は別の出荷要件として残ります。
"""

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "pdf-book"))
from code_wrap import atoms, break_before, classify_block  # noqa: E402

PDF_DIR = ROOT / "dist" / "pdf"
SRC_DIR = ROOT / "material" / "30days-curriculum"

OPEN_FENCE_RE = re.compile(r"^[ \t]{0,3}(`{3,}|~{3,})([^\n]*)$")
BLOCKQUOTE_FENCE_RE = re.compile(
    r"^(?:[ \t]{0,3}>[ \t]?)+[ \t]{0,3}(`{3,}|~{3,})([^\n]*)$"
)


class SourceFenceError(ValueError):
    """閉じていない fenced code を見つけた。"""


@dataclass(frozen=True)
class CodeBlock:
    lang: str
    lines: tuple[str, ...]
    start_line: int
    fence: str


@dataclass(frozen=True)
class MatchResult:
    ok: bool
    kind: str
    detail: str
    end: int


def fenced_code_blocks(md_path: Path) -> list[CodeBlock]:
    """トップレベルの backtick/tilde fence を外側から順に返す。"""
    blocks: list[CodeBlock] = []
    opener: tuple[str, int, str, int] | None = None
    body: list[str] = []

    for line_no, line in enumerate(
        md_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if opener is None:
            if BLOCKQUOTE_FENCE_RE.match(line):
                raise SourceFenceError(
                    f"{md_path}: line {line_no}: blockquote fenced code is unsupported"
                )
            match = OPEN_FENCE_RE.match(line)
            if not match:
                continue
            fence = match.group(1)
            info = match.group(2).strip()
            if fence[0] == "`" and "`" in info:
                continue
            lang = info.split()[0] if info else ""
            opener = (fence[0], len(fence), lang, line_no)
            body = []
            continue

        char, minimum, lang, start_line = opener
        if re.fullmatch(rf"[ \t]{{0,3}}{re.escape(char)}{{{minimum},}}[ \t]*", line):
            blocks.append(CodeBlock(lang, tuple(body), start_line, char * minimum))
            opener = None
            body = []
        else:
            body.append(line)

    if opener is not None:
        _, _, _, start_line = opener
        raise SourceFenceError(
            f"{md_path}: line {start_line}: fenced code is not closed"
        )
    return blocks


def pdf_text(pdf_path: Path) -> str:
    out = subprocess.run(
        ["pdftotext", "-enc", "UTF-8", str(pdf_path), "-"],
        capture_output=True,
        check=True,
    )
    return out.stdout.decode("utf-8")


def _is_extracted_line_start(pdf: str, idx: int) -> bool:
    """idx より前が行頭から空白だけなら True。"""
    previous_break = max(pdf.rfind("\n", 0, idx), pdf.rfind("\f", 0, idx))
    return not pdf[previous_break + 1 : idx].strip()


def try_match(probe: str, marks: set[int], pdf: str, idx: int) -> MatchResult:
    """idx から1原稿行を照合する。先頭インデントだけは比較しない。"""
    stripped = probe.lstrip()
    lead = len(probe) - len(stripped)
    source_index = lead
    pdf_index = idx
    source_length = len(probe)
    pdf_length = len(pdf)
    while source_index < source_length and pdf_index < pdf_length:
        source_char = probe[source_index]
        pdf_char = pdf[pdf_index]
        if source_char in " \t" and pdf_char in "\n\f \t":
            while source_index < source_length and probe[source_index] in " \t":
                source_index += 1
            while pdf_index < pdf_length and pdf[pdf_index] in "\n\f \t":
                pdf_index += 1
            continue
        if source_char == pdf_char:
            source_index += 1
            pdf_index += 1
            continue
        if pdf_char in "\n\f" or (pdf_char == " " and source_char != " "):
            gap_end = pdf_index
            while gap_end < pdf_length and pdf[gap_end] in "\n\f ":
                gap_end += 1
            if source_char == " ":
                source_index += 1
                pdf_index = gap_end
                continue
            if source_index in marks:
                pdf_index = gap_end
                continue
            return MatchResult(
                False,
                "unsafe-break",
                f"break at src offset {source_index} char {source_char!r} "
                f"ctx {probe[max(0, source_index - 15):source_index + 15]!r}",
                pdf_index,
            )
        return MatchResult(
            False,
            "mismatch",
            f"src[{source_index}]={source_char!r} pdf[{pdf_index}]={pdf_char!r} "
            f"ctx {probe[max(0, source_index - 15):source_index + 15]!r}",
            pdf_index,
        )
    if source_index < source_length:
        return MatchResult(
            False,
            "truncated",
            f"matched {source_index - lead}/{source_length - lead}",
            pdf_index,
        )
    line_breaks = [
        position
        for position in (pdf.find("\n", pdf_index), pdf.find("\f", pdf_index))
        if position >= 0
    ]
    extracted_line_end = min(line_breaks) if line_breaks else pdf_length
    extracted_tail = pdf[pdf_index:extracted_line_end]
    if extracted_tail.strip(" \t"):
        return MatchResult(
            False,
            "extra-character",
            f"unexpected text after source line: {extracted_tail!r}",
            pdf_index,
        )
    return MatchResult(True, "ok", "", pdf_index)


def _candidate_offsets(head: str, pdf: str, start: int):
    cursor = start
    while True:
        idx = pdf.find(head, cursor)
        if idx < 0:
            return
        if _is_extracted_line_start(pdf, idx):
            yield idx
        cursor = idx + 1


def _block_line_data(block: CodeBlock):
    line_atoms = [atoms(line) for line in block.lines]
    states_per_line = classify_block(line_atoms, block.lang)
    return [
        (line.rstrip(), break_before(line_atoms[index], states, block.lang))
        for index, (line, states) in enumerate(zip(block.lines, states_per_line))
        if line.rstrip()
    ]


def try_match_block(
    line_data: list[tuple[str, set[int]]], pdf: str, first_offset: int
) -> MatchResult:
    """1コードブロックを連続した抽出行として照合する。"""
    cursor = first_offset
    for index, (probe, marks) in enumerate(line_data):
        if index:
            while cursor < len(pdf) and pdf[cursor] in "\n\f \t":
                cursor += 1
        result = try_match(probe, marks, pdf, cursor)
        if not result.ok:
            return result
        cursor = result.end
    return MatchResult(True, "ok", "", cursor)


def find_block(
    block: CodeBlock, pdf: str, start: int
) -> tuple[MatchResult, int]:
    """start 以降でブロック全体が一致する最初の候補を返す。"""
    line_data = _block_line_data(block)
    if not line_data:
        return MatchResult(True, "empty", "", start), 0
    first_probe = line_data[0][0].lstrip()
    first_token = re.match(r"\S+", first_probe)
    head = first_token.group(0)[:10] if first_token else first_probe[:10]
    last_failure = MatchResult(
        False, "missing", f"prefix not found after offset {start}: {head!r}", start
    )
    for offset in _candidate_offsets(head, pdf, start):
        result = try_match_block(line_data, pdf, offset)
        if result.ok:
            return result, len(line_data)
        last_failure = result
    return last_failure, len(line_data)


def verify_document(
    blocks: list[CodeBlock], pdf: str
) -> tuple[int, int, list[tuple[int, str, str]], int, int]:
    """全ブロックを原稿順に一度ずつ消費して照合する。"""
    cursor = 0
    checked_lines = 0
    total_lines = 0
    mermaid_blocks = 0
    mermaid_lines = 0
    failures: list[tuple[int, str, str]] = []
    for block in blocks:
        nonblank = sum(bool(line.rstrip()) for line in block.lines)
        if block.lang == "mermaid":
            mermaid_blocks += 1
            mermaid_lines += nonblank
            continue
        total_lines += nonblank
        result, line_count = find_block(block, pdf, cursor)
        if result.ok:
            checked_lines += line_count
            cursor = result.end
        else:
            failures.append((block.start_line, result.kind, result.detail))
    return checked_lines, total_lines, failures, mermaid_blocks, mermaid_lines


def main() -> int:
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    sources = sorted(SRC_DIR.glob("*.md"))
    pdf_by_stem = {path.stem: path for path in pdfs}
    source_by_stem = {path.stem: path for path in sources}

    failures: list[str] = []
    if not pdfs:
        failures.append(f"PDF not found: {PDF_DIR}")
    if not sources:
        failures.append(f"source markdown not found: {SRC_DIR}")
    missing_pdfs = sorted(set(source_by_stem) - set(pdf_by_stem))
    extra_pdfs = sorted(set(pdf_by_stem) - set(source_by_stem))
    failures.extend(f"missing PDF for source: {stem}" for stem in missing_pdfs)
    failures.extend(f"PDF has no source markdown: {stem}" for stem in extra_pdfs)

    checked_lines = 0
    total_lines = 0
    mermaid_blocks = 0
    mermaid_lines = 0
    for stem in sorted(set(source_by_stem) & set(pdf_by_stem)):
        source = source_by_stem[stem]
        try:
            blocks = fenced_code_blocks(source)
        except SourceFenceError as error:
            failures.append(str(error))
            continue
        result = verify_document(blocks, pdf_text(pdf_by_stem[stem]))
        document_checked, document_total, document_failures, mb, ml = result
        checked_lines += document_checked
        total_lines += document_total
        mermaid_blocks += mb
        mermaid_lines += ml
        for source_line, kind, detail in document_failures:
            failures.append(
                f"{pdf_by_stem[stem].name}: source line {source_line}: "
                f"{kind}: {detail}"
            )

    if sources and total_lines == 0:
        failures.append("no nonblank non-Mermaid fenced-code lines were discovered")

    print(
        f"Poppler extraction coverage: {checked_lines}/{total_lines} nonblank "
        f"fenced-code lines across {len(set(source_by_stem) & set(pdf_by_stem))} PDFs"
    )
    print(
        f"Explicit exclusion: Mermaid {mermaid_blocks} blocks / {mermaid_lines} lines "
        "(rendered diagrams, not copyable code)"
    )
    print("UNVERIFIED: visual indentation and exact whitespace counts in code")
    print("UNVERIFIED: blank code lines")
    print("UNVERIFIED: text provenance and visual code-block boundaries")
    print("UNVERIFIED: standalone extra lines between or after code blocks")
    print("UNVERIFIED: clipboard output from browsers and PDF viewers")

    if failures:
        print(f"DIAGNOSTIC FAILURES: {len(failures)}")
        for failure in failures[:100]:
            print(" ", failure)
        return 1
    print("POPLER EXTRACTION DIAGNOSTIC PASSED")
    print("Actual viewer copy verification is still required before release.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
