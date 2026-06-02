<!-- AUTO-GENERATED from AGENTS.md by scripts/sync-ai-rules.sh -->
<!-- DO NOT HAND-EDIT — changes will be overwritten on next sync -->
<!-- To update: edit AGENTS.md, then run: bash scripts/sync-ai-rules.sh -->

# task-app — Gemini Code Assist スタイルガイド

## レビュー言語

- すべてのレビューコメントは **日本語** で記述してください
- 内部の思考プロセス（think）のみ英語で行い、出力は日本語にしてください

## PR サマリー

- PR の要約はポエティックで読みやすい形式で記述してください（CodeRabbit 風）
- 変更内容の本質を捉えた、わかりやすく印象的な表現を使用してください

---

<!-- ===== AGENTS.md CONTENT (auto-synced) ===== -->

# task-app

Next.js 15 タスク管理アプリ。30日間ハンズオン型プログラミング教材として販売予定。

- **本番**: https://task-app-pink-psi.vercel.app (Vercel)
- **ステージング**: Vercel Preview Deployment（PR ごと自動生成）

> ⚠️ `.gemini/styleguide.md` と `.github/copilot-instructions.md` はこのファイルから
> `scripts/sync-ai-rules.sh` で自動生成される。直接編集禁止。

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 15 + TypeScript（App Router 必須） |
| API | tRPC v11 |
| ORM | Prisma 6 + PostgreSQL 16 |
| スタイル | Tailwind CSS v4 + shadcn/ui |
| テスト | Vitest 3 (unit) + Playwright (E2E) |
| Linter | Biome 2 + ESLint |
| デプロイ | Vercel |

## コマンド

```bash
npm install          # 依存インストール
npm run dev          # Next.js 開発サーバー（Turbopack）
npm run build        # prisma generate && next build
npm run test         # Vitest ユニットテスト（タスク完了前に必須）
npm run test:e2e     # Playwright E2E テスト
npm run db:push      # Prisma スキーマ反映（開発）
npm run db:migrate   # Prisma マイグレーション実行
npm run db:seed      # シードデータ投入
npm run db:studio    # Prisma Studio 起動
```

## コーディング規約

- **コメント**: 日本語、「なぜ」のみ
- **コミットメッセージ**: 英語 Conventional Commits（`feat:`, `fix:`, `chore:` 等）
- `any` 型禁止・`@ts-ignore` 禁止・`eslint-disable` コメント禁止（根本解決する）
- Prisma: `findFirstOrThrow` / `findUniqueOrThrow` を活用（null チェック削減）
- `git reset --hard/--soft/--mixed` 禁止
- `--no-verify` 禁止・`--force`（`--force-with-lease` 以外）禁止
