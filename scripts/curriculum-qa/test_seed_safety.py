#!/usr/bin/env python3
"""実 DB を使わず、配布 seed の破壊操作境界を実行して検査する。"""

from __future__ import annotations

import errno
import json
import os
from pathlib import Path
import pty
import select
import shutil
import subprocess
import tempfile
import time
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
SEED_PATHS = (
    REPO_ROOT / "src/command/seed.ts",
    REPO_ROOT / "scripts/_seed/seed.ts",
)
FIXED_PROJECT_IDS = {
    "clseedwebsiterenewal0000000",
    "clseedmobileapp000000000000",
}
MUTATION_OPERATIONS = {
    "user.upsert",
    "project.deleteMany",
    "project.create",
    "task.create",
    "comment.create",
}


class SeedSafetyTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.log_path = self.directory / "calls.jsonl"
        self.node = shutil.which("node")
        if self.node is None:
            self.fail("node が PATH にありません")
        self._write_mock_modules()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _write_mock_modules(self) -> None:
        prisma_module = self.directory / "node_modules/@prisma/client"
        bcrypt_module = self.directory / "node_modules/bcryptjs"
        prisma_module.mkdir(parents=True)
        bcrypt_module.mkdir(parents=True)
        package = '{"type":"module","exports":"./index.mjs"}\n'
        (prisma_module / "package.json").write_text(package, encoding="utf-8")
        (bcrypt_module / "package.json").write_text(package, encoding="utf-8")
        (bcrypt_module / "index.mjs").write_text(
            "export default { hash: async () => 'test-password-hash' };\n",
            encoding="utf-8",
        )
        (prisma_module / "index.mjs").write_text(
            """
import { appendFileSync } from 'node:fs';

function record(operation, argument) {
  appendFileSync(process.env.SEED_TEST_LOG, `${JSON.stringify({ operation, argument })}\n`);
  if (process.env.SEED_TEST_FAIL === operation) throw new Error(`injected ${operation} failure`);
}

function userId(email) {
  return {
    'admin@example.com': 'user-admin',
    'user1@example.com': 'user-1',
    'user2@example.com': 'user-2',
  }[email] ?? 'user-other';
}

export class PrismaClient {
  user = {
    upsert: async (argument) => record('user.upsert', argument),
    findUniqueOrThrow: async (argument) => {
      record('user.findUniqueOrThrow', argument);
      return { id: userId(argument.where.email) };
    },
  };
  project = {
    deleteMany: async (argument) => record('project.deleteMany', argument),
    create: async (argument) => {
      record('project.create', argument);
      return { id: argument.data.id };
    },
  };
  task = {
    create: async (argument) => record('task.create', argument),
    findMany: async (argument) => {
      record('task.findMany', argument);
      return [{ id: 'task-1' }, { id: 'task-2' }];
    },
  };
  comment = {
    create: async (argument) => record('comment.create', argument),
  };
  $disconnect = async () => record('$disconnect', null);
}
""".strip()
            + "\n",
            encoding="utf-8",
        )

    def command(self, seed_path: Path, *arguments: str) -> list[str]:
        runtime_seed = self.directory / "seed.ts"
        shutil.copy2(seed_path, runtime_seed)
        return [
            self.node,
            "--no-warnings",
            "--import",
            "tsx",
            str(runtime_seed),
            *arguments,
        ]

    def environment(self, fail_operation: str | None = None) -> dict[str, str]:
        environment = os.environ.copy()
        environment.pop("SEED_YES", None)
        environment["DATABASE_URL"] = "postgresql://reader:secret@invalid.local/example"
        environment["SEED_TEST_LOG"] = str(self.log_path)
        if fail_operation is not None:
            environment["SEED_TEST_FAIL"] = fail_operation
        else:
            environment.pop("SEED_TEST_FAIL", None)
        return environment

    def run_pipe(
        self,
        seed_path: Path,
        *arguments: str,
        fail_operation: str | None = None,
    ) -> subprocess.CompletedProcess[str]:
        self.log_path.unlink(missing_ok=True)
        return subprocess.run(
            self.command(seed_path, *arguments),
            cwd=REPO_ROOT,
            env=self.environment(fail_operation),
            input="",
            capture_output=True,
            text=True,
            timeout=10,
        )

    def run_tty(self, seed_path: Path, answer: bytes) -> tuple[int, str]:
        self.log_path.unlink(missing_ok=True)
        master, slave = pty.openpty()
        process = subprocess.Popen(
            self.command(seed_path),
            cwd=REPO_ROOT,
            env=self.environment(),
            stdin=slave,
            stdout=slave,
            stderr=slave,
            close_fds=True,
        )
        os.close(slave)
        os.write(master, answer)
        output = bytearray()
        deadline = time.monotonic() + 10
        try:
            while process.poll() is None:
                if time.monotonic() >= deadline:
                    process.kill()
                    self.fail("TTY seed が 10 秒以内に終了しませんでした")
                readable, _, _ = select.select([master], [], [], 0.1)
                if readable:
                    try:
                        output.extend(os.read(master, 4096))
                    except OSError as error:
                        if error.errno != errno.EIO:
                            raise
            while True:
                readable, _, _ = select.select([master], [], [], 0)
                if not readable:
                    break
                try:
                    output.extend(os.read(master, 4096))
                except OSError as error:
                    if error.errno == errno.EIO:
                        break
                    raise
        finally:
            os.close(master)
            if process.poll() is None:
                process.kill()
                process.wait()
        return process.returncode, output.decode(errors="replace")

    def calls(self) -> list[dict[str, object]]:
        if not self.log_path.exists():
            return []
        return [json.loads(line) for line in self.log_path.read_text().splitlines()]

    def mutation_calls(self) -> list[dict[str, object]]:
        return [call for call in self.calls() if call["operation"] in MUTATION_OPERATIONS]

    def test_non_tty_without_opt_in_fails_closed_without_hanging_or_mutating(self) -> None:
        result = self.run_pipe(SEED_PATHS[0])

        self.assertEqual(1, result.returncode)
        self.assertEqual([], self.mutation_calls())
        self.assertEqual(["$disconnect"], [call["operation"] for call in self.calls()])

    def test_tty_default_and_negative_answers_preserve_data(self) -> None:
        for answer in (b"\n", b"n\n", b"no\n", b"cancel\n"):
            with self.subTest(answer=answer):
                returncode, _ = self.run_tty(SEED_PATHS[0], answer)
                self.assertEqual(0, returncode)
                self.assertEqual([], self.mutation_calls())
                self.assertEqual(["$disconnect"], [call["operation"] for call in self.calls()])

    def test_affirmative_run_deletes_only_fixed_projects_and_preserves_graph(self) -> None:
        result = self.run_pipe(SEED_PATHS[0], "--yes")
        self.assertEqual(0, result.returncode, result.stderr)

        calls = self.calls()
        deletes = [call for call in calls if call["operation"] == "project.deleteMany"]
        self.assertEqual(1, len(deletes))
        deleted_ids = set(deletes[0]["argument"]["where"]["id"]["in"])
        self.assertEqual(FIXED_PROJECT_IDS, deleted_ids)
        self.assertNotIn("buyer-owned-project", deleted_ids)

        projects = [call["argument"]["data"] for call in calls if call["operation"] == "project.create"]
        self.assertEqual(FIXED_PROJECT_IDS, {project["id"] for project in projects})
        project_roles = {
            project["id"]: {
                (member["userId"], member["role"])
                for member in project["members"]["create"]
            }
            for project in projects
        }
        self.assertEqual(
            {
                ("user-admin", "OWNER"),
                ("user-1", "MEMBER"),
                ("user-2", "MEMBER"),
            },
            project_roles["clseedwebsiterenewal0000000"],
        )
        self.assertEqual(
            {("user-1", "OWNER"), ("user-2", "ADMIN")},
            project_roles["clseedmobileapp000000000000"],
        )

        tasks = [call["argument"]["data"] for call in calls if call["operation"] == "task.create"]
        self.assertEqual(5, len(tasks))
        self.assertEqual(FIXED_PROJECT_IDS, {task["projectId"] for task in tasks})
        self.assertTrue(
            all(task["createdById"] in {"user-admin", "user-1"} for task in tasks)
        )
        comments = [
            call["argument"]["data"] for call in calls if call["operation"] == "comment.create"
        ]
        self.assertEqual({"task-1", "task-2"}, {comment["taskId"] for comment in comments})
        self.assertEqual({"user-admin", "user-1"}, {comment["userId"] for comment in comments})
        self.assertEqual("$disconnect", calls[-1]["operation"])

    def test_injected_failure_disconnects_and_exits_nonzero(self) -> None:
        result = self.run_pipe(SEED_PATHS[0], "--yes", fail_operation="user.upsert")

        self.assertEqual(1, result.returncode)
        self.assertEqual(["user.upsert"], [call["operation"] for call in self.mutation_calls()])
        self.assertEqual("$disconnect", self.calls()[-1]["operation"])

    def test_packaged_seed_matches_actual_seed_and_documents_fail_closed_behavior(self) -> None:
        sources = [path.read_text(encoding="utf-8") for path in SEED_PATHS]

        self.assertEqual(sources[0], sources[1])
        self.assertNotIn("警告表示のみで進める", sources[0])
        self.assertIn("--yes か SEED_YES=1", sources[0])


if __name__ == "__main__":
    unittest.main()
