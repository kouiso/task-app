"""Resolve the one reviewed selective hanging scope against source and VFM output.

An absent configuration disables selection. The supported configuration is an
exact, SHA-pinned artifact; every source and rendered binding is then checked
again before an index can be returned.
"""
from __future__ import annotations

import hashlib
import json
import os
import stat
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from typing import Callable

from markdown_scan import fence_states

SUPPORTED_SCHEMA = "taskapp.pdf-hanging-scope.v1"
SUPPORTED_SCOPE_SHA256 = "4857258f3178ccbb13149be7a5837cc4e69c8b99ed9dff2a90017cb6b53c67a8"
EXPECTED_BOOKS = 10
EXPECTED_SELECTIONS = 40
SCOPE_ENV = "PDF_BOOK_HANGING_SCOPE"


def _require(value: bool, message: str) -> None:
    if not value:
        raise ValueError(message)


def _digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canonical_relative(value: object) -> str:
    _require(isinstance(value, str) and value != "", "scope path must be a string")
    path = PurePosixPath(value)
    _require(not path.is_absolute() and ".." not in path.parts, "scope path must be relative")
    _require(
        path.parts[:2] == ("material", "30days-curriculum") and len(path.parts) == 3,
        "scope path must name one curriculum source",
    )
    return path.as_posix()


