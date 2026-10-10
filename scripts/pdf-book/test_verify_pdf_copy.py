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
    opening = 'const element = <p className="font-bold">' + '日本語' * 12 + '</p>;'
    extracted_opening = opening.replace('>日本語', '>\n日本語', 1)
    if target.verify_document([block(opening, lang="tsx")], extracted_opening)[2]:
        failures.append("生成側が選ぶJSX開始タグ直後の改行を拒否した")
    literal_greater = 'const element = <p>A>' + 'B' * 80 + '</p>;'
    expect_failure(failures, "literal JSX greater-than split", [block(literal_greater, lang="tsx")],
                   literal_greater.replace('A>B', 'A>\nB', 1))
    expect_failure(failures, "missing subtraction operator", [block('const n = limit - value;')],
                   'const n = limit value;')

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

        md.write_text(
            '```typescript\nconst warning = "⚠️";\nconst ordinary = "⚠X";\n```\n',
            encoding="utf-8",
        )
        blocks = target.fenced_code_blocks(md)
        expected = ('const warning = "⚠";', 'const ordinary = "⚠X";')
        if blocks[0].lines != expected:
            failures.append(f"U+FE0F-only normalization drifted: {blocks[0].lines}")
        checked, total, found, _, _ = target.verify_document(blocks, "\n".join(expected) + "\n")
        if found or (checked, total) != (2, 2):
            failures.append(f"producer-equivalent U+FE0F output was rejected: {found}")
        expect_failure(
            failures,
            "ordinary character split remains unsafe",
            blocks,
            'const warning = "⚠";\nconst ordinary = "⚠\nX";\n',
        )

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
                exit_code = target.main([])
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
                exit_code = target.main(["--allow-gaps"])
            report = output.getvalue()
            if exit_code != 0:
                failures.append(f"valid diagnostic failed: {report}")
            if "POPLER EXTRACTION SUBSET DIAGNOSTIC PASSED" not in report:
                failures.append("subset success was not identified as a subset diagnostic")
            if "UNVERIFIED: full source inventory" not in report:
                failures.append("subset success overclaims full source coverage")
            if "UNVERIFIED: clipboard output" not in report:
                failures.append("actual viewer limitation is missing from success output")
            if "UNVERIFIED: blank code lines" not in report:
                failures.append("blank-line limitation is missing from success output")
            if "UNVERIFIED: text provenance" not in report:
                failures.append("text-provenance limitation is missing from success output")
            if "ALL LINES COPY-SAFE" in report or "viewer copy verification passed" in report:
                failures.append("success output overclaims actual viewer copy safety")

        with tempfile.TemporaryDirectory() as pdf_dir, tempfile.TemporaryDirectory() as src_dir:
            target.PDF_DIR = Path(pdf_dir)
            target.SRC_DIR = Path(src_dir)
            (target.PDF_DIR / "sample.pdf").touch()
            (target.SRC_DIR / "sample.md").write_text(
                "```bash\nnpm install\n```\n", encoding="utf-8"
            )
            (target.SRC_DIR / "missing.md").write_text(
                "```bash\nnpm test\n```\n", encoding="utf-8"
            )
            target.pdf_text = lambda _: "npm install\n"
            with contextlib.redirect_stdout(io.StringIO()) as output:
                exit_code = target.main([])
            if exit_code == 0 or "missing PDF for source: missing" not in output.getvalue():
                failures.append("full verification accepted a missing source PDF")
            with contextlib.redirect_stdout(io.StringIO()) as output:
                exit_code = target.main(["--allow-gaps"])
            if exit_code != 0:
                failures.append(f"explicit subset verification failed: {output.getvalue()}")

        with tempfile.TemporaryDirectory() as pdf_dir, tempfile.TemporaryDirectory() as src_dir:
            target.PDF_DIR = Path(pdf_dir)
            target.SRC_DIR = Path(src_dir)
            (target.PDF_DIR / "sample.pdf").touch()
            (target.PDF_DIR / "extra.pdf").touch()
            (target.SRC_DIR / "sample.md").write_text(
                "```bash\nnpm install\n```\n", encoding="utf-8"
            )
            target.pdf_text = lambda _: "npm install\n"
            with contextlib.redirect_stdout(io.StringIO()) as output:
                exit_code = target.main(["--allow-gaps"])
            if exit_code == 0 or "PDF has no source markdown: extra" not in output.getvalue():
                failures.append("subset verification accepted a PDF without source markdown")

        with tempfile.TemporaryDirectory() as pdf_dir, tempfile.TemporaryDirectory() as src_dir:
            target.PDF_DIR = Path(pdf_dir)
            target.SRC_DIR = Path(src_dir)
            (target.PDF_DIR / "sample.pdf").touch()
            (target.SRC_DIR / "sample.md").write_text(
                "```mermaid\ngraph TD\n```\n", encoding="utf-8"
            )
            target.pdf_text = lambda _: ""
            with contextlib.redirect_stdout(io.StringIO()) as output:
                exit_code = target.main([])
            if exit_code == 0 or "no nonblank non-Mermaid" not in output.getvalue():
                failures.append("full verification accepted empty copy coverage")

        repository_sources = (
            Path(__file__).resolve().parents[2] / "material" / "30days-curriculum"
        )
        zero_code_sources = (
            "00-1_学びのロードマップ.md",
            "00_カリキュラム目次.md",
            "appendix_参考資料.md",
            "appendix_用語集.md",
        )
        with tempfile.TemporaryDirectory() as pdf_dir, tempfile.TemporaryDirectory() as src_dir:
            target.PDF_DIR = Path(pdf_dir)
            target.SRC_DIR = Path(src_dir)
            for filename in zero_code_sources:
                source = repository_sources / filename
                (target.SRC_DIR / filename).write_text(
                    source.read_text(encoding="utf-8"), encoding="utf-8"
                )
                (target.PDF_DIR / source.with_suffix(".pdf").name).touch()
            target.pdf_text = lambda _: "synthetic extraction without code\n"
            with contextlib.redirect_stdout(io.StringIO()) as output:
                exit_code = target.main(["--allow-gaps"])
            report = output.getvalue()
            if exit_code != 0:
                failures.append(f"zero-code source subset was rejected: {report}")
            if "NOT APPLICABLE: no copyable fenced code" not in report:
                failures.append("zero-code subset did not report copy check as not applicable")
            if "DIAGNOSTIC PASSED" in report:
                failures.append("zero-code subset incorrectly reported a Poppler pass")
            if "UNVERIFIED: full source inventory" not in report:
                failures.append("zero-code subset omitted the full-inventory limitation")
            if "UNVERIFIED: clipboard output" not in report:
                failures.append("zero-code subset omitted the actual-viewer limitation")

        with contextlib.redirect_stderr(io.StringIO()) as error:
            exit_code = target.main(["--unknown"])
        if exit_code != 2 or "usage:" not in error.getvalue():
            failures.append("unknown verifier argument did not fail with usage error")
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
