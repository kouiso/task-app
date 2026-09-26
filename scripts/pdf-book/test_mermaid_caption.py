import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from build_pdf_book import PRE_HEADING_CAPTION_OVERRIDES, convert_mermaid


def _captions(body: list[str], source_stem: str = "") -> list[str]:
    """convert_mermaid を組版せずに走らせ、出てきた画像の代替テキストだけ返す。

    mermaid-cli は subprocess で SVG を焼く。検査したいのはキャプションの
    文字列だけなので、SVG の生成とフォント埋め込みは差し替える。
    """
    def fake_run(command, **kwargs):
        svg = Path(command[command.index("-o") + 1])
        svg.write_text("<svg></svg>", encoding="utf-8")
        return subprocess.CompletedProcess(args=command, returncode=0,
                                           stdout="", stderr="")

    with tempfile.TemporaryDirectory() as work_dir:
        with patch("build_pdf_book.subprocess.run", side_effect=fake_run), \
                patch("build_pdf_book.embed_font", lambda svg: None):
            out, count, errors = convert_mermaid(
                body, "book", Path(work_dir), {}, source_stem)
    assert not errors, errors
    return [line[2:line.index("]")] for line in out if line.startswith("![")]


def figure_block() -> list[str]:
    return ["```mermaid", "flowchart LR", "  A --> B", "```"]


class MermaidCaptionTest(unittest.TestCase):
    def test_step_heading_drops_trailing_duration_parenthetical(self):
        body = [
            "### Step 5: middleware.ts を作る（ルート保護・8分）",
            *figure_block(),
        ]
        self.assertEqual(
            _captions(body),
            ["Step 5: middleware.ts を作る"],
        )

    def test_duration_variants_are_dropped(self):
        headings = [
            "### Step 4: API を繋ぎ直す（ルーター登録 + HTTP ハンドラー・5分）",
            "### Step 7: DevTools で JWT と Cookie を確認する（5分）",
            "### Step 9: 数字に余白のある場合（20 分）",
            "### Step 10: 全角数字の場合（３分）",
        ]
        body = [line for heading in headings
                for line in [heading, *figure_block()]]
        self.assertEqual(
            _captions(body),
            [
                "Step 4: API を繋ぎ直す",
                "Step 7: DevTools で JWT と Cookie を確認する",
                "Step 9: 数字に余白のある場合",
                "Step 10: 全角数字の場合",
            ],
        )

    def test_non_duration_parenthetical_is_kept(self):
        body = [
            "### 自分のタスク一覧（自分のタスク一覧）",
            *figure_block(),
        ]
        self.assertEqual(
            _captions(body),
            ["自分のタスク一覧（自分のタスク一覧）"],
        )

    def test_plain_heading_is_used_verbatim(self):
        body = [
            "### 認証フローの全体像",
            *figure_block(),
        ]
        self.assertEqual(_captions(body), ["認証フローの全体像"])

    def test_figure_before_any_heading_uses_registered_caption(self):
        stem, _ = next(iter(PRE_HEADING_CAPTION_OVERRIDES))
        self.assertEqual(stem, "day04_ネットに公開")
        body = ["冒頭の本文です。", *figure_block()]
        self.assertEqual(
            _captions(body, source_stem=stem),
            ["ローカルから公開URLまでの道筋"],
        )

    def test_figure_before_any_heading_falls_back_for_other_books(self):
        body = ["冒頭の本文です。", *figure_block()]
        self.assertEqual(_captions(body, source_stem="day01_別の冊"), ["図解"])

    def test_override_applies_only_to_the_first_figure(self):
        body = ["冒頭の本文です。", *figure_block(), *figure_block()]
        self.assertEqual(
            _captions(body, source_stem="day04_ネットに公開"),
            ["ローカルから公開URLまでの道筋", "図解"],
        )

    def test_heading_after_figure_supplies_later_caption(self):
        body = [
            "冒頭の本文です。",
            *figure_block(),
            "## 前回の振り返り",
            *figure_block(),
        ]
        self.assertEqual(
            _captions(body, source_stem="day04_ネットに公開"),
            ["ローカルから公開URLまでの道筋", "前回の振り返り"],
        )


if __name__ == "__main__":
    unittest.main()
