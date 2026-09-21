"""非対応ランタイムでは配布物を移動する前に停止することを確かめる。"""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scaffold-from-scratch.sh"


class RuntimeTest(unittest.TestCase):
    def test_unsupported_runtime_leaves_package_untouched(self):
        for node, npm in [(20, 10), (24, 10), (26, 11), (22, 9), (22, 11)]:
            with self.subTest(node=node, npm=npm), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                binaries = root / "bin"
                binaries.mkdir()
                for name, version in [("node", f"v{node}.0.0"), ("npm", f"{npm}.0.0")]:
                    executable = binaries / name
                    executable.write_text(f"#!/bin/sh\necho '{version}'\n")
                    executable.chmod(0o755)
                sentinel = root / "README.md"
                sentinel.write_text("配布物を保持する")
                result = subprocess.run(
                    ["/bin/bash", str(SCRIPT)], cwd=root,
                    env={**os.environ, "PATH": f"{binaries}:/usr/bin:/bin"},
                    capture_output=True, text=True,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("非対応", result.stderr)
                self.assertEqual(sentinel.read_text(), "配布物を保持する")
                self.assertFalse((root / "package.json").exists())


if __name__ == "__main__":
    unittest.main()