def _regular_bytes(path: Path, maximum: int) -> bytes:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(path, flags)
    try:
        before = os.fstat(descriptor)
        _require(stat.S_ISREG(before.st_mode) and before.st_uid == os.geteuid(), "scope input must be owned regular")
        _require(before.st_size <= maximum, "scope input exceeds size bound")
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = os.read(descriptor, min(1024 * 1024, maximum + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            _require(total <= maximum, "scope input exceeds size bound")
        after = os.fstat(descriptor)
        _require(
            (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
            == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns),
            "scope input changed while reading",
        )
        data = b"".join(chunks)
        _require(len(data) == before.st_size, "scope input changed while reading")
        return data
    finally:
        os.close(descriptor)


def _fences(markdown: str) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    opened = False
    start = 0
    language = ""
    body: list[str] = []
    for line_number, line, state, fence in fence_states(markdown):
        if state == "open":
            _require(not opened, "nested source fence state")
            opened = True
            start = line_number
            language = fence.lang
            body = []
        elif state == "inside":
            _require(opened, "source fence payload without open")
            body.append(line)
        elif state == "close":
            _require(opened, "source fence close without open")
            rows.append({
                "start": start,
                "end": line_number,
                "language": language,
                "payload": "\n".join(body),
            })
            opened = False
    _require(not opened, "unclosed source fence")
    return rows


class _PreText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: list[dict[str, str]] = []
        self.active = False
        self.language = ""
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "pre":
            return
        _require(not self.active, "nested pre")
        _require(len({key for key, _ in attrs}) == len(attrs), "duplicate pre attributes")
        fields = dict(attrs)
        _require("data-pdf-pre-id" not in fields, "stale annotated pre")
        languages = [
            name.removeprefix("language-")
            for name in (fields.get("class") or "").split()
            if name.startswith("language-")
        ]
        _require(len(languages) <= 1, "ambiguous pre language")
        self.language = languages[0] if languages else ""
        self.parts = []
        self.active = True

    def handle_endtag(self, tag: str) -> None:
        if tag != "pre":
            return
        _require(self.active, "unmatched pre close")
        self.rows.append({"language": self.language, "payload": "".join(self.parts)})
        self.active = False

    def handle_data(self, data: str) -> None:
        if self.active:
            self.parts.append(data)


class HangingScope:
    def __init__(self, root: Path, document: dict[str, object] | None) -> None:
        self.root = root.resolve(strict=True)
        self.document = document

    @property
    def enabled(self) -> bool:
        return self.document is not None

    def indices(
        self,
        source_path: Path,
        original_markdown: str,
        prepared_markdown: str,
        vfm_html: str,
        validate_vfm_code_fences: Callable[[str, str], None],
    ) -> frozenset[int]:
        if self.document is None:
            return frozenset()
        validate_vfm_code_fences(prepared_markdown, vfm_html)
        source = source_path.resolve(strict=True)
        try:
            relative = source.relative_to(self.root).as_posix()
        except ValueError as error:
            raise ValueError("source outside configured root") from error
        books = [book for book in self.document["books"] if book["path"] == relative]
        if not books:
            return frozenset()
        _require(len(books) == 1, "duplicate selected book")
        book = books[0]
        original_bytes = original_markdown.encode("utf-8")
        _require(_digest(_regular_bytes(source, 16 * 1024 * 1024)) == book["MD_sha256"], "selected source SHA drift")
        _require(_digest(original_bytes) == book["MD_sha256"], "selected source text drift")

        source_rows = _fences(original_markdown)
        prepared_rows = [row for row in _fences(prepared_markdown) if row["language"] != "mermaid"]
        source_non_mermaid = [row for row in source_rows if row["language"] != "mermaid"]
        _require(
            len(source_non_mermaid) == len(prepared_rows) == book["non_mermaid_pre_count"],
            "Mermaid/pre ordinal drift",
        )
        parser = _PreText()
        parser.feed(vfm_html)
        parser.close()
        _require(not parser.active and len(parser.rows) == len(prepared_rows), "VFM pre count drift")

        selected = [row for row in self.document["rows"] if row["relative_path"] == relative]
        _require(len(selected) == book["selected_count"], "selected per-book count drift")
        _require(
            len({row["vfm_pre_ordinal_zero_based"] for row in selected}) == len(selected),
            "duplicate selected pre",
        )
        indices: set[int] = set()
        for binding in selected:
            pre_index = binding["vfm_pre_ordinal_zero_based"]
            source_index = binding["source_fence_ordinal_zero_based"]
            _require(type(pre_index) is int and 0 <= pre_index < len(prepared_rows), "selected pre index")
            _require(type(source_index) is int and 0 <= source_index < len(source_rows), "selected source ordinal")
            source_row = source_rows[source_index]
            _require(
                source_row["start"] == binding["source_start_line"]
                and source_row["end"] == binding["source_end_line"],
                "source position drift",
            )
            _require(
                source_row["language"] != "mermaid" and source_non_mermaid[pre_index] is source_row,
                "source/Mermaid ordinal drift",
            )
            _require(binding["MD_sha256"] == book["MD_sha256"], "selected MD binding mismatch")
            for current in (source_row, prepared_rows[pre_index], parser.rows[pre_index]):
                _require(current["language"] == binding["language"], "selected language drift")
                _require(
                    _digest(current["payload"].encode("utf-8")) == binding["payload_sha256"],
                    "selected payload drift",
                )
            indices.add(pre_index)
        return frozenset(indices)


def load_hanging_scope(root: Path, configured_path: str | None) -> HangingScope:
    if configured_path is None or configured_path == "":
        return HangingScope(root, None)
    path = Path(configured_path)
    _require(path.is_absolute() and ".." not in path.parts, "scope config path must be canonical absolute")
    raw = _regular_bytes(path, 2 * 1024 * 1024)
    _require(_digest(raw) == SUPPORTED_SCOPE_SHA256, "unsupported or drifted hanging scope")
    try:
        document = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("hanging scope is malformed") from error
    _require(type(document) is dict, "hanging scope must be an object")
    _require(
        set(document) == {"schema", "status", "book_count", "selected_fence_count", "books", "rows"},
        "hanging scope fields drift",
    )
    _require(document["schema"] == SUPPORTED_SCHEMA, "hanging scope schema drift")
    _require(document["status"] == "EXPLICIT_OPT_IN_PINNED_SCOPE", "hanging scope is not opt-in")
    _require(document["book_count"] == EXPECTED_BOOKS, "hanging scope book count drift")
    _require(document["selected_fence_count"] == EXPECTED_SELECTIONS, "hanging scope selection count drift")
    books = document["books"]
    rows = document["rows"]
    _require(type(books) is list and len(books) == EXPECTED_BOOKS, "hanging scope books drift")
    _require(type(rows) is list and len(rows) == EXPECTED_SELECTIONS, "hanging scope rows drift")
    book_paths = [_canonical_relative(book.get("path")) for book in books if type(book) is dict]
    _require(len(book_paths) == EXPECTED_BOOKS and len(set(book_paths)) == EXPECTED_BOOKS, "duplicate scope book")
    row_keys: set[tuple[str, int]] = set()
    row_counts = {path: 0 for path in book_paths}
    for row in rows:
        _require(type(row) is dict, "scope row must be an object")
        relative = _canonical_relative(row.get("relative_path"))
        _require(relative in row_counts, "scope row has no book")
        key = (relative, row.get("source_start_line"))
        _require(type(key[1]) is int and key not in row_keys, "duplicate scope source selection")
        row_keys.add(key)
        row_counts[relative] += 1
    for book, relative in zip(books, book_paths, strict=True):
        _require(type(book.get("selected_count")) is int, "scope selected count type")
        _require(row_counts[relative] == book["selected_count"], "scope selected count mismatch")
        source = root.resolve(strict=True) / relative
        _require(source.is_file() and not source.is_symlink(), "selected source missing or non-regular")
        _require(_digest(_regular_bytes(source, 16 * 1024 * 1024)) == book["MD_sha256"], "selected source catalog SHA drift")
    return HangingScope(root, document)
