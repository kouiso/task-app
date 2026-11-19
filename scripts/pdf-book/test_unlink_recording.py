import unittest
from pathlib import Path
from unittest.mock import patch

import build_pdf_book


class UnlinkRecordingTest(unittest.TestCase):
    """Windows で起こりうる削除失敗が、先に決めた結果を上書きしないこと。"""

    def test_missing_file_is_ignored(self):
        problems = []
        build_pdf_book._unlink_recording(
            Path("/no/such/file-pdf-unlink-test"), problems, "a.md"
        )
        self.assertEqual([], problems)

    def test_oserror_is_recorded_not_raised(self):
        problems = []
        with patch.object(Path, "unlink", side_effect=PermissionError("locked")):
            build_pdf_book._unlink_recording(Path("/tmp/x"), problems, "a.md")
        self.assertEqual(1, len(problems))
        self.assertIn("a.md", problems[0])
        self.assertIn("削除に失敗", problems[0])

    def test_successful_unlink_records_nothing(self):
        problems = []
        with patch.object(Path, "unlink") as unlink:
            build_pdf_book._unlink_recording(Path("/tmp/y"), problems, "a.md")
        unlink.assert_called_once_with(missing_ok=True)
        self.assertEqual([], problems)


if __name__ == "__main__":
    unittest.main()
