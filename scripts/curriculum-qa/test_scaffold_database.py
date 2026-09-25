"""別フォルダの DB を初期化しないことを、Docker を使わずに検査する。"""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import shutil


ROOT = Path(__file__).resolve().parents[2]
GUARD = ROOT / "scripts/verify-scaffold-database.cjs"
DISTRO_LABEL = "io.taskapp.scaffold.wsl-distro"
OWNER_LABEL = "io.taskapp.scaffold.owner"
OWNER_KEY = "_TASKAPP_SCAFFOLD_DB_OWNER"


class ScaffoldDatabaseTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name).resolve() / "task-app"
        self.directory.mkdir()
        self.config = {
            "name": "task-app",
            "services": {
                "db": {"ports": [{"target": 5432, "published": "25532"}],
                       "environment": {"POSTGRES_DB": "taskapp", "POSTGRES_USER": "user", "POSTGRES_PASSWORD": "password"}},
                "test-db": {"ports": [{"target": 5432, "published": "25533"}]},
            },
            "volumes": {"postgres-data": {"name": "task-app_postgres-data"}},
        }
        self.container = {
            "Config": {"Labels": {
                "com.docker.compose.project": "task-app",
                "com.docker.compose.project.working_dir": str(self.directory),
                "com.docker.compose.service": "db",
            }},
            "Mounts": [{"Name": "task-app_postgres-data", "Destination": "/var/lib/postgresql/data"}],
            "State": {"Running": True},
            "NetworkSettings": {"Ports": {"5432/tcp": [{"HostPort": "25532", "HostIp": "0.0.0.0"}]}},
        }
        self.volume = {"Name": "task-app_postgres-data", "Labels": {
            "com.docker.compose.project": "task-app", "com.docker.compose.volume": "postgres-data",
        }}
        self.distro = "Fixture-Ubuntu"
        self.owner = "00000000-0000-4000-8000-000000000001"
        for service in self.config["services"].values():
            service["labels"] = {DISTRO_LABEL: self.distro, OWNER_LABEL: self.owner}
        self.config["volumes"]["postgres-data"]["labels"] = {DISTRO_LABEL: self.distro, OWNER_LABEL: self.owner}
        self.container["Config"]["Labels"][DISTRO_LABEL] = self.distro
        self.container["Config"]["Labels"][OWNER_LABEL] = self.owner
        self.volume["Labels"][DISTRO_LABEL] = self.distro
        self.volume["Labels"][OWNER_LABEL] = self.owner

    def tearDown(self):
        self.temp.cleanup()

    def invoke(self, function, args):
        return subprocess.run(
            ["node", "-e", "const g=require(process.argv[1]);try{g[process.argv[2]](...JSON.parse(process.argv[3]));}catch(e){console.error(e.message);process.exitCode=1;}",
             str(GUARD), function, json.dumps(args)], capture_output=True, text=True,
            env={**os.environ, "WSL_DISTRO_NAME": self.distro},
        )

    def ownership(self, containers, volumes):
        return self.invoke("validateOwnership", [str(self.directory), self.config, containers, volumes, self.distro, self.owner])

    def test_fresh_project_has_no_foreign_resources(self):
        self.assertEqual(self.ownership([], []).returncode, 0)

    def test_same_directory_retry_keeps_its_volume(self):
        result = self.ownership([self.container], [self.volume])
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_stopped_container_in_another_directory_is_rejected(self):
        self.container["State"]["Running"] = False
        self.container["Config"]["Labels"]["com.docker.compose.project.working_dir"] = "/another/task-app"
        self.assertNotEqual(self.ownership([self.container], [self.volume]).returncode, 0)

    def test_unknown_working_directory_is_rejected(self):
        del self.container["Config"]["Labels"]["com.docker.compose.project.working_dir"]
        self.assertNotEqual(self.ownership([self.container], []).returncode, 0)

    def test_same_path_in_another_wsl_distro_is_rejected(self):
        self.container["Config"]["Labels"][DISTRO_LABEL] = "another-ubuntu"
        self.assertNotEqual(self.ownership([self.container], [self.volume]).returncode, 0)

    def test_volume_from_another_wsl_distro_is_rejected(self):
        self.volume["Labels"][DISTRO_LABEL] = "another-ubuntu"
        self.assertNotEqual(self.ownership([self.container], [self.volume]).returncode, 0)

    def test_mismatched_distro_in_compose_is_rejected_before_creation(self):
        self.config["services"]["db"]["labels"][DISTRO_LABEL] = "another-ubuntu"
        self.assertNotEqual(self.ownership([], []).returncode, 0)

    def test_wsl_without_distro_name_is_not_treated_as_native_linux(self):
        self.assertNotEqual(self.invoke("distroName", [{}, "6.6-microsoft-standard-WSL2"]).returncode, 0)
        self.assertEqual(self.invoke("distroName", [{}, "6.8.0-generic"]).returncode, 0)

    def test_native_retry_accepts_missing_distro_label_with_matching_owner(self):
        for service in self.config["services"].values():
            service["labels"].pop(DISTRO_LABEL)
        self.config["volumes"]["postgres-data"]["labels"].pop(DISTRO_LABEL)
        self.container["Config"]["Labels"].pop(DISTRO_LABEL)
        self.volume["Labels"].pop(DISTRO_LABEL)
        result = self.invoke("validateOwnership", [str(self.directory), self.config, [self.container], [self.volume], "", self.owner])
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_reinstalled_distro_same_name_and_path_cannot_claim_previous_owner(self):
        self.container["Config"]["Labels"][OWNER_LABEL] = "00000000-0000-4000-8000-000000000002"
        self.assertNotEqual(self.ownership([self.container], [self.volume]).returncode, 0)

    def test_unlabelled_historical_database_is_not_claimed(self):
        self.container["Config"]["Labels"].pop(OWNER_LABEL)
        self.assertNotEqual(self.ownership([self.container], [self.volume]).returncode, 0)

    def test_owner_is_created_once_without_rewriting_other_env_bytes(self):
        env_file = self.directory / ".env"
        original = b'# keep this exact comment\nDATABASE_URL="fixture"'
        env_file.write_bytes(original)
        first = self.invoke("projectOwner", [str(env_file), {}])
        self.assertEqual(first.returncode, 0, first.stderr)
        written = env_file.read_bytes()
        self.assertTrue(written.startswith(original + b"\n"))
        self.assertEqual(written.count(OWNER_KEY.encode()), 1)
        second = self.invoke("projectOwner", [str(env_file), {}])
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(env_file.read_bytes(), written)

    def test_duplicate_invalid_and_empty_environment_owner_are_rejected(self):
        env_file = self.directory / ".env"
        for text, env in ((f"{OWNER_KEY}={self.owner}\n{OWNER_KEY}={self.owner}\n", {}),
                          (f"{OWNER_KEY}=not-a-uuid\n", {}),
                          (f"{OWNER_KEY}={self.owner}\n", {OWNER_KEY: ""})):
            env_file.write_text(text)
            self.assertNotEqual(self.invoke("projectOwner", [str(env_file), env]).returncode, 0)
            self.assertEqual(env_file.read_text(), text)

    def test_owner_creation_does_not_follow_env_symlink(self):
        outside = Path(self.temp.name) / "outside.env"
        outside.write_text("keep this\n")
        env_file = self.directory / ".env"
        env_file.symlink_to(outside)
        self.assertNotEqual(self.invoke("projectOwner", [str(env_file), {}]).returncode, 0)
        self.assertEqual(outside.read_text(), "keep this\n")

    def test_orphan_volume_is_not_claimed(self):
        self.assertNotEqual(self.ownership([], [self.volume]).returncode, 0)

    def test_volume_must_be_attached_to_this_database(self):
        self.container["Mounts"] = []
        self.assertNotEqual(self.ownership([self.container], [self.volume]).returncode, 0)

    def test_volume_label_alone_is_not_enough(self):
        self.volume["Labels"]["com.docker.compose.project"] = "other"
        self.assertNotEqual(self.ownership([self.container], [self.volume]).returncode, 0)

    def test_external_volume_is_not_initialized(self):
        self.config["volumes"]["postgres-data"]["external"] = True
        self.assertNotEqual(self.ownership([], []).returncode, 0)

    def test_valid_local_url_matches_compose(self):
        for suffix in ("", "?schema=public"):
            result = self.invoke("validateUrl", ["postgresql://user:password@localhost:25532/taskapp" + suffix, self.config])
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_other_url_is_rejected_without_printing_credentials(self):
        for value in (
            "postgresql://user:secret@remote.example:25532/taskapp",
            "postgresql://user:secret@localhost:5432/taskapp",
            "postgresql://user:secret@localhost:25532/other",
            "postgresql://user:password@localhost:25532/taskapp?host=other",
        ):
            result = self.invoke("validateUrl", [value, self.config])
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn("secret", result.stderr)

    def test_running_owned_container_must_publish_the_actual_port(self):
        result = self.invoke("validateRunning", [self.config, [self.container]])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.container["NetworkSettings"]["Ports"]["5432/tcp"][0]["HostPort"] = "9999"
        self.assertNotEqual(self.invoke("validateRunning", [self.config, [self.container]]).returncode, 0)

    def test_stopped_database_cannot_receive_writes(self):
        self.container["State"]["Running"] = False
        self.assertNotEqual(self.invoke("validateRunning", [self.config, [self.container]]).returncode, 0)

    def run_guard(self, overrides=None, containers=None, volumes=None):
        binaries = Path(self.temp.name) / "bin"
        binaries.mkdir(exist_ok=True)
        fixture = Path(self.temp.name) / "docker-state.json"
        fixture.write_text(json.dumps({"config": self.config,
                                      "containers": [self.container] if containers is None else containers,
                                      "volumes": [self.volume] if volumes is None else volumes}))
        log = Path(self.temp.name) / "writes"
        log.write_text("")
        docker = binaries / "docker"
        docker.write_text('''#!/usr/bin/env python3
import json,os,sys
s=json.load(open(os.environ['DOCKER_FIXTURE']))
a=sys.argv[1:]
if os.environ.get('DOCKER_FIXTURE_FAIL') == '1': sys.exit(57)
if a == ['context','show']: print('default')
elif a[:2] == ['context','inspect']: print(json.dumps([{'Endpoints':{'docker':{'Host':'unix:///var/run/docker.sock'}}}]))
elif a[0] == 'compose' and a[-3:] == ['config','--format','json']: print(json.dumps(s['config']))
elif a[:2] == ['ps','-aq']: print('db-container' if s['containers'] else '')
elif a[0] == 'inspect': print(json.dumps(s['containers']))
elif a[:2] == ['volume','ls']: print('\\n'.join(v['Name'] for v in s['volumes']))
elif a[:2] == ['volume','inspect']: print(json.dumps(s['volumes']))
else: sys.exit(58)
''')
        docker.chmod(0o755)
        for name in ("npx", "npm"):
            executable = binaries / name
            executable.write_text(
                '#!/bin/sh\nprintf "%s|%s\\n" "$*" "$DATABASE_URL" >> "$WRITE_LOG"\n'
                f'printf "{name} %s\\n" "$*"\n'
            )
            executable.chmod(0o755)
        (self.directory / ".env").write_text("DATABASE_URL=postgresql://user:password@localhost:25532/taskapp\n" + f"{OWNER_KEY}={self.owner}\n")
        (self.directory / "src/command").mkdir(parents=True, exist_ok=True)
        (self.directory / "src/command/seed.ts").write_text("// fixture\n")
        env = {key: value for key, value in os.environ.items()
               if not key.startswith(("DOCKER_", "COMPOSE_", "DOTENV_")) and key not in ("DATABASE_URL", OWNER_KEY)}
        env.update({"PATH": f"{binaries}:{env['PATH']}", "DOCKER_FIXTURE": str(fixture), "WRITE_LOG": str(log),
                    "WSL_DISTRO_NAME": self.distro})
        env.update(overrides or {})
        result = subprocess.run([shutil.which("node"), str(GUARD), "initialize"], cwd=self.directory,
                                env=env, capture_output=True, text=True)
        return result, log.read_text()

    def test_cli_pins_checked_url_for_all_database_writes(self):
        result, writes = self.run_guard({"DATABASE_URL": "postgresql://user:password@127.0.0.1:25532/taskapp?schema=public"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(writes.splitlines()), 3)
        self.assertIn("db:seed -- --yes", writes)
        self.assertTrue(all(line.endswith("@127.0.0.1:25532/taskapp?schema=public") for line in writes.splitlines()))

    def test_cli_announces_seed_before_running_it(self):
        result, _ = self.run_guard()
        self.assertEqual(result.returncode, 0, result.stderr)
        lines = result.stdout.splitlines()
        self.assertIn("シードデータを投入しています...", lines)
        self.assertLess(
            lines.index("シードデータを投入しています..."),
            lines.index("npm run db:seed -- --yes"),
        )

    def test_cli_rejects_ipv6_only_compose_binding_before_any_write(self):
        self.config["services"]["db"]["ports"][0]["host_ip"] = "::1"
        self.container["NetworkSettings"]["Ports"]["5432/tcp"][0]["HostIp"] = "::1"
        result, writes = self.run_guard({"DATABASE_URL": "postgresql://user:password@127.0.0.1:25532/taskapp"})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(writes, "")

    def test_cli_rejects_ipv6_only_running_binding_before_any_write(self):
        for host_ip in ("::1", "::", "192.0.2.1", ""):
            with self.subTest(host_ip=host_ip):
                self.container["NetworkSettings"]["Ports"]["5432/tcp"][0]["HostIp"] = host_ip
                result, writes = self.run_guard()
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(writes, "")

    def test_cli_pins_localhost_to_verified_ipv4_loopback(self):
        for host_ip in ("0.0.0.0", "127.0.0.1"):
            with self.subTest(host_ip=host_ip):
                self.container["NetworkSettings"]["Ports"]["5432/tcp"][0]["HostIp"] = host_ip
                result, writes = self.run_guard()
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(len(writes.splitlines()), 3)
                self.assertTrue(all("@127.0.0.1:25532/taskapp" in line for line in writes.splitlines()))

    def test_cli_rejects_exported_foreign_url_before_any_write(self):
        result, writes = self.run_guard({"DATABASE_URL": "postgresql://user:private-password@other.example/taskapp"})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(writes, "")
        self.assertNotIn("private-password", result.stderr)

    def test_cli_does_not_write_when_docker_inspection_fails(self):
        result, writes = self.run_guard({"DOCKER_FIXTURE_FAIL": "1"})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(writes, "")

    def test_cli_does_not_use_an_unowned_running_port(self):
        result, writes = self.run_guard(containers=[], volumes=[])
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(writes, "")

    def test_cli_does_not_write_to_remote_docker(self):
        result, writes = self.run_guard({"DOCKER_HOST": "ssh://example.invalid"})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(writes, "")

    def test_cli_rejects_dotenv_override_even_when_spelled_false(self):
        result, writes = self.run_guard({"DOTENV_CONFIG_OVERRIDE": "false"})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(writes, "")

    def test_cli_rejects_alternate_dotenv_source(self):
        for setting in ("DOTENV_KEY", "DOTENV_CONFIG_DOTENV_KEY", "DOTENV_CONFIG_PATH"):
            with self.subTest(setting=setting):
                result, writes = self.run_guard({setting: "another-source"})
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(writes, "")

    def test_scaffold_blocks_foreign_database_before_compose_or_prisma(self):
        source = (ROOT / "scripts/scaffold-from-scratch.sh").read_text()
        helpers = source[source.index("compose() {"):source.index("\nmain() {")]
        (self.directory / "docker-compose.yml").write_text("services: {}\n")
        (self.directory / ".env.example").write_text("DATABASE_URL=postgresql://user:password@localhost:25532/taskapp\n")
        (self.directory / "prisma").mkdir()
        (self.directory / "prisma/schema.prisma").write_text("// fixture\n")
        (self.directory / "src/command").mkdir(parents=True)
        (self.directory / "src/command/seed.ts").write_text("// fixture\n")
        log = Path(self.temp.name) / "calls"
        log.write_text("")
        script = Path(self.temp.name) / "harness.sh"
        script.write_text('''set -euo pipefail
print_error() { echo "$*" >&2; }
docker() { printf 'docker %s\\n' "$*" >> "$CALL_LOG"; return 0; }
pg_isready() { return 0; }
npx() { printf 'npx %s\\n' "$*" >> "$CALL_LOG"; }
npm() { printf 'npm %s\\n' "$*" >> "$CALL_LOG"; }
node() { echo 'foreign database rejected' >&2; return 41; }
PROJECT_DIR="$PWD"
script_dir="/fixture/scripts"
''' + helpers + "\nsetup_database\n")
        result = subprocess.run(["bash", str(script)], cwd=self.directory,
                                env={**os.environ, "CALL_LOG": str(log)}, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0, "別DBでも初期化が成功扱いになりました")
        calls = log.read_text()
        self.assertNotIn("up -d", calls)
        self.assertNotIn("npx", calls)
        self.assertNotIn("db:seed", calls)


if __name__ == "__main__":
    unittest.main()
