"""register_coretext_fonts の回帰テスト。

macOS で CoreText セッションへフォントを登録する経路が生きていることと、
既に登録済みのフォントを再登録しても成功扱いになることを fixture で固定する。
macOS 以外ではスキップする。
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_pdf_book import FONT_SOURCES, register_coretext_fonts

REPO_ROOT = Path(__file__).resolve().parents[2]


@unittest.skipUnless(sys.platform == "darwin", "CoreText は macOS 専用")
class CoretextFontRegisterTest(unittest.TestCase):
    def test_registers_real_book_fonts(self):
        # 組版済み workdir ではなく npm インストール済みのフォント原本を直接使い、
        # fresh 環境でも実 API／2回目登録の経路を検証できるようにする。
        fonts = [REPO_ROOT / "node_modules" / package / path
                 for package, path, _, _, fmt in FONT_SOURCES if fmt == "truetype"]
        missing = [str(f) for f in fonts if not f.exists()]
        if missing:
            self.skipTest(f"npm フォント未配置: {missing}")
        # 未登録でも登録済み（AlreadyRegistered=105）でも例外なく終わること。
        register_coretext_fonts(fonts)
        register_coretext_fonts(fonts)  # 2回目は AlreadyRegistered 経路

    def test_missing_font_raises(self):
        with self.assertRaises(RuntimeError):
            register_coretext_fonts(
                [Path("/nonexistent/no-such-font.ttf")])


if __name__ == "__main__":
    unittest.main()
