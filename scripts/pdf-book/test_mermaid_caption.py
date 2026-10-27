import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from build_pdf_book import PRE_HEADING_CAPTION_OVERRIDES, convert_mermaid


def _run(body: list[str], source_stem: str = "",
         svg_markup: str = "<svg></svg>"
         ) -> tuple[list[str], int, list[str]]:
    """convert_mermaid を組版せずに走らせ、(out, count, errors) を返す。

    mermaid-cli は subprocess で SVG を焼く。検査したいのはキャプションの
    文字列と検査の結果なので、SVG の生成とフォント埋め込みは差し替える。
    """
    def fake_run(command, **kwargs):
        svg = Path(command[command.index("-o") + 1])
        svg.write_text(svg_markup, encoding="utf-8")
        return subprocess.CompletedProcess(args=command, returncode=0,
                                           stdout="", stderr="")

    with tempfile.TemporaryDirectory() as work_dir:
        with patch("build_pdf_book.subprocess.run", side_effect=fake_run), \
                patch("build_pdf_book.embed_font", lambda svg: None):
            return convert_mermaid(
                body, "book", Path(work_dir), {}, source_stem)


def _convert(body: list[str], source_stem: str = "",
             svg: str = "<svg></svg>") -> tuple[list[str], list[str]]:
    """テストが errors まで見られる補助関数。(captions, errors) を返す。"""
    out, count, errors = _run(body, source_stem, svg)
    captions = [line[2:line.index("]")] for line in out if line.startswith("![")]
    return captions, errors


def _captions(body: list[str], source_stem: str = "") -> list[str]:
    captions, errors = _convert(body, source_stem)
    assert not errors, errors
    return captions


def figure_block() -> list[str]:
    return ["```mermaid", "flowchart LR", "  A --> B", "```"]


def label_svg(height: int, breaks: int = 0) -> str:
    """break-spaces のラベル1個だけを持つ SVG の断片を作る。"""
    inner = "ラベルの1行目" + "<br />続きの行" * breaks
    return (
        f'<svg><foreignObject width="100" height="{height}">'
        '<div xmlns="http://www.w3.org/1999/xhtml" '
        f'style="white-space: break-spaces;">{inner}</div>'
        "</foreignObject></svg>"
    )


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

    def test_marker_caption_wins_over_heading(self):
        body = [
            "### `src/component/task/task-detail-dialog.tsx`",
            "<!-- figure-caption: key の選び方で下書きが付く行が変わる -->",
            *figure_block(),
        ]
        self.assertEqual(
            _captions(body, source_stem="day18_コメント投稿"),
            ["key の選び方で下書きが付く行が変わる"],
        )

    def test_marker_line_is_not_emitted(self):
        body = [
            "### 見出し",
            "<!-- figure-caption: 図の説明 -->",
            *figure_block(),
        ]
        out, count, errors = _run(body)
        self.assertEqual(errors, [])
        self.assertEqual(count, 1)
        self.assertFalse(
            any("figure-caption" in line for line in out), out)

    def test_marker_not_followed_by_mermaid_is_an_error(self):
        body = [
            "<!-- figure-caption: 書き損じの印 -->",
            "本文の行です。",
            *figure_block(),
        ]
        captions, errors = _convert(body, source_stem="book")
        self.assertTrue(
            any("図の印の次に mermaid がない: 書き損じの印" in e
                for e in errors),
            errors,
        )

    def test_path_only_heading_caption_is_an_error(self):
        body = [
            "### `src/server/api/routers/search.ts`",
            *figure_block(),
        ]
        captions, errors = _convert(
            body, source_stem="day20_検索と絞り込み")
        self.assertEqual(captions, ["src/server/api/routers/search.ts"])
        self.assertTrue(
            any("図1 のキャプションがファイルパスだけ: "
                "src/server/api/routers/search.ts" in e for e in errors),
            errors,
        )

    def test_descriptive_heading_with_path_is_not_an_error(self):
        body = [
            "### 4-3. dashboard/page.tsx を作る",
            *figure_block(),
        ]
        self.assertEqual(
            _captions(body, source_stem="day01_別の冊"),
            ["4-3. dashboard/page.tsx を作る"],
        )

    def test_auto_wrapped_label_in_svg_is_an_error(self):
        captions, errors = _convert(
            [*figure_block()], source_stem="book",
            svg=label_svg(48))
        self.assertTrue(
            any("図1 のラベルが自動で折れた" in e for e in errors),
            errors,
        )

    def test_break_spaces_label_on_one_line_is_not_an_error(self):
        captions, errors = _convert(
            [*figure_block()], source_stem="book",
            svg=label_svg(24))
        self.assertEqual(errors, [])

    def test_one_break_with_two_lines_is_not_an_error(self):
        captions, errors = _convert(
            [*figure_block()], source_stem="book",
            svg=label_svg(48, breaks=1))
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
