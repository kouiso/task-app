# テスト実行結果レポート — 2026-04-13

## 概要

| 項目 | 値 |
|------|-----|
| 実行日時 | 2026-04-13 |
| テストフレームワーク | Vitest 3.0.9 |
| テスト環境 | node (API) / jsdom (コンポーネント) |
| DB | PostgreSQL 16-alpine (Docker: taskapp-test-postgres, port 5433) |
| 結果 | **全テスト PASS** |

## 実行結果

```
Test Files  10 passed (10)
     Tests  173 passed (173)
  Start at  10:39:43
  Duration  39.97s (transform 176ms, setup 149ms, collect 1.49s, tests 37.70s, environment 250ms, prepare 58ms)
```

## テストファイル別内訳

| # | ファイル | テスト数 | 結果 |
|---|---------|---------|------|
| 1 | src/app/api/trpc/routers/project.test.ts | 34 | PASS |
| 2 | src/app/api/trpc/routers/user.test.ts | 30 | PASS |
| 3 | src/app/api/trpc/routers/task.test.ts | 29 | PASS |
| 4 | src/app/api/trpc/routers/auth.test.ts | 20 | PASS |
| 5 | src/app/api/trpc/routers/search.test.ts | 18 | PASS |
| 6 | src/app/api/trpc/routers/comment.test.ts | 18 | PASS |
| 7 | src/components/task-card.test.tsx | 12 | PASS |
| 8 | src/app/api/trpc/routers/report.test.ts | 9 | PASS |
| 9 | src/lib/type-guards.test.ts | 2 | PASS |
| 10 | src/hooks/use-local-storage.test.ts | 1 | PASS |
| | **合計** | **173** | **ALL PASS** |

## 修正前の状態

- 160/173 テストが `PrismaClientInitializationError P1000` で失敗
- 原因: テスト用PostgreSQLコンテナ (`taskapp-test-postgres`) が未起動
- ポート 5433 が別プロジェクト (`mypappy-api-test-db-1`) に占有されていた

## 修正内容

**コード変更: なし** — インフラ対応のみ

1. ポート 5433 を占有していた `mypappy-api-test-db-1` コンテナを停止
2. `docker compose up -d test-db` で task-app 用テストDBコンテナを起動
3. ヘルスチェック通過を確認後、`npm test` を実行

## 設定確認

- `vitest.config.ts` の `DATABASE_URL`: `postgresql://user:password@localhost:5433/taskapp_test?schema=public`
- `docker-compose.yml` の `test-db` サービス: `postgres:16-alpine`, port `5433:5432`
- `src/test/setup.ts`: beforeAll で `prisma db push --skip-generate` を実行（node環境のみ）
