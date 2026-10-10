import unittest

import build_pdf_book as builder
import check_pdf_book as checker


class TocContractTest(unittest.TestCase):
    def test_step_headings_are_produced_for_every_heading_the_checker_requires(self):
        source = (
            "# Day 01: Demo\n\n"
            "## Section\n\n"
            "### Step 1: Do it\n\n"
            "### Before\n\n"
            "```text\n### Step 9: fenced\n```\n"
        )
        title, body, toc = builder.parse_source(source)
        expected = [
            match.group(1).strip()
            for match in (
                (checker.H2.match(line) or checker.H3_STEP.match(line))
                for _, line in checker.iter_prose(source)
            )
            if match
        ]
        produced = [
            item_text
            for _anchor, heading_text, children in toc
            for item_text in [
                heading_text,
                *(child_text for _child_anchor, child_text in children),
            ]
        ]

        self.assertEqual(produced, expected)
        self.assertNotIn("Before", produced)
        self.assertNotIn("Step 9: fenced", produced)

        front_matter = builder.build_front_matter(title, toc)
        self.assertIn('<a href="#s1">Section</a>', front_matter)
        self.assertIn('<a href="#s2">Step 1: Do it</a>', front_matter)
        self.assertIn("<ol>", front_matter)
        self.assertIn("## Section {#s1}", body)
        self.assertIn("### Step 1: Do it {#s2}", body)


if __name__ == "__main__":
    unittest.main()
