"""node_modules/.bin の道具の起動パス（Windows では .cmd）を固定する。

.bin の拡張子なしファイルは sh スクリプトで、Windows は直接起動できず WinError 193 になる。
Linux・Mac・CI は従来どおり拡張子なしのパスを返し、組版の結果を変えない。
"""

import tempfile
import unittest
from pathlib import Path

from build_pdf_book import _bin_launcher


class BinLauncherTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.modules = Path(self.directory.name) / "node_modules"
        (self.modules / ".bin").mkdir(parents=True)
        (self.modules / ".bin" / "mmdc").touch()

    def test_non_windows_uses_the_plain_script(self):
        (self.modules / ".bin" / "mmdc.cmd").touch()
        self.assertEqual(
            _bin_launcher(self.modules, "mmdc", windows=False),
            str(self.modules / ".bin" / "mmdc"),
        )

    def test_windows_uses_the_cmd_launcher_when_present(self):
        (self.modules / ".bin" / "mmdc.cmd").touch()
        self.assertEqual(
            _bin_launcher(self.modules, "mmdc", windows=True),
            str(self.modules / ".bin" / "mmdc.cmd"),
        )

    def test_windows_without_a_cmd_launcher_keeps_the_plain_path(self):
        self.assertEqual(
            _bin_launcher(self.modules, "mmdc", windows=True),
            str(self.modules / ".bin" / "mmdc"),
        )


if __name__ == "__main__":
    unittest.main()
