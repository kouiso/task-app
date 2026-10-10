import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import measure_page_fill as target


class MeasurePageFillTest(unittest.TestCase):
    def test_page_fill_counts_inked_rows_inside_the_text_area(self):
        width = 600
        height = 800
        pixels = bytearray([255]) * (width * height)
        left = int(target.TEXT_LEFT_MM * target.RENDER_DPI / 25.4)
        top = int(target.TEXT_TOP_MM * target.RENDER_DPI / 25.4)
        for y in range(top, top + 12):
            pixels[y * width + left] = 0

        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / "page.pgm"
            image.write_bytes(
                f"P5\n{width} {height}\n255\n".encode("ascii") + bytes(pixels)
            )
            expected = 12 / (
                int(target.TEXT_BOTTOM_MM * target.RENDER_DPI / 25.4) - top
            )
            self.assertAlmostEqual(target.page_fill(image), expected)

    def test_measure_book_excludes_cover_and_toc_from_thin_pages(self):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)

            def render_pages(*_args, **_kwargs):
                for number in range(1, 4):
                    (work / f"p-{number}.pgm").touch()

            fills = iter([0.05, 0.10, 0.20])
            with (
                patch.object(target.subprocess, "run", side_effect=render_pages),
                patch.object(target, "page_fill", side_effect=lambda _path: next(fills)),
                patch.object(target, "toc_page_numbers", return_value={2}),
            ):
                result = target.measure_book(Path("sample.pdf"), work)

            self.assertEqual(result["pages"], 3)
            self.assertEqual(result["thin_pages"], 1)
            self.assertEqual(result["thin_page_numbers"], [3])
            self.assertEqual(result["blank_page_equivalent"], 0.8)


if __name__ == "__main__":
    unittest.main()
