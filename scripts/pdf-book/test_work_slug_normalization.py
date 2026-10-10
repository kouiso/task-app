import glob
import json
import sys
import unicodedata
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import build_pdf_book as builder  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = REPO_ROOT / "material" / "30days-curriculum"
TABLE_LAYOUT = Path(__file__).with_name("table-layout.json")


class WorkSlugNormalizationTest(unittest.TestCase):
    """同一題名の NFC/NFD 表記が同一 document_id を生むことを固定する。

    表幅オーバーライドの document_id はファイル名ハッシュに依存するため、
    展開先のファイルシステムの正規化形（macOS の NFD 等）でずれないことを
    回帰として検査する。
    """

    def test_nfc_nfd_same_document_id(self):
        for path in sorted(SRC_DIR.glob("*.md")):
            stem_nfd = path.stem
            stem_nfc = unicodedata.normalize("NFC", stem_nfd)
            with self.subTest(stem=stem_nfc):
                self.assertEqual(
                    builder.work_slug(stem_nfd),
                    builder.work_slug(stem_nfc),
                )

    def test_pinned_override_catalog_matches(self):
        config = json.loads(TABLE_LAYOUT.read_text(encoding="utf-8"))
        pinned = {item["document_id"] for item in config["overrides"]}
        catalog = {builder.work_slug(path.stem) for path in SRC_DIR.glob("*.md")}
        self.assertEqual(len(catalog), len(list(SRC_DIR.glob("*.md"))))
        self.assertFalse(pinned - catalog)

    def test_nfd_stem_yields_pinned_id(self):
        nfd_stem = unicodedata.normalize(
            "NFD", "day01_開発環境を整えて、初めてのアプリを動かそう"
        )
        self.assertEqual(builder.work_slug(nfd_stem), "day01-bf910a")


if __name__ == "__main__":
    unittest.main()
