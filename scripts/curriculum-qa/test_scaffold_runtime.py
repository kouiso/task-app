"""非対応ランタイムでは配布物を移動する前に停止することを確かめる。"""

import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scaffold-from-scratch.sh"
REPO_ROOT = Path(__file__).resolve().parents[2]


class RuntimeTest(unittest.TestCase):
    def run_scaffold(self, node: str, npm: str):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binaries = root / "bin"
            binaries.mkdir()
            for name, version in [("node", node), ("npm", npm)]:
                executable = binaries / name
                executable.write_text(f"#!/bin/sh\nprintf '%s\\n' '{version}'\n")
                executable.chmod(0o755)
            sentinel = root / "README.md"
            sentinel.write_text("配布物を保持する")
            result = subprocess.run(
                ["/bin/bash", str(SCRIPT)], cwd=root,
                env={**os.environ, "PATH": f"{binaries}:/usr/bin:/bin"},
                capture_output=True, text=True,
            )
            self.assertEqual(sentinel.read_text(), "配布物を保持する")
            self.assertFalse((root / "package.json").exists())
            return result

    def test_unsupported_node_stops_before_npm_and_keeps_inputs(self):
        versions = [
            "v22.11.0", "v22.0.0", "v20.19.0", "v23.0.0",
            "v22.22.2-rc.1", "v22.12", "v22.12.0foo", "unknown", "",
            "v999999999999999999999999999999.12.0",
            "v022.12.0", "v22.012.0", "v22.12.00",
        ]
        for node in versions:
            with self.subTest(node=node):
                result = self.run_scaffold(node, "9.0.0")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Node.js", result.stderr)
                self.assertIn("非対応", result.stderr)
                self.assertNotIn("npm 9.0.0", result.stderr)

    def test_supported_node_reaches_npm_check(self):
        versions = [
            "v22.12.0",
            "v22.22.2",
            "22.12.0",
            "v22.999999999999999999999999999999.0",
            "v22.12.999999999999999999999999999999",
        ]
        for node in versions:
            with self.subTest(node=node):
                result = self.run_scaffold(node, "9.0.0")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("npm 9.0.0 は非対応", result.stderr)
                self.assertNotIn(f"Node.js {node} は非対応", result.stderr)

    def test_unsupported_npm_keeps_inputs(self):
        for node, npm in [("v22.12.0", 9), ("v22.22.2", 11)]:
            with self.subTest(node=node, npm=npm):
                result = self.run_scaffold(node, f"{npm}.0.0")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("非対応", result.stderr)

    def test_other_node_majors_are_rejected(self):
        for node in [20, 24, 26]:
            with self.subTest(node=node):
                result = self.run_scaffold(f"v{node}.0.0", "10.0.0")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Node.js", result.stderr)
                self.assertIn("非対応", result.stderr)

    def test_install_dependencies_declares_required_dom_peer_with_legacy_mode(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            trace = root / "npm-arguments.jsonl"
            result = subprocess.run(
                [
                    "/bin/bash",
                    "-c",
                    'source "$1" && npm() { printf \'%s\\n\' "$*" >> '
                    '"$NPM_ARGUMENT_TRACE"; } && install_dependencies',
                    "runtime-test",
                    str(SCRIPT),
                ],
                cwd=root,
                env={
                    **os.environ,
                    "NPM_ARGUMENT_TRACE": str(trace),
                    "npm_config_legacy_peer_deps": "true",
                },
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            calls = [line.split() for line in trace.read_text().splitlines()]
            self.assertEqual(len(calls), 2)
            self.assertEqual(calls[0][0], "install")
            self.assertEqual(calls[1][:2], ["install", "-D"])
            self.assertIn("@testing-library/react@^16.2.0", calls[1])
            self.assertIn("@testing-library/dom@^10.4.1", calls[1])
            self.assertNotIn("@testing-library/user-event@^14.6.1", calls[1])

    def test_configure_package_json_sets_supported_node_range(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "package.json").write_text('{"name":"temporary"}\n')
            result = subprocess.run(
                [
                    "/bin/bash",
                    "-c",
                    'source "$1" && configure_package_json',
                    "runtime-test",
                    str(SCRIPT),
                ],
                cwd=root,
                env=os.environ,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            package = json.loads((root / "package.json").read_text())
            self.assertEqual(package["engines"]["node"], ">=22.12.0 <23")

    def test_first_run_syncs_lock_metadata_without_running_postinstall(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture_leaf = root / "fixture-leaf"
            fixture_leaf.mkdir()
            (fixture_leaf / "package.json").write_text(
                '{"name":"fixture-leaf","version":"1.0.0"}\n'
            )
            (fixture_leaf / "index.js").write_text("module.exports = 1;\n")
            (root / "package.json").write_text(
                '{"name":"temporary-reader","version":"0.1.0",'
                '"dependencies":{"fixture-leaf":"file:./fixture-leaf"}}\n'
            )
            initial_lock = subprocess.run(
                ["npm", "install", "--ignore-scripts"],
                cwd=root,
                env=os.environ,
                capture_output=True,
                text=True,
            )
            self.assertEqual(initial_lock.returncode, 0, initial_lock.stderr)
            installed_before = {
                str(path.relative_to(root / "node_modules")): hashlib.sha256(
                    path.read_bytes()
                ).hexdigest()
                for path in (root / "node_modules").rglob("*")
                if path.is_file() and path.name != ".package-lock.json"
            }
            hidden_lock_before = json.loads(
                (root / "node_modules/.package-lock.json").read_text()
            )

            configured = subprocess.run(
                [
                    "/bin/bash",
                    "-c",
                    'source "$1" && configure_package_json',
                    "runtime-test",
                    str(SCRIPT),
                ],
                cwd=root,
                env=os.environ,
                capture_output=True,
                text=True,
            )
            self.assertEqual(configured.returncode, 0, configured.stderr)
            package = json.loads((root / "package.json").read_text())
            package["scripts"]["postinstall"] = (
                "node -e \"require('node:fs').writeFileSync("
                "'postinstall-ran','yes')\""
            )
            (root / "package.json").write_text(json.dumps(package) + "\n")

            synced = subprocess.run(
                [
                    "/bin/bash",
                    "-c",
                    'source "$1" && sync_package_lock_metadata',
                    "runtime-test",
                    str(SCRIPT),
                ],
                cwd=root,
                env=os.environ,
                capture_output=True,
                text=True,
            )
            self.assertEqual(synced.returncode, 0, synced.stderr)
            self.assertFalse((root / "postinstall-ran").exists())
            installed_after = {
                str(path.relative_to(root / "node_modules")): hashlib.sha256(
                    path.read_bytes()
                ).hexdigest()
                for path in (root / "node_modules").rglob("*")
                if path.is_file() and path.name != ".package-lock.json"
            }
            self.assertEqual(installed_after, installed_before)
            hidden_lock_after = json.loads(
                (root / "node_modules/.package-lock.json").read_text()
            )
            self.assertEqual(
                hidden_lock_after["packages"], hidden_lock_before["packages"]
            )

            package = json.loads((root / "package.json").read_text())
            lock = json.loads((root / "package-lock.json").read_text())
            lock_root = lock["packages"][""]
            self.assertEqual(lock_root["name"], package["name"])
            self.assertEqual(lock_root["engines"], package["engines"])
            self.assertTrue(lock_root["hasInstallScript"])

    def test_runtime_selectors_match_recommended_version(self):
        self.assertEqual(
            (REPO_ROOT / ".node-version").read_text().strip(),
            "22.22.2",
        )
        self.assertIn(
            'node = "22.22.2"',
            (REPO_ROOT / ".mise.toml").read_text(),
        )


if __name__ == "__main__":
    unittest.main()
