"""XDG_DATA_HOME を作業用へ差し替えても mise の実データ置き場が残ることを固定する。

差し替えだけだと mise が空の置き場を見て shim 経由のコマンドを再帰起動する
（mise 本体の既知の不具合と同じ仕組み）。外部コマンドや本番ビルドは走らせず、子プロセスへ渡す env だけを見る。
"""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

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


if __name__ == "__main__":
    unittest.main()
