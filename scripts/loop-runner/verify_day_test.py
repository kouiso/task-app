#!/usr/bin/env python3
"""verify_day.py の副作用をフェイクコマンドで確認する。"""

import json
import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from verify_day import verify_day


def write_executable(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


class VerifyDayTest(unittest.TestCase):
    def test_records_build_test_and_playwright_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target_dir = root / "target"
            evidence_dir = root / "evidence"
            bin_dir = root / "bin"
            target_dir.mkdir()
            bin_dir.mkdir()

            command_log = root / "commands.log"
            command_stub = f"""#!/usr/bin/env bash
echo "$0 $*" >> {command_log}
exit 0
"""
            write_executable(bin_dir / "npm", command_stub)
            write_executable(bin_dir / "npx", command_stub)

            env_path = f"{bin_dir}{os.pathsep}{os.environ['PATH']}"
            with patch.dict(os.environ, {"PATH": env_path}):
                self.assertTrue(verify_day("11", target_dir, evidence_dir))

            summary = json.loads((evidence_dir / "summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["status"], "PASS")
            self.assertEqual(
                [check["name"] for check in summary["checks"]],
                ["build", "test", "playwright-screenshots"],
            )
            self.assertTrue((evidence_dir / "build.log").exists())
            self.assertTrue((evidence_dir / "test.log").exists())
            self.assertTrue((evidence_dir / "playwright-screenshots.log").exists())

    def test_stops_after_first_failed_check(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target_dir = root / "target"
            evidence_dir = root / "evidence"
            bin_dir = root / "bin"
            target_dir.mkdir()
            bin_dir.mkdir()

            write_executable(
                bin_dir / "npm",
                """#!/usr/bin/env bash
if [[ "$*" == "run build" ]]; then
  exit 1
fi
exit 0
""",
            )
            write_executable(bin_dir / "npx", "#!/usr/bin/env bash\nexit 0\n")

            env_path = f"{bin_dir}{os.pathsep}{os.environ['PATH']}"
            with patch.dict(os.environ, {"PATH": env_path}):
                self.assertFalse(verify_day("12", target_dir, evidence_dir))

            summary = json.loads((evidence_dir / "summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["status"], "FAIL")
            self.assertEqual([check["name"] for check in summary["checks"]], ["build"])
            self.assertFalse((evidence_dir / "test.log").exists())


if __name__ == "__main__":
    unittest.main()
