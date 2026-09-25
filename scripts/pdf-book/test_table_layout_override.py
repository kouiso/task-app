import copy
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from build_pdf_book import work_slug


MODULE_PATH = Path(__file__).with_name("table_layout_override.py")
SPEC = importlib.util.spec_from_file_location("table_layout_override", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def geometry(table_id="table-0", columns=2, top=0, span=False):
    return {
        "status": "supported",
        "identity": {
            "status": "supported",
            "kind": "data-pdf-table-id",
            "value": table_id,
        },
        "rect": {"left": 0, "top": top, "right": 100, "bottom": top + 20},
        "column_count": columns,
        "columns": [{"column_index": index} for index in range(columns)],
        "unsupported_columns": [],
        "cells": [
            {
                "row_span": 1,
                "column_span": 2 if span else 1,
            }
        ],
    }


class TableLayoutOverrideTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / "source.md"
        self.source_bytes = (
            b"# Book\n\n"
            b"| A | B |\n"
            b"|---|---|\n"
            b"| a | b |\n\n"
            b"| C | D |\n"
            b"|---|---|\n"
            b"| c | d |\n"
        )
        self.source.write_bytes(self.source_bytes)
        table_bytes = b"| A | B |\n|---|---|\n| a | b |\n"
        self.override = {
            "document_id": "book-1",
            "source_sha256": sha256(self.source_bytes),
            "table_source_order": 0,
            "table_id": "table-0",
            "table_sha256": sha256(table_bytes),
            "column_percentages": [40, 60],
            "evidence_pdf_sha256": "a" * 64,
            "review": "Reviewed fixture.",
        }
        self.config = {"schema_version": 1, "overrides": [self.override]}
        self.manifest = {
            "document_id": "book-1",
            "tables": [
                {"id": "table-0", "source_order": 0},
                {"id": "table-1", "source_order": 1},
            ],
        }
        self.report = {
            "document_id": "book-1",
            "dom_audit": {
                "observed": [
                    {
                        "items": [
                            {
                                "page_index": 0,
                                "table_geometry": geometry(top=10),
                            },
                            {
                                "page_index": 1,
                                "table_geometry": geometry(top=110),
                            },
                        ]
                    }
                ]
            },
        }

    def derive(self, config=None, manifest=None, report=None):
        return MODULE.derive_reviewed_table_css(
            config or self.config,
            self.source,
            manifest or self.manifest,
            report or self.report,
        )

    def test_happy_path_checks_all_fragments_and_generates_numeric_css(self):
        css, applied = self.derive()
        self.assertEqual(
            css,
            'table[data-pdf-table-id="table-0"] th:nth-child(1):nth-last-child(2){width:40% !important;}\n'
            'table[data-pdf-table-id="table-0"] th:nth-child(2):nth-last-child(1){width:60% !important;}\n',
        )
        self.assertEqual(applied[0]["observed_fragment_count"], 2)
        self.assertTrue(applied[0]["requires_final_dom_pdf_and_visual_review"])

    def test_unconfigured_document_returns_empty(self):
        manifest = {"document_id": "other", "tables": []}
        report = {"document_id": "other"}
        self.assertEqual(self.derive(manifest=manifest, report=report), ("", []))

    def test_loader_rejects_missing_invalid_and_unknown_config(self):
        with self.assertRaises(MODULE.TableLayoutOverrideError):
            MODULE.load_table_layout_overrides(Path(self.temp.name) / "missing.json")
        path = Path(self.temp.name) / "config.json"
        path.write_text("{", encoding="utf-8")
        with self.assertRaises(MODULE.TableLayoutOverrideError):
            MODULE.load_table_layout_overrides(path)
        invalid = copy.deepcopy(self.config)
        invalid["extra"] = True
        path.write_text(json.dumps(invalid), encoding="utf-8")
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "unknown keys"):
            MODULE.load_table_layout_overrides(path)

    def test_loader_rejects_duplicate_and_invalid_percentages(self):
        duplicate = {"schema_version": 1, "overrides": [self.override, self.override]}
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "duplicate"):
            MODULE._validate_config(duplicate)
        for percentages in ([0, 100], [50, 49], [50.0, 50], [101]):
            invalid = copy.deepcopy(self.config)
            invalid["overrides"][0]["column_percentages"] = percentages
            with self.subTest(percentages=percentages):
                with self.assertRaises(MODULE.TableLayoutOverrideError):
                    MODULE._validate_config(invalid)

    def test_loader_rejects_boolean_schema_version(self):
        invalid = copy.deepcopy(self.config)
        invalid["schema_version"] = True
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "schema_version"):
            MODULE._validate_config(invalid)

    def test_override_document_ids_must_exist_in_unique_canonical_catalog(self):
        self.assertEqual(
            MODULE.validate_override_document_catalog(self.config, ["book-1", "book-2"]),
            self.config,
        )
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "canonical catalog"):
            MODULE.validate_override_document_catalog(self.config, ["book-2"])
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "duplicate IDs"):
            MODULE.validate_override_document_catalog(
                {"schema_version": 1, "overrides": []}, ["book-1", "book-1"]
            )

    def test_source_and_table_sha_are_independent_fail_closed_checks(self):
        stale_source = copy.deepcopy(self.config)
        stale_source["overrides"][0]["source_sha256"] = "b" * 64
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "source SHA"):
            self.derive(config=stale_source)
        stale_table = copy.deepcopy(self.config)
        stale_table["overrides"][0]["table_sha256"] = "b" * 64
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "table fragment SHA"):
            self.derive(config=stale_table)

    def test_manifest_identity_and_source_order_must_match(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["tables"][0]["id"] = "wrong-table"
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "manifest table"):
            self.derive(manifest=manifest)
        missing = copy.deepcopy(self.config)
        missing["overrides"][0]["table_source_order"] = 9
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "does not exist"):
            self.derive(config=missing)

    def test_dom_column_count_and_every_fragment_are_checked(self):
        wrong_columns = copy.deepcopy(self.report)
        wrong_columns["dom_audit"]["observed"][0]["items"][1][
            "table_geometry"
        ] = geometry(columns=3, top=110)
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "column_count"):
            self.derive(report=wrong_columns)

        unsupported = copy.deepcopy(self.report)
        unsupported["dom_audit"]["observed"][0]["items"][1][
            "table_geometry"
        ]["status"] = "unsupported"
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "unsupported"):
            self.derive(report=unsupported)

    def test_row_or_column_span_is_rejected(self):
        report = copy.deepcopy(self.report)
        report["dom_audit"]["observed"][0]["items"][0]["table_geometry"] = (
            geometry(span=True, top=10)
        )
        with self.assertRaisesRegex(MODULE.TableLayoutOverrideError, "span"):
            self.derive(report=report)

    def test_repository_config_matches_current_catalog_and_sources(self):
        scripts = Path(__file__).parent
        repository = scripts.parent.parent
        config = MODULE.load_table_layout_overrides(scripts / "table-layout.json")
        sources = {
            work_slug(source.stem): source
            for source in (repository / "material/30days-curriculum").glob("*.md")
        }
        self.assertTrue(sources)
        MODULE.validate_override_document_catalog(config, list(sources))
        for override in config["overrides"]:
            with self.subTest(document_id=override["document_id"]):
                source = sources[override["document_id"]].read_bytes()
                self.assertEqual(sha256(source), override["source_sha256"])
                tables = MODULE._extract_supported_tables(source)
                self.assertLess(override["table_source_order"], len(tables))
                raw_table, column_count = tables[override["table_source_order"]]
                self.assertEqual(sha256(raw_table), override["table_sha256"])
                self.assertEqual(column_count, len(override["column_percentages"]))


if __name__ == "__main__":
    unittest.main()
