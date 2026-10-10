"""Explicit selective hanging scope integration tests with the pinned VFM."""
from __future__ import annotations

import copy
import hashlib
import html
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import build_pdf_book as book
from code_wrap import (
    PRE_FONT_PT,
    SAFE_COLS,
    SHRINK_MIN_PCT,
    atoms,
    line_width,
    unsafe_runs,
    wrap_code_in_html,
)
from hanging_scope import HangingScope, _fences, load_hanging_scope


REPO_ROOT = Path(__file__).resolve().parents[2]
SCOPE_PATH = Path(__file__).with_name("selective-hanging-scope-current40.json")
VFM_BIN = os.environ.get("PDF_BOOK_TEST_VFM_BIN")
PRE_RE = re.compile(r"<pre\b[^>]*>.*?</pre>", re.IGNORECASE | re.DOTALL)


def require(value: bool, message: str) -> None:
    if not value:
        raise RuntimeError(message)


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    require(spec is not None and spec.loader is not None, f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def without_mermaid(markdown: str) -> tuple[str, str]:
    title, body, toc = book.parse_source(
        markdown.replace(book.EMOJI_VARIATION_SELECTOR, "")
    )
    output: list[str] = []
    in_mermaid = False
    for _, line, state, fence in book.fence_states("\n".join(body)):
        if state == "open":
            in_mermaid = fence.lang == "mermaid"
            if in_mermaid:
                output.append("<!-- Diagram presentation excluded from code-only QA -->")
            else:
                output.append(line)
        elif state == "close":
            if not in_mermaid:
                output.append(line)
            in_mermaid = False
        elif not in_mermaid:
            output.append(line)
    return title, book.build_front_matter(title, toc) + "\n".join(output)


def rendered_plain(line: str) -> str:
    return html.unescape(re.sub(r"<[^>]*>", "", line))


@unittest.skipUnless(VFM_BIN, "PDF_BOOK_TEST_VFM_BIN must name the pinned VFM")
class HangingScopeActualVfmTest(unittest.TestCase):
    maxDiff = None

    def test_exact_scope_is_local_and_fails_closed(self) -> None:
        scope = load_hanging_scope(REPO_ROOT, str(SCOPE_PATH.resolve()))
        require(scope.enabled, "scope did not enable")
        document = scope.document
        require(document is not None, "scope document missing")

        owner_wrap_path = Path(
            os.environ.get("PDF_BOOK_BASELINE_CODE_WRAP", "")
        )
        require(owner_wrap_path.is_file(), "PDF_BOOK_BASELINE_CODE_WRAP is required")
        baseline_wrap = load_module("baseline_code_wrap", owner_wrap_path)

        env = dict(os.environ)
        pre_total = 0
        selected_total = 0
        changed_total = 0
        message_checks = 0
        rendered_by_path: dict[str, tuple[str, str, str, frozenset[int]]] = {}

        for catalog in document["books"]:
            relative = catalog["path"]
            source_path = REPO_ROOT / relative
            original = source_path.read_text(encoding="utf-8")
            title, prepared = without_mermaid(original)
            converted = subprocess.run(
                [VFM_BIN, "--language", "ja", "--title", title],
                input=prepared,
                capture_output=True,
                text=True,
                cwd=REPO_ROOT,
                env=env,
                timeout=30,
                check=False,
            )
            require(converted.returncode == 0, converted.stderr[-300:])
            require(converted.stderr == "", f"VFM stderr for {relative}")
            markup = converted.stdout
            indices = scope.indices(
                source_path,
                original,
                prepared,
                markup,
                book.validate_vfm_code_fences,
            )
            expected = frozenset(
                row["vfm_pre_ordinal_zero_based"]
                for row in document["rows"]
                if row["relative_path"] == relative
            )
            require(indices == expected, f"selection drift: {relative}")

            old_residuals: list[str] = []
            default_residuals: list[str] = []
            selected_residuals: list[str] = []
            old = baseline_wrap.wrap_code_in_html(markup, old_residuals)
            default = wrap_code_in_html(markup, default_residuals)
            selected = wrap_code_in_html(
                markup,
                selected_residuals,
                hanging_pre_indices=indices,
            )
            require(old == default, f"default output drift: {relative}")
            require(old_residuals == default_residuals, f"default residual drift: {relative}")
            require(not selected_residuals, f"selected residuals: {relative}")
            require(not unsafe_runs(selected), f"unsafe selected runs: {relative}")

            before_pres = PRE_RE.findall(default)
            after_pres = PRE_RE.findall(selected)
            require(
                len(before_pres) == len(after_pres) == catalog["non_mermaid_pre_count"],
                f"pre count drift: {relative}",
            )
            changed = {
                index
                for index, pair in enumerate(zip(before_pres, after_pres, strict=True))
                if pair[0] != pair[1]
            }
            require(changed <= indices, f"unselected pre changed: {relative}")
            require(
                PRE_RE.sub("PRE", default) == PRE_RE.sub("PRE", selected),
                f"outside-pre change: {relative}",
            )
            pre_total += len(before_pres)
            selected_total += len(indices)
            changed_total += len(changed)
            rendered_by_path[relative] = (original, prepared, markup, indices)

            for binding in document["rows"]:
                if binding["relative_path"] != relative:
                    continue
                index = binding["vfm_pre_ordinal_zero_based"]
                source_row = _fences(original)[
                    binding["source_fence_ordinal_zero_based"]
                ]["payload"]
                source_lines = [
                    line
                    for line in source_row.splitlines()
                    if "取得できませんでした。前回の" in line
                ]
                if not source_lines:
                    continue
                require(len(source_lines) == 1, "ambiguous source message")
                source_line = source_lines[0]
                rendered_lines = [
                    line
                    for line in after_pres[index].splitlines()
                    if "取得できませんでした。前回の" in line
                ]
                require(len(rendered_lines) == 1, "missing rendered message")
                rendered = rendered_lines[0]
                require(rendered_plain(rendered) == source_line, "message text or indent changed")
                hangs = [int(value) for value in re.findall(r"--cw-hang:(\d+)ch", rendered)]
                shrinks = [int(value) for value in re.findall(r"font-size:(\d+)%", rendered)]
                indent = len(source_line) - len(source_line.lstrip(" "))
                width = line_width(atoms(html.escape(source_line)))
                require(
                    width <= SAFE_COLS
                    or (hangs and all(value == indent + 2 for value in hangs))
                    or (shrinks and min(shrinks) >= SHRINK_MIN_PCT),
                    "message has no safe fit treatment",
                )
                require(all(value >= SHRINK_MIN_PCT for value in shrinks), "font floor waived")
                require(
                    all(PRE_FONT_PT * value / 100 >= 8 for value in shrinks),
                    "effective font below 8pt",
                )
                message_checks += 1

        require(pre_total == 922, f"expected 922 pre blocks, got {pre_total}")
        require(selected_total == 40, f"expected 40 selections, got {selected_total}")
        require(changed_total <= 40, f"selection increased: {changed_total}")
        require(message_checks == 3, f"expected 3 message checks, got {message_checks}")

        negatives: list[str] = []

        def rejected(label: str, operation) -> None:
            try:
                operation()
            except (OSError, TypeError, ValueError):
                negatives.append(label)
                return
            raise RuntimeError(f"negative case passed: {label}")

        rejected("relative config", lambda: load_hanging_scope(REPO_ROOT, SCOPE_PATH.name))
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            drifted = temporary / "scope.json"
            drifted.write_bytes(SCOPE_PATH.read_bytes() + b"\n")
            rejected("scope byte drift", lambda: load_hanging_scope(REPO_ROOT, str(drifted)))
            linked = temporary / "scope-link.json"
            linked.symlink_to(SCOPE_PATH)
            rejected("scope symlink", lambda: load_hanging_scope(REPO_ROOT, str(linked)))

        first_book = document["books"][0]
        relative = first_book["path"]
        source_path = REPO_ROOT / relative
        original, prepared, markup, _ = rendered_by_path[relative]

        def resolve_with(changed_document, original_text=original, prepared_text=prepared,
                         vfm_html=markup, source=source_path, validator=book.validate_vfm_code_fences):
            return HangingScope(REPO_ROOT, changed_document).indices(
                source, original_text, prepared_text, vfm_html, validator,
            )

        rejected("source text drift", lambda: resolve_with(document, original + "\n"))
        rejected("prepared fence drift", lambda: resolve_with(document, prepared.replace("filepath", "filepatH", 1)))
        rejected("VFM pre drift", lambda: resolve_with(document, vfm_html=markup.replace("filepath", "filepatH", 1)))
        rejected("stale annotated pre", lambda: resolve_with(document, vfm_html=markup.replace("<pre", '<pre data-pdf-pre-id="old"', 1)))
        rejected("canonical VFM validator", lambda: resolve_with(document, validator=lambda *_: (_ for _ in ()).throw(ValueError("rejected"))))

        selected_row_index = next(
            index for index, row in enumerate(document["rows"])
            if row["relative_path"] == relative
        )

        def mutate_row(field: str, value) -> None:
            changed = copy.deepcopy(document)
            changed["rows"][selected_row_index][field] = value
            resolve_with(changed)

        row = document["rows"][selected_row_index]
        rejected("source start binding", lambda: mutate_row("source_start_line", row["source_start_line"] + 1))
        rejected("source end binding", lambda: mutate_row("source_end_line", row["source_end_line"] + 1))
        rejected("source ordinal binding", lambda: mutate_row("source_fence_ordinal_zero_based", -1))
        rejected("VFM ordinal binding", lambda: mutate_row("vfm_pre_ordinal_zero_based", -1))
        rejected("row MD binding", lambda: mutate_row("MD_sha256", "0" * 64))
        rejected("language binding", lambda: mutate_row("language", "text"))
        rejected("payload binding", lambda: mutate_row("payload_sha256", "0" * 64))

        multi_row_book = next(
            item for item in document["books"] if item["selected_count"] >= 2
        )
        multi_relative = multi_row_book["path"]
        multi_original, multi_prepared, multi_markup, _ = rendered_by_path[multi_relative]

        def duplicate_pre() -> None:
            changed = copy.deepcopy(document)
            rows = [item for item in changed["rows"] if item["relative_path"] == multi_relative]
            rows[1]["vfm_pre_ordinal_zero_based"] = rows[0]["vfm_pre_ordinal_zero_based"]
            resolve_with(
                changed,
                original_text=multi_original,
                prepared_text=multi_prepared,
                vfm_html=multi_markup,
                source=REPO_ROOT / multi_relative,
            )

        rejected("duplicate selected pre", duplicate_pre)

        def selected_count_drift() -> None:
            changed = copy.deepcopy(document)
            next(item for item in changed["books"] if item["path"] == relative)["selected_count"] += 1
            resolve_with(changed)

        rejected("selected count binding", selected_count_drift)

        outside = Path(tempfile.gettempdir()) / source_path.name
        rejected("source outside root", lambda: resolve_with(document, source=outside))
        require(len(negatives) == 18, f"expected 18 negative cases, got {len(negatives)}")

        print(json.dumps({
            "books": len(document["books"]),
            "pre_total": pre_total,
            "selected": selected_total,
            "changed": changed_total,
            "negative_count": len(negatives),
            "message_checks": message_checks,
            "default_byte_exact": True,
            "minimum_font_pt": 8,
            "safe_columns": SAFE_COLS,
            "scope_sha256": hashlib.sha256(SCOPE_PATH.read_bytes()).hexdigest(),
        }, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    unittest.main()
