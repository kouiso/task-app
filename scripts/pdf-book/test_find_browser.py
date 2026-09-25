"""find_browser() の探索順を固定する。

組版エンジンは CI（Playwright 同梱の Chromium）と手元で揃っている前提がある。
探索順が変わると、同じ原稿でも合字・行送りの違う PDF が環境ごとに出てしまう。

特に押さえるのは次の3点。
  - PDF_BOOK_BROWSER の明示指定がすべてに優先する（CI はこれで実体を固定する）。
  - Playwright のキャッシュは OS の既定箇所（Linux/WSL は ~/.cache/ms-playwright）
    まで掘る。ここを外すとシステムの Chrome へ落ちて CI とエンジンがずれる。
  - コマンド探索は最後の手段で、キャッシュがあればそちらが先に返る。
"""

import os
import tempfile
import unittest
from contextlib import ExitStack
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from build_pdf_book import find_browser


class FindBrowserTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.env_cache = self.root / "env-cache"
        self.linux_cache = self.root / "home" / ".cache" / "ms-playwright"
        self.mac_cache = self.root / "home" / "Library" / "Caches" / "ms-playwright"
        for directory in (self.env_cache, self.linux_cache, self.mac_cache):
            directory.mkdir(parents=True)
        # 実機に /Applications/Google Chrome.app があるとコマンド探索より先に
        # 返ってしまう。macOS の開発機でも同じ結果になるよう、このテスト群では
        # 存在しないことにする
        real_exists = Path.exists

        def exists_without_mac_app(target):
            if str(target).startswith("/Applications/"):
                return False
            return real_exists(target)

        patcher = patch.object(Path, "exists", exists_without_mac_app)
        patcher.start()
        self.addCleanup(patcher.stop)

    def plant_chromium(self, cache_root, revision, layout="chrome-linux64"):
        executable = (
            cache_root / f"chromium-{revision}" / layout / "chrome"
        )
        executable.parent.mkdir(parents=True, exist_ok=True)
        executable.touch()
        return executable

    def find(self, env=None, which=None):
        # PDF_BOOK_BROWSER は空文字で「未指定」を表す。実環境に値があっても
        # テストの結果が揺れないよう毎回上書きする
        environment = {
            "PLAYWRIGHT_BROWSERS_PATH": str(self.env_cache),
            "PDF_BOOK_BROWSER": "",
        }
        if env:
            environment.update(env)
        with ExitStack() as stack:
            stack.enter_context(patch.dict(os.environ, environment))
            stack.enter_context(
                patch.object(Path, "home", return_value=self.root / "home")
            )
            if which is not None:
                stack.enter_context(patch("shutil.which", side_effect=which))
            return find_browser()

    def test_explicit_pdf_book_browser_wins_over_caches(self):
        explicit = self.root / "bin" / "my-chrome"
        explicit.parent.mkdir(parents=True)
        explicit.touch()
        self.plant_chromium(self.env_cache, 1000)
        got = self.find(env={"PDF_BOOK_BROWSER": str(explicit)})
        self.assertEqual(got, str(explicit))

    def test_missing_explicit_path_warns_and_falls_through(self):
        hit = self.plant_chromium(self.env_cache, 1000)
        missing = self.root / "no-such-chrome"
        stderr = StringIO()
        with patch("sys.stderr", stderr):
            got = self.find(env={"PDF_BOOK_BROWSER": str(missing)})
        self.assertIn(str(missing), stderr.getvalue())
        self.assertEqual(got, str(hit))

    def test_env_cache_beats_os_default_caches(self):
        hit = self.plant_chromium(self.env_cache, 1000)
        self.plant_chromium(self.linux_cache, 2000)
        self.plant_chromium(self.mac_cache, 3000)
        self.assertEqual(self.find(), str(hit))

    def test_linux_default_cache_is_searched(self):
        # Issue #406: Linux/WSL の既定キャッシュ ~/.cache/ms-playwright を掘る
        hit = self.plant_chromium(self.linux_cache, 2000)
        self.plant_chromium(self.mac_cache, 3000)
        self.assertEqual(self.find(), str(hit))

    def test_macos_default_cache_is_searched(self):
        hit = self.plant_chromium(self.mac_cache, 3000)
        self.assertEqual(self.find(), str(hit))

    def test_newest_revision_wins_within_a_cache(self):
        self.plant_chromium(self.env_cache, 1000)
        newest = self.plant_chromium(self.env_cache, 3000)
        self.assertEqual(self.find(), str(newest))

    def test_old_chrome_linux_layout_is_also_found(self):
        hit = self.plant_chromium(self.env_cache, 1000, layout="chrome-linux")
        self.assertEqual(self.find(), str(hit))

    def test_chrome_linux_layout_beats_linux64_within_a_cache(self):
        # パターンの並び順が先に効くので、同じキャッシュ内では
        # 旧レイアウト(chrome-linux)の実体が新しいリビジョンより先に返る
        hit = self.plant_chromium(self.env_cache, 1000, layout="chrome-linux")
        self.plant_chromium(self.env_cache, 3000, layout="chrome-linux64")
        self.assertEqual(self.find(), str(hit))

    def test_cache_beats_system_commands(self):
        hit = self.plant_chromium(self.linux_cache, 2000)
        got = self.find(which=lambda name: "/usr/bin/google-chrome")
        self.assertEqual(got, str(hit))

    def test_command_lookup_is_last_resort(self):
        def which(name):
            return "/usr/bin/google-chrome" if name == "google-chrome" else None

        self.assertEqual(self.find(which=which), "/usr/bin/google-chrome")

    def test_nothing_found_returns_none(self):
        self.assertIsNone(self.find(which=lambda name: None))


if __name__ == "__main__":
    unittest.main()
