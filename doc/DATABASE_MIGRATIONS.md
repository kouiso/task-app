# Database Migrations — 運用ガイド

## 概要

task-app は Prisma 6 を ORM として使用し、**production / staging 環境のスキーマ変更は migrations ファイルで管理する**。`db push` はローカル開発時の試行錯誤専用。

## ファイル構成

```
prisma/
├── schema.prisma                       # スキーマ本体（真実の源）
└── migrations/
    ├── migration_lock.toml             # provider 固定（postgresql）
    └── 0_init/
        └── migration.sql               # 2026-05-18 時点の baseline (全 model)
```

## 通常フロー: スキーマ変更

```bash
# 1. schema.prisma を編集
$EDITOR prisma/schema.prisma

# 2. 開発 DB へ migration 生成 + 適用
npm run db:migrate -- --name describe_your_change
# 例: npm run db:migrate -- --name add_task_priority_field

# 3. 生成された prisma/migrations/<timestamp>_describe_your_change/migration.sql を確認
# 4. 通常のコミット + PR
git add prisma/
git commit -m "feat(db): describe_your_change"
```

## 本番適用フロー

```bash
# CI / 本番デプロイで実行（Vercel build hook 等）
npx prisma migrate deploy
```

`prisma migrate deploy` は:
- 未適用の migrations を順番に流す（`_prisma_migrations` テーブルで管理）
- 既に適用済みの migration は skip
- 失敗時は途中で stop（手動 rollback が必要）

## 既存 DB を baseline に揃える（初回のみ）

既に `db push` で運用してきた DB に対して migrations を導入する場合:

```bash
# 1. 現状の DB スキーマと baseline migration が一致することを確認
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
# Exit code 0 = no drift

# 2. baseline migration を「適用済み」としてマーク（実 SQL は流さない）
npx prisma migrate resolve --applied 0_init
```

## Rollback 戦略

Prisma migrate には組み込み rollback コマンドが**ない**。本番で migration が問題を起こした場合:

1. **Forward fix**: 修正する新しい migration を作成して deploy
2. **Hard rollback**: DB バックアップから restore（Vercel Postgres の point-in-time recovery を使用）

## ローカル開発との関係

| 用途 | コマンド | 使用タイミング |
|---|---|---|
| 試行錯誤、教材で素早く schema を当てる | `npm run db:push` | 学習中、`material/30days-curriculum/` で使用 |
| Migration ファイル生成 | `npm run db:migrate` | feature 実装時 |
| 本番適用 | `npx prisma migrate deploy` | CI / Vercel build |
| Drift 検出 | `npx prisma migrate diff --exit-code` | CI チェック |

## 教材との整合性

`material/30days-curriculum/day30_完成版を公開！卒業！.md` で `prisma migrate deploy` を本番デプロイ手順として紹介している。本ドキュメントの導入により、教材と実装が一致する。
