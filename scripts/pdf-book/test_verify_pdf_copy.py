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
