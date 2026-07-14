# Phase A-(-1) baseline canary report

Generated: 2026-07-14T04:12:12Z (Codex sandbox run — blocked)
Local re-run appended: 2026-07-14T04:22Z (full network + Docker)

---

## UPDATE: real local run (network + Docker available)

The first attempt ran inside the Codex sandbox and never reached Day 01
because the sandbox blocked npm network and the Docker socket (see the
original report below). A re-run on the local machine (Node 22, orbstack
Docker, npm network all available) got past scaffolding and actually
entered the loop-runner.

証拠ソース: 全て `[CLI実行ログ]` — ローカルで `bash run-baseline-canary.sh`
をバックグラウンド実行し、`canary.log` と `/tmp/task-app-canary-local/.planning/loop-state.json`
の実出力を読んで確認した(Claude自身のCLI実行、目視ログ確認)。

### Result: loop stopped at Day 01 (never completes — matches "完走実績なし")

- Target app: `/tmp/task-app-canary-local`
- scaffold-from-scratch.sh: succeeded `[実機目視]` (npm install + docker compose
  Postgres on 25532/25533 + prisma db push/generate + seed all completed)
- Day 01 verify_day.py checks (`[実機目視]` — canary.log / loop-state.json 目視):
  - `npm run build` → **PASS** `[実機目視]`
  - `npm test` (vitest run) → **FAIL** `[実機目視]`: `No test files found, exiting with code 1`
  - playwright step never reached (test failed first)

### Finding 1 (tooling/material bug, NOT environment)

`scripts/loop-runner/verify_day.py` runs `npm test` unconditionally on
**every** day. But at Day 01 the learner has written zero tests, and
`vitest run` exits 1 when it finds no test files. So the loop-runner can
never pass Day 01 as currently written — this is why the plan noted
"loop-runner完走実績なし".

Direct implication for this rewrite:
- The D8 test-provenance work must decide, per day, whether any test files
  exist yet; days before the first test is introduced must not run (or must
  tolerate) an empty `npm test`.
- Fix options: pass `--passWithNoTests` to vitest, gate the test step on
  "tests exist in target", or introduce the first 写経 test earlier. This is
  Phase A-5 (apply_day/verify_day hardening) territory.

### Finding 2 (orchestrator mislabels failure reason)

`.planning/loop-state.json` recorded the Day 01 failure as
`"reason": "npm run build failed"`, but the log shows build PASSED `[実機目視]`
and the **test** step failed. `00_orchestrator.sh` labels any `verify_day.py`
non-zero exit as "npm run build failed" regardless of which sub-check
(build / test / playwright) actually failed. This must be fixed in A-5 so
the ledger classifies failures truthfully (a build failure and a test
failure need different responses).

### Classification of observed failures

証拠ソース: 下表の PASS/FAIL は全て `[実機目視]`(ローカルCLI実行の canary.log を目視確認)。

| Stage | Result | Classification |
|---|---|---|
| scaffold (npm install, docker, prisma) | PASS `[実機目視]` | — (environment now adequate) |
| Day 01 `npm run build` | PASS `[実機目視]` | — |
| Day 01 `npm test` | FAIL `[実機目視]` (no test files) | **material/tooling-bug** — verify harness runs npm test on a test-less day |
| fail_history reason label | wrong (said build, was test) | **tooling-bug** — orchestrator mislabels |

No genuinely-material curriculum-content bug was reached (the loop died at
the tooling-level test gate on Day 01 before exercising later days).

---

## Original Codex-sandbox run (blocked before Day 01) — kept for reference

## Scope

- Repo under test: `/tmp/task-app-main-canary`
- Source ref: `origin/main` at `88c5ee8a459254611e528967d86ec673565197b8`
- Target app dir: `/tmp/task-app-canary-target`
- Existing feature worktree: `/Users/kouiso/ghq/kouiso/task-app` was not used for execution.
- Captured scaffold log: `/tmp/task-app-canary-target/scaffold.log`
- Loop-runner log: not created, because the scaffold prerequisite failed before `00_orchestrator.sh` could be run.

## Environment prerequisites discovered

- Node.js: curriculum scaffold requires Node.js 22 or newer.
  - Default shell resolved to Node `v20.20.0`, which failed the scaffold preflight.
  - Directly pinning `PATH=/Users/kouiso/.local/share/mise/installs/node/22.22.2/bin:$PATH` provided Node `v22.22.2` and npm `10.9.7`.
  - Repo declares Node 22 via `.node-version` and `.mise.toml`; mise config trust/cache writes were blocked by sandbox permissions, so direct PATH pinning was required.
- npm/network:
  - `scripts/scaffold-from-scratch.sh` invokes `npx create-next-app@15.5.18`.
  - No local npm cache entry for `create-next-app` was found.
  - DNS/network access to `registry.npmjs.org` was unavailable, blocking scaffold creation.
