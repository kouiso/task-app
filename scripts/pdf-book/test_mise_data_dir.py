"""XDG_DATA_HOME を作業用へ差し替えても mise の実データ置き場が残ることを固定する。

差し替えだけだと mise が空の置き場を見て shim 経由のコマンドを再帰起動する
（mise 本体の既知の不具合と同じ仕組み）。外部コマンドや本番ビルドは走らせず、子プロセスへ渡す env だけを見る。
"""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_pdf_book
from build_pdf_book import redirect_font_data_home

WORK = Path("/work/.pdf-book-build")


class RedirectFontDataHomeTest(unittest.TestCase):
    def test_default_dir_is_kept_when_xdg_unset(self):
        env = {}
        with patch.object(Path, "home", return_value=Path("/home/u")):
            redirect_font_data_home(env, WORK)
        self.assertEqual(env["MISE_DATA_DIR"], "/home/u/.local/share/mise")
        self.assertEqual(env["XDG_DATA_HOME"], str(WORK / "xdg"))

    def test_existing_xdg_data_home_is_honoured(self):
        env = {"XDG_DATA_HOME": "/custom/share"}
        redirect_font_data_home(env, WORK)
        self.assertEqual(env["MISE_DATA_DIR"], "/custom/share/mise")
        self.assertEqual(env["XDG_DATA_HOME"], str(WORK / "xdg"))

    def test_empty_mise_data_dir_is_replaced(self):
        env = {"MISE_DATA_DIR": "", "XDG_DATA_HOME": "/custom/share"}
        redirect_font_data_home(env, WORK)
        self.assertEqual(env["MISE_DATA_DIR"], "/custom/share/mise")

    def test_existing_mise_data_dir_wins(self):
        env = {"MISE_DATA_DIR": "/opt/mise", "XDG_DATA_HOME": "/custom/share"}
        redirect_font_data_home(env, WORK)
        self.assertEqual(env["MISE_DATA_DIR"], "/opt/mise")
        self.assertEqual(env["XDG_DATA_HOME"], str(WORK / "xdg"))


class MainChildEnvTest(unittest.TestCase):
    """main() が組む子プロセス用 env を、実際の呼び出し経路で確かめる。"""

    def test_main_passes_real_mise_dir_with_overridden_xdg(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sources = root / "material"
            sources.mkdir()
            target = sources / "book-00.md"
            target.write_text("# Book\n", encoding="utf-8")
            work = root / "work"
            seen = {}

            def toolchain(env):
                seen["toolchain"] = dict(env)
                return {
                    "root": str(root / "toolchain"),
                    "vivliostyle_bin": "/toolchain/vivliostyle",
                    "vfm_bin": "/toolchain/vfm",
                    "mermaid_bin": "/toolchain/mmdc",
                    "theme_path": "/toolchain/theme",
                }

            def build(_source, _browser, env, _mapping):
                seen["build"] = dict(env)
                return []

            base = {"HOME": "/home/u", "XDG_DATA_HOME": "/real/share"}
            with (
                patch.dict(os.environ, base, clear=True),
                patch.object(build_pdf_book, "REPO_ROOT", root),
                patch.object(build_pdf_book, "SRC_DIR", sources),
                patch.object(build_pdf_book, "OUT_DIR", root / "pdf"),
                patch.object(build_pdf_book, "WORK_DIR", work),
                patch.object(build_pdf_book, "RELEASE_RECEIPT", root / "receipt.json"),
                patch.object(build_pdf_book, "find_browser", return_value="/browser"),
                patch.object(build_pdf_book, "browser_version", return_value="x"),
                patch.object(build_pdf_book, "prepare_release_toolchain", side_effect=toolchain),
                patch.object(build_pdf_book, "prepare_work_dir"),
                patch.object(build_pdf_book, "rewrite_book_links", side_effect=lambda text, *_: text),
                patch.object(
                    build_pdf_book,
                    "load_table_layout_overrides",
                    return_value={"schema_version": 1, "overrides": []},
                ),
                patch.object(build_pdf_book, "build_one", side_effect=build),
            ):
                code = build_pdf_book.main(["build_pdf_book.py", str(target)])
        self.assertEqual(code, 0)
        for stage in ("toolchain", "build"):
            self.assertEqual(seen[stage]["MISE_DATA_DIR"], "/real/share/mise", stage)
            self.assertEqual(seen[stage]["XDG_DATA_HOME"], str(work / "xdg"), stage)


if __name__ == "__main__":
    unittest.main()
