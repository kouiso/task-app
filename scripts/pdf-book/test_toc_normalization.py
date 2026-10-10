from html.parser import HTMLParser
from pathlib import Path
import sys
import unittest


sys.path.insert(0, str(Path(__file__).parent))
import check_pdf_book as checker  # noqa: E402
import build_pdf_book as builder  # noqa: E402


class TocAnchorText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_toc = False
        self.in_anchor = False
        self.current: list[str] = []
        self.entries: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "nav" and attributes.get("id") == "toc":
            self.in_toc = True
        elif self.in_toc and tag == "a":
            self.in_anchor = True
            self.current = []

    def handle_data(self, data: str) -> None:
        if self.in_anchor:
            self.current.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self.in_anchor:
            self.entries.append("".join(self.current))
            self.in_anchor = False
        elif tag == "nav" and self.in_toc:
            self.in_toc = False


class TocNormalizationTest(unittest.TestCase):
    SOURCE = (
        "# Day 01: Demo\n\n"
        "## abcdefghijklA [A & B](./a.md)\n\n"
        "## abcdefghijklB `created_at`\n\n"
        "### Step 1: 長い見出しを改行後も全文で照合する\n\n"
        "## literal &amp; entity\n"
    )

    def producer_entries(self) -> list[str]:
        title, _body, toc = builder.parse_source(self.SOURCE)
        parser = TocAnchorText()
        parser.feed(builder.build_front_matter(title, toc))
        return parser.entries

    def source_headings(self) -> list[str]:
        return [
            match.group(1).strip()
            for _, line in checker.iter_prose(self.SOURCE)
            if (match := checker.H2.match(line) or checker.H3_STEP.match(line))
        ]

    @staticmethod
    def toc_page(entries: list[tuple[str, int]]) -> str:
        return "目次\n" + "".join(f"{entry} .... {page}\n" for entry, page in entries)

    def missing(self, pages: list[str]) -> list[str]:
        return checker.find_toc_problems(
            pages, total_pages=12, headings=self.source_headings()
        )

    def test_checker_key_matches_full_actual_producer_anchor_text(self) -> None:
        entries = self.producer_entries()
        self.assertEqual(
            entries,
            [
                "abcdefghijklA A & B",
                "abcdefghijklB created_at",
                "Step 1: 長い見出しを改行後も全文で照合する",
                "literal &amp; entity",
            ],
        )
        self.assertEqual(
            [checker.toc_key(heading) for heading in self.source_headings()],
            [checker.flatten(entry) for entry in entries],
        )

    def test_wrapped_long_heading_and_html_entities_pass(self) -> None:
        first, second, long_heading, entity = self.producer_entries()
        split_at = len(long_heading) // 2
        toc = self.toc_page([
            (first, 4),
            (second, 5),
            (long_heading[:split_at] + "\n" + long_heading[split_at:], 6),
            (entity, 7),
        ])
        self.assertEqual(self.missing(["表紙", toc, "本文"]), [])

    def test_missing_second_shared_prefix_is_reported(self) -> None:
        first, _second, long_heading, entity = self.producer_entries()
        toc = self.toc_page([(first, 4), (long_heading, 6), (entity, 7)])
        self.assertEqual(
            self.missing(["表紙", toc, "本文"]),
            ["目次に出ていない見出し: abcdefghijklB `created_a"],
        )

    def test_missing_first_shared_prefix_is_reported(self) -> None:
        _first, second, long_heading, entity = self.producer_entries()
        toc = self.toc_page([(second, 5), (long_heading, 6), (entity, 7)])
        self.assertEqual(
            self.missing(["表紙", toc, "本文"]),
            ["目次に出ていない見出し: abcdefghijklA [A & B](./"],
        )

    def test_all_headings_can_span_multiple_toc_pages(self) -> None:
        first, second, long_heading, entity = self.producer_entries()
        pages = [
            "表紙",
            self.toc_page([(first, 4), (second, 5)]),
            self.toc_page([(long_heading, 6), (entity, 7)]),
            "本文",
        ]
        self.assertEqual(self.missing(pages), [])

    def test_heading_found_only_in_body_is_still_missing_from_toc(self) -> None:
        first, _second, long_heading, entity = self.producer_entries()
        toc = self.toc_page([(first, 4), (long_heading, 6), (entity, 7)])
        body = "abcdefghijklB created_at は本文にだけあります"
        self.assertIn(
            "目次に出ていない見出し: abcdefghijklB `created_a",
            self.missing(["表紙", toc, body]),
        )

if __name__ == "__main__":
    unittest.main()