- Docker/PostgreSQL:
  - `docker --version`: Docker `29.0.2`
  - `docker compose version`: Docker Compose `v5.1.2`
  - Docker daemon/API was not accessible from this sandbox:
    `permission denied while trying to connect to the docker API at unix:///Users/kouiso/.orbstack/run/docker.sock`
  - `docker-compose.yml` expects:
    - app DB: PostgreSQL 16 on host port `25532`, database `taskapp`, user `user`, password `password`
    - test DB: PostgreSQL 16 on host port `25533`, database `taskapp_test`, user `user`, password `password`
  - `.env.example` expects:
    - `DATABASE_URL="postgresql://user:password@localhost:25532/taskapp?schema=public"`
    - `TEST_DATABASE_URL="postgresql://user:password@localhost:25533/taskapp_test?schema=public"`
    - `JWT_SECRET` of at least 32 characters
    - `NODE_ENV="development"`
- Ports:
  - Port `3000` was already occupied by a `node` process.
  - No listener was observed on `25532` or `25533`.
- Prisma:
  - Scaffold script would run `npx prisma db push` and `npx prisma generate` after copying `.env.example` to `.env` and starting DB services.
  - These steps were not reached.
- Playwright:
  - Loop verification runs `npx playwright test e2e/screenshots.spec.ts --project=chromium` after build and unit tests.
  - Browser installation was not reached.

## Progress / stop point

The canary did not reach Day 01. It stopped during Step 2, while running:

```bash
PATH=/Users/kouiso/.local/share/mise/installs/node/22.22.2/bin:$PATH \
  bash /tmp/task-app-main-canary/scripts/scaffold-from-scratch.sh
```

The run was not time-budget exhausted. It stopped early because the baseline app could not be scaffolded in the current environment.

Exact scaffold log excerpt:

```text
教材用の初期土台を /private/tmp/task-app-canary-target に作成します。
npm error code ENOTFOUND
npm error syscall getaddrinfo
npm error errno ENOTFOUND
npm error network request to https://registry.npmjs.org/create-next-app failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org
npm error network This is a problem related to network connectivity.
```

Before pinning Node 22, the scaffold also failed with:

```text
エラー: Node.js v20.20.0 は非対応です。Node.js 22 以上が必要です: https://nodejs.org/
```

## fail_history

No `fail_history` exists for this run.

Reason: `scripts/loop-runner/00_orchestrator.sh` was not started because the scaffold prerequisite failed. I checked both expected locations:

- `/tmp/task-app-main-canary/.planning/loop-state.json`
- `/tmp/task-app-canary-target/.planning/loop-state.json`

Neither file existed at report time.

## Failure classification

| Stage | Error | Classification | Reasoning |
|---|---|---|---|
| scaffold preflight | `Node.js v20.20.0 は非対応です。Node.js 22 以上が必要です` | environment-issue | The repo correctly declares Node 22; the active shell was using Node 20 because mise trust/cache writes were blocked. Pinning the installed Node 22 binary resolved this preflight. |
| scaffold dependency fetch | `request to https://registry.npmjs.org/create-next-app failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org` | environment-issue | The scaffold depends on downloading `create-next-app@15.5.18`. DNS/network access was unavailable and no local cache existed. This is not evidence that curriculum markdown instructions are wrong. |
| Docker readiness | `permission denied while trying to connect to the docker API at unix:///Users/kouiso/.orbstack/run/docker.sock` | environment-issue | Docker is installed, but the current sandbox cannot access the daemon. DB setup would fail later unless Docker socket access or local PostgreSQL is provided. |

No material-bug failures were observed, because no day markdown was applied and no day build/test verification ran.

## Other observations

- `origin/main` orchestrator uses `STATE_FILE="$REPO_DIR/.planning/loop-state.json"`, so structured loop state is written under the repo worktree, not the target app dir. The task instructions expected `.planning/loop-state.json` in the target app dir; for this ref, the repo location is the one to inspect after a real orchestrator run.
- `verify_day.py` performs build, unit tests, then Playwright screenshots for every day:
  - `npm run build`
  - `npm test`
  - `npx playwright test e2e/screenshots.spec.ts --project=chromium`
- To get a meaningful day01-day30 characterization run, the environment needs:
  - Node 22+ active without relying on untrusted mise config writes.
  - Network access to npm registry, or a pre-populated npm cache/vendor path for `create-next-app@15.5.18` and subsequent dependencies.
  - Docker daemon access to start PostgreSQL on `25532` and `25533`, or equivalent local PostgreSQL instances matching `.env.example`.
  - Port `3000` free or explicit handling if Playwright/dev-server steps require it.
