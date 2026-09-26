"""find_browser() の探索順を固定する。

組版エンジンは CI（Playwright 同梱の Chromium）と手元で揃っている前提がある。
探索順が変わると、同じ原稿でも合字・行送りの違う PDF が環境ごとに出てしまう。

特に押さえるのは次の4点。
  - PDF_BOOK_BROWSER の明示指定がすべてに優先する（CI はこれで実体を固定する）。
  - Playwright のキャッシュは OS の既定箇所（Linux/WSL は ~/.cache/ms-playwright、
    macOS は ~/Library/Caches/ms-playwright）まで掘る。ここを外すと
    システムの Chrome へ落ちて CI とエンジンがずれる。
  - キャッシュ内の版の決め方: node_modules/playwright-core/browsers.json が指す
    リビジョンがあればそれ。無ければレイアウトをまたいだ最大リビジョン。
  - コマンド探索は最後の手段で、キャッシュがあればそちらが先に返る。
"""

import json
import os
import tempfile
import unittest
from contextlib import ExitStack
from io import StringIO
from pathlib import Path
from unittest.mock import patch

import build_pdf_book
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
        # 実機の node_modules/playwright-core/browsers.json が効くと、
        # テストが置いたリビジョンと無関係にその版が優先される。
        # 各テストでは空の repo ルートを見せて、要るものだけ自分で manifest を置く
        self.repo_root = self.root / "repo"
        self.repo_root.mkdir()
        patcher = patch.object(build_pdf_book, "REPO_ROOT", self.repo_root)
        patcher.start()
        self.addCleanup(patcher.stop)

    def plant_chromium(self, cache_root, revision, layout="chrome-linux64"):
        executable = cache_root / f"chromium-{revision}" / layout / "chrome"
        executable.parent.mkdir(parents=True, exist_ok=True)
        executable.touch()
        return executable

    def plant_mac_app(
        self, cache_root, revision, layout="chrome-mac-arm64", app="Google Chrome for Testing"
    ):
        executable = (
            cache_root / f"chromium-{revision}" / layout / f"{app}.app"
            / "Contents" / "MacOS" / app
        )
        executable.parent.mkdir(parents=True, exist_ok=True)
        executable.touch()
        return executable

    def write_browsers_json(self, revision):
        manifest = (
            self.repo_root / "node_modules" / "playwright-core" / "browsers.json"
        )
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text(
            json.dumps({"browsers": [{"name": "chromium", "revision": str(revision)}]}),
            encoding="utf-8",
        )

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
        # playwright 1.60 の macOS 実レイアウト:
        # chromium-<rev>/chrome-mac-arm64/Google Chrome for Testing.app/...
        hit = self.plant_mac_app(self.mac_cache, 1223)
        self.assertEqual(self.find(), str(hit))

    def test_macos_x64_layout_is_also_found(self):
        hit = self.plant_mac_app(self.mac_cache, 1223, layout="chrome-mac-x64")
        self.assertEqual(self.find(), str(hit))

    def test_macos_old_chromium_app_layout_is_also_found(self):
        hit = self.plant_mac_app(
            self.mac_cache, 1000, layout="chrome-mac", app="Chromium"
        )
        self.assertEqual(self.find(), str(hit))

    def test_newest_revision_wins_within_a_cache(self):
        self.plant_chromium(self.env_cache, 1000)
        newest = self.plant_chromium(self.env_cache, 3000)
        self.assertEqual(self.find(), str(newest))

    def test_old_chrome_linux_layout_is_also_found(self):
        hit = self.plant_chromium(self.env_cache, 1000, layout="chrome-linux")
        self.assertEqual(self.find(), str(hit))

    def test_highest_revision_wins_across_layouts(self):
        # レイアウトの並び順ではなくリビジョンの大小で決める。
        # 旧レイアウト(chrome-linux)に新しい版がある時、そちらを取る
        newest = self.plant_chromium(self.env_cache, 3000, layout="chrome-linux")
        self.plant_chromium(self.env_cache, 1000)
        self.assertEqual(self.find(), str(newest))

    def test_same_revision_prefers_newer_layout(self):
        self.plant_chromium(self.env_cache, 1223, layout="chrome-linux")
        hit = self.plant_chromium(self.env_cache, 1223)
        self.assertEqual(self.find(), str(hit))

    def test_pinned_revision_wins_in_a_cache(self):
        # browsers.json が指す版は、新しい版が並んでいても優先される。
        # issue #406 の WSL の状況（1217/1223/1234/1243 が同居）の再現
        self.write_browsers_json(1223)
        self.plant_chromium(self.linux_cache, 1217)
        hit = self.plant_chromium(self.linux_cache, 1223)
        self.plant_chromium(self.linux_cache, 1243)
        self.assertEqual(self.find(), str(hit))

    def test_pinned_revision_is_picked_across_caches(self):
        # CI が組むのは browsers.json の版なので、後順位のキャッシュにあっても
        # 先順位の別リビジョンより優先する
        self.write_browsers_json(1223)
        self.plant_chromium(self.env_cache, 1000)
        hit = self.plant_chromium(self.linux_cache, 1223)
        self.assertEqual(self.find(), str(hit))

    def test_absent_pinned_revision_falls_back_to_newest(self):
        self.write_browsers_json(9999)
        self.plant_chromium(self.env_cache, 1000)
        newest = self.plant_chromium(self.env_cache, 3000)
        self.assertEqual(self.find(), str(newest))

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
