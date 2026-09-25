#!/usr/bin/env python3
"""verify_pdf_copy の fail-closed と順序照合の退行テスト。"""

from __future__ import annotations

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import verify_pdf_copy as target  # noqa: E402


def block(*lines: str, lang: str = "typescript") -> target.CodeBlock:
    return target.CodeBlock(lang, lines, 1, "```")


def expect_failure(
    failures: list[str], name: str, blocks: list[target.CodeBlock], pdf: str
) -> None:
    _, _, found, _, _ = target.verify_document(blocks, pdf)
    if not found:
        failures.append(f"{name}: invalid extraction passed")


def main() -> int:
    failures: list[str] = []
    long_a = "alpha_head_" + "A" * 90
    long_b = "beta__head_" + "B" * 90

    checked, total, found, _, _ = target.verify_document(
        [block(long_a, long_a)], f"{long_a}\n{long_a}\n"
    )
    if found or (checked, total) != (2, 2):
        failures.append(f"valid duplicate lines failed: {found}")

    checked, total, found, _, _ = target.verify_document(
        [block("- Local:        http://localhost:3000")],
        "- Local: http://localhost:3000\n",
    )
    if found or (checked, total) != (1, 1):
        failures.append(f"Poppler whitespace collapse was rejected: {found}")

    expect_failure(
        failures,
        "missing duplicate occurrence",
        [block(long_a, long_a)],
        f"{long_a}\n",
    )
    expect_failure(
        failures,
        "reordered lines",
        [block(long_a, long_b)],
        f"{long_b}\n{long_a}\n",
    )
    expect_failure(
        failures,
        "extra suffix",
        [block(long_a)],
        f"{long_a}__EXTRA__\n",
    )
    expect_failure(
        failures,
        "extra suffix after whitespace on final line",
        [block("const x = 1;")],
        "const x = 1; EXTRA\n",
    )
    checked, total, found, _, _ = target.verify_document(
        [block("const x = 1;")], "const x = 1;   \n本文\n"
    )
    if found or (checked, total) != (1, 1):
        failures.append(f"following prose on a new line was rejected: {found}")
    expect_failure(
        failures,
        "extra line inside block",
        [block(long_a, long_b)],
        f"{long_a}\nunexpected_code()\n{long_b}\n",
    )
    expect_failure(
        failures,
        "short line missing",
        [block("npm install", long_a)],
        f"{long_a}\n",
    )

    # 改ページを跨ぐブロック: ノンブルと柱が断片の間に挟まっても一致する
    furnished = (
        "Day 01: 開発環境\n本文\n"
        f"{long_a}\n\n51\n\f"
        "Day 01: 開発環境\n"
        f"{long_b}\n\n52\n\f"
        "Day 01: 開発環境\n本文\n"
    )
    stripped = target.strip_page_furniture(furnished)
    if "51" in stripped or "52" in stripped or stripped.count("Day 01: 開発環境") != 1:
        failures.append(f"page furniture was not stripped: {stripped!r}")
    checked, total, found, _, _ = target.verify_document(
        [block(long_a, long_b)], stripped
    )
    if found or (checked, total) != (2, 2):
        failures.append(f"block across a page break failed: {found}")
    expect_failure(
        failures,
        "furniture left in place still breaks the block",
        [block(long_a, long_b)],
        furnished,
    )
    if "only_once_first_line" not in target.strip_page_furniture(
        "x\n\fonly_once_first_line\ncode\n\fDay\n\fDay\n"
    ):
        failures.append("a first line seen on one page only was stripped as a header")

    # 異体字セレクタ: pdftotext は VS16/VS15 を落とすので、原稿側も除いて照合する
    for name, source_line in (
        ("VS16", "// ⚠️ 注意: この行は消さない"),
        ("VS15", "// ⚠︎ 注意: この行は消さない"),
    ):
        checked, total, found, _, _ = target.verify_document(
            [block(source_line)], "// ⚠ 注意: この行は消さない\n"
        )
        if found or (checked, total) != (1, 1):
            failures.append(f"{name} on the source side was not stripped: {found}")
    if target.strip_variation_selectors("a️b︎c") != "abc":
        failures.append("strip_variation_selectors left a selector behind")

    # 組版の強制改行: JSX 子テキストの開始タグ直後は code_wrap が <br> を入れる
    jsx_line = " " * 16 + '<h3 className="font-semibold">コメント</h3>'
    if target.line_width(target.atoms(jsx_line)) <= target.SAFE_COLS:
        failures.append("JSX fixture no longer exceeds SAFE_COLS")
    checked, total, found, _, _ = target.verify_document(
        [block(jsx_line, lang="tsx")],
        '<h3 className="font-semibold">\nコメント</h3>\n',
    )
    if found or (checked, total) != (1, 1):
        failures.append(f"renderer forced break after a JSX open tag was rejected: {found}")
    expect_failure(
        failures,
        "break inside a JSX attribute string",
        [block(jsx_line, lang="tsx")],
        '<h3 className="font-\nsemibold">コメント</h3>\n',
    )
    expect_failure(
        failures,
        "break after a JSX open tag on a line that fits",
        [block("<h3>コメント</h3>", lang="tsx")],
        "<h3>\nコメント</h3>\n",
    )

    # 実体参照を含む行: `&amp;` は1原子だが原稿では5文字。参照以降の折れ候補は
    # 文字オフセットで後ろへずれるため、原子番号のままだと安全な折れを unsafe-break と誤る。
    checked, total, found, _, _ = target.verify_document(
        [block("x &amp;y", lang="text")], "x &amp;\ny\n"
    )
    if found or (checked, total) != (1, 1):
        failures.append(f"permitted break after an entity was rejected: {found}")
    expect_failure(
        failures,
        "break inside an entity reference",
        [block("x &amp;y", lang="text")],
        "x &am\np;y\n",
    )

    # -layout: 桁揃えした列の抽出順を保つため Poppler を -layout で呼ぶ
    original_run = target.subprocess.run
    calls: list[list[str]] = []

    class Completed:
        stdout = "a️b\n".encode("utf-8")

    def fake_run(args, **_kwargs):
        calls.append(list(args))
        return Completed()

    target.subprocess.run = fake_run
    try:
        text = target.pdf_text(Path("sample.pdf"))
    finally:
        target.subprocess.run = original_run
    if not calls or "-layout" not in calls[0]:
        failures.append(f"pdftotext was not called with -layout: {calls}")
    if text != "ab\n":
        failures.append(f"pdf_text kept a variation selector: {text!r}")
    checked, total, found, _, _ = target.verify_document(
        [block("  id        String    @id @default(cuid())", lang="prisma")],
        "  id        String    @id @default(cuid())\n",
    )
    if found or (checked, total) != (1, 1):
        failures.append(f"layout-aligned columns were rejected: {found}")

    with tempfile.TemporaryDirectory() as directory:
        md = Path(directory) / "sample.md"
        md.write_text(
            "~~~md title=README.md\n# title\n```bash\nnpm install\n```\n~~~\n"
            "````typescript\nconst marker = \"```\";\n````\n",
            encoding="utf-8",
        )
        blocks = target.fenced_code_blocks(md)
        if [item.lang for item in blocks] != ["md", "typescript"]:
            failures.append(f"tilde/four-backtick parsing failed: {blocks}")
        if blocks[0].lines != (
            "# title",
            "```bash",
            "npm install",
            "```",
        ):
            failures.append(f"nested fence content was lost: {blocks[0].lines}")

        md.write_text("```typescript\nconst x = 1;\n", encoding="utf-8")
        try:
            target.fenced_code_blocks(md)
        except target.SourceFenceError:
            pass
        else:
            failures.append("unclosed fence did not fail")

        md.write_text("> ```bash\n> npm install\n> ```\n", encoding="utf-8")
        try:
            target.fenced_code_blocks(md)
        except target.SourceFenceError as error:
            if "blockquote fenced code is unsupported" not in str(error):
                failures.append(f"blockquote fence failed for the wrong reason: {error}")
        else:
            failures.append("unsupported blockquote fence was silently omitted")

    original_pdf_dir = target.PDF_DIR
    original_src_dir = target.SRC_DIR
    original_pdf_text = target.pdf_text
    try:
        with tempfile.TemporaryDirectory() as pdf_dir, tempfile.TemporaryDirectory() as src_dir:
            target.PDF_DIR = Path(pdf_dir)
            target.SRC_DIR = Path(src_dir)
            with contextlib.redirect_stdout(io.StringIO()) as output:
                exit_code = target.main()
            if exit_code == 0 or "PDF not found" not in output.getvalue():
                failures.append("empty PDF directory did not fail closed")

        with tempfile.TemporaryDirectory() as pdf_dir, tempfile.TemporaryDirectory() as src_dir:
            target.PDF_DIR = Path(pdf_dir)
            target.SRC_DIR = Path(src_dir)
            (target.PDF_DIR / "sample.pdf").touch()
            (target.SRC_DIR / "sample.md").write_text(
                "```bash\nnpm install\n```\n", encoding="utf-8"
            )
            target.pdf_text = lambda _: "npm install\n"
            with contextlib.redirect_stdout(io.StringIO()) as output:
                exit_code = target.main()
            report = output.getvalue()
            if exit_code != 0:
                failures.append(f"valid diagnostic failed: {report}")
            if "UNVERIFIED: clipboard output" not in report:
                failures.append("actual viewer limitation is missing from success output")
            if "UNVERIFIED: blank code lines" not in report:
                failures.append("blank-line limitation is missing from success output")
            if "UNVERIFIED: text provenance" not in report:
                failures.append("text-provenance limitation is missing from success output")
            if "ALL LINES COPY-SAFE" in report or "viewer copy verification passed" in report:
                failures.append("success output overclaims actual viewer copy safety")
    finally:
        target.PDF_DIR = original_pdf_dir
        target.SRC_DIR = original_src_dir
        target.pdf_text = original_pdf_text

    if failures:
        print(f"FAILURES: {len(failures)}")
        for failure in failures:
            print(" ", failure)
        return 1
    print("verify_pdf_copy regression tests: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
