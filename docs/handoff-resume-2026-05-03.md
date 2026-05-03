# Handoff: 教材 scaffold-first 完全書き直し (2026-05-03)

## 方針決定

磯貝さん確定方針: **「教材だけで完結する scaffold-first」**
- scaffold は環境 + UI コンポーネント + Prisma/Docker のみ提供
- アプリケーションコード（pages, server, auth, tRPC setup）は教材で書かせる
- `_src-full` は廃止。読者が教材の手順でゼロから積み上げる
- 「読む」ステップを「書く」ステップに書き直す
- 各ステップは Day 01-04 のパターン踏襲: なぜ → 図解 → 小さく書く → 確認ポイント → つまずきポイント

## 読者試行で発見・修正済みバグ (11件)

| # | 内容 | 状態 |
|---|---|---|
| 1 | scaffold 自己ブロック | ✅ FIXED |
| 2 | tailwindcss-animate @plugin | ✅ FIXED |
| 3 | date-fns 未インストール | ✅ FIXED |
| 4 | shadcn/ui 未配置 | ✅ FIXED |
| 5 | Prisma/Docker/seed 未配置 | ✅ FIXED |
| 6 | server ファイル未配布 | ✅ FIXED (但し _src-full 方式は廃止予定) |
| 7 | react-hot-toast 未インストール | ✅ FIXED |
| 8 | superjson 未インストール | ✅ FIXED |
| 9 | Sentry import エラー | ✅ FIXED |
| 10 | middleware が Day 01-06 で認証ブロック | ✅ FIXED (AUTH_ENABLED 方式) |
| 11 | page.tsx の認証依存 (/) | OPEN — _src-full 廃止で解消予定 |

## 書き直しが必要な Day (8本)

### 重症 (「開いて読む」中心 → 「作って書く」に全面書き直し)

**Day 07** (open=17, create=1): ログイン体験改善
- auth.ts を「読む」→「Step ごとに書く」に変更
- session.ts を「読む」→「JWT の仕組みを説明しながら書く」に変更
- trpc.ts を「読む」→「tRPC のセットアップを書く」に変更
- 前提: Day 05-06 で login/register ページを作った後、バックエンドを繋ぐ Day

**Day 08** (open=12, create=0): サイドバー完成
- AppLayout を「読む」→「レイアウトコンポーネントを作る」に変更
- サイドバーのナビゲーションを Step ごとに構築

### 要修正 (一部「開いて」を「作って」に変更)

**Day 12** (open=2, create=0): メンバー追加
**Day 18** (open=4, create=0): コメント投稿
**Day 19** (open=3, create=0): コメント編集・削除
**Day 26** (open=6, create=0): エラーページ
**Day 28** (open=6, create=0): タスク一括操作

### 軽微 (1-2箇所の修正)

**Day 24** (open=1, create=0): ユーザー一覧

## scaffold 配布物の最終形

### 残すもの
- `scaffold-from-scratch.sh` — Next.js 土台 + 依存インストール + Biome
- `_ui-components/` — shadcn/ui 29コンポーネント
- `_lib-utils/` — cn() ユーティリティ
- `_prisma/` — schema.prisma + prisma.config.ts
- `_docker/` — docker-compose.yml
- `_seed/` — seed.ts

### 廃止するもの
- `_src-full/` — 完成版 src/ の丸ごと配布（scaffold-first と矛盾）
- `_server/` — _src-full に包含されてたもの
- `_lib-core/` — 同上

### 新規追加が必要なもの
- `_lib-base/` — env.ts, prisma.ts のみ（DB 接続に必要な最小限）
- `_trpc-base/` — tRPC クライアント設定のみ（react.tsx, query-client.ts, query-constants.ts, server.ts）
- `_types/` — 型定義（型は教材で書かせるより提供した方が学習効率が良い）
- `_constants/` — 定数（status, priority, roles）

## 各 Day で読者が作るファイルの依存マップ

| Day | 作成するファイル | 依存 |
|---|---|---|
| 01 | page.tsx, dashboard/page.tsx, globals.css | なし |
| 02 | dashboard/page.tsx の編集 | Day 01 |
| 03 | Git 操作のみ | Day 02 |
| 04 | Vercel デプロイのみ | Day 03 |
| 05 | login/page.tsx | UI components (scaffold) |
| 06 | register/page.tsx | UI components |
| 07 | server/api/trpc.ts, server/api/routers/auth.ts, lib/session.ts, middleware.ts | Prisma (scaffold), jose (scaffold) |
| 08 | component/layout/app-layout.tsx, providers.tsx, layout.tsx 編集 | tRPC (Day 07) |
| 09 | project/page.tsx | AppLayout (Day 08) |
| 10 | project-dialog.tsx + mutation | Day 09 |
| 11 | 編集・削除機能追加 | Day 10 |
| 12 | メンバー追加 | Day 11 |
| 13 | task/page.tsx | Day 12 |
| 14 | task-dialog.tsx + mutation | Day 13 |
| 15 | タスク編集・削除 | Day 14 |
| 16 | タイマー・ステータス | Day 15 |
| 17 | my-task/page.tsx | Day 16 |
| 18 | コメント投稿 | Day 17 |
| 19 | コメント編集・削除 | Day 18 |
| 20 | search/page.tsx | Day 19 |
| 21 | report/page.tsx (統計カード) | Day 20 |
| 22 | グラフ追加 | Day 21 |
| 23 | 週次レポート | Day 22 |
| 24 | user/page.tsx | Day 23 |
| 25 | profile/ 3ページ | Day 24 |
| 26 | error.tsx, not-found.tsx | Day 25 |
| 27 | プロジェクト詳細・アーカイブ | Day 26 |
| 28 | タスク一括操作 | Day 27 |
| 29 | ユーザー詳細・編集 | Day 28 |
| 30 | 本番デプロイ | Day 29 |

## 次セッションの実行手順

1. `_src-full/`, `_server/`, `_lib-core/` を scaffold から削除
2. `_lib-base/`, `_trpc-base/`, `_types/`, `_constants/` を新規作成
3. Day 07 を全面書き直し（最重要 — 認証の核心）
4. Day 08 を書き直し（レイアウトの核心）
5. Day 12, 18, 19, 24, 26, 28 を修正
6. 全 Day を `/tmp/task-app-trial` で読者試行して動作確認
7. コミット + push

## 注意事項

- 実行検証なしに「完了」と報告しない（execution-verification-gate skill 参照）
- Codex に丸投げしない（過去 3 回失敗。Claude がコンテンツを生成し、挿入だけ自動化）
- 各 Day の書き直し後に必ず `/tmp` で実行確認してからコミット
