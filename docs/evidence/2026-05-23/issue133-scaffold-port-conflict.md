# Issue #133 scaffold DB port conflict evidence

日付: 2026-05-23
Issue: https://github.com/kouiso/task-app/issues/133
真の目的への寄与: 90%

## 目的

PR #134 の実 walkthrough 中に、既存の `25532` / `25533` が使用中だと `scripts/scaffold-from-scratch.sh` が raw Docker error を出すことを確認しました。読者が教材をやり直す、または複数コピーで試す場合に詰まりやすいため、Day01 setup をより説明的にしました。

## Root Cause

以前の script は `docker compose up -d db test-db || docker-compose up -d db test-db` で app DB と test DB を同時に起動していました。

この形だと、どちらかの port が既に使われているだけで Docker の低レベル error がそのまま表示されます。また app DB は既に応答していて続行できる状態でも、読者には失敗に見えます。

## 修正

- app DB と test DB を別々に起動するように変更。
- `.env` の `_DOCKER_COMPOSE_HOST_PORT_DB` / `_DOCKER_COMPOSE_HOST_PORT_TEST_DB` を読み取り、既存 PostgreSQL が応答する場合は Docker 起動をスキップ。
- test DB 起動だけ失敗した場合は、Day01 の app 起動は続行できることと、後で test 実行前に port を変える必要があることを明示。
- `docker compose` と legacy `docker-compose` の fallback を `compose()` に集約。

## Expected vs Actual

| Check | Expected | Actual | Diff |
|---|---|---|---|
| 25532 使用中 | raw Docker bind error で詰まらない | `localhost:25532 の PostgreSQL が既に応答しているため、アプリ用 DB 起動はスキップします。` と表示して続行 | none |
| 25533 使用中 | raw Docker bind error で詰まらない | `localhost:25533 の PostgreSQL が既に応答しているため、テスト用 DB 起動はスキップします。` と表示して続行 | none |
| Day01 setup | scaffold が最後まで完了する | `/tmp/task-app-issue133-port-walkthrough-Z48YkJ` で完了 | none |
| 生成物 lint | scaffold 出力に Biome error がない | `npm run lint` pass、76 files checked | none |
| 生成物 type-check | scaffold 出力が type-check できる | `npm run type-check` pass | none |
| 生成物 build | scaffold 出力が build できる | `npm run build` pass、5 app routes generated | none |

## Verification

```bash
bash -n scripts/scaffold-from-scratch.sh
git diff --check
npm run lint:ci
npm audit --audit-level=high
npm run type-check
TEST_DATABASE_URL='postgresql://user:password@localhost:25533/taskapp_test?schema=public' npm test

# 配布物コピーでの Day01 replay
bash scripts/scaffold-from-scratch.sh
npm run lint
npm run type-check
npm run build
```

結果:

- `bash -n scripts/scaffold-from-scratch.sh`: pass
- `git diff --check`: pass
- `npm run lint:ci`: pass、240 files checked
- `npm audit --audit-level=high`: pass。既知の moderate PostCSS advisory は残るが、force fix は Next downgrade を伴う
- `npm run type-check`: pass
- `TEST_DATABASE_URL='postgresql://user:password@localhost:25533/taskapp_test?schema=public' npm test`: pass、15 files / 215 tests
- 実 Day01 replay: setup 完了、生成物 lint/type-check/build pass

## 1分 Demo

1. 既に `25532` / `25533` を使っている状態で、配布物コピーから `bash scripts/scaffold-from-scratch.sh` を実行する。
2. 期待: raw Docker bind error で止まらず、既存 PostgreSQL を検出した説明が表示される。
3. 期待: 最後に `初期セットアップは完了しました。` が表示され、生成 app の `npm run build` が通る。
