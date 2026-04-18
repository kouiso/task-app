# Curriculum Walkthrough — day01 to day10 (A-2)

Date: 2026-04-18
Scope: day01-10 (environment setup + early implementation)
Worktree: task-app-verify-day01-10

## Per-day findings

### day01: 開発環境を整えて、初めてのアプリを動かそう
- Status: ❌
- Step(s) checked: Step 1, 3, 6-11
- Notes: `mise --version` / `node -v` / `npm install` / `npm run dev` は成功。`docker compose up -d db` は固定 `container_name: taskapp-postgres` が既存コンテナと衝突して失敗し、続く `npm run db:push` も `.env` の `${_DOCKER_COMPOSE_HOST_PORT_DB}` が Prisma で展開されず `P1013` で失敗した。`npm run db:seed` も既存DBへの認証不一致で失敗。

### day02: ダッシュボードに自分だけのメッセージを追加しよう
- Status: ❌
- Step(s) checked: Step 1-9
- Notes: `src/app/dashboard/page.tsx` に `recentTasks` と `space-y-10` は現存し、`src/lib/constant/status.ts` / `priority.ts` も存在する。一方で教材が追加させる歓迎バナー・`const`/`let` 実験コードは現行ダッシュボードの target state ではなく、手順どおり進めると現在の完成形から外れる。

### day03: GitHubに保存する
- Status: ❌
- Step(s) checked: Step 1-6
- Notes: Step 3 が `git add .` を明示しており、この検証タスクの hard rule と衝突する。外部 GitHub リポジトリ作成・認証の流れ自体は一般的だが、この worktree で安全に再現すべき手順としては不適切。

### day04: ネットに公開
- Status: ⚠️
- Step(s) checked: Step 3, 5-6
- Notes: Neon/Vercel 前提の外部作業が中心で、ローカル worktree だけでは end-to-end 再現不可。`openssl rand -base64 32` は使え、`prisma db push` / `npm run db:seed` の指示自体は repo と対応しているが、day01 の DB セットアップ不整合を引き継ぐためそのままでは詰まりやすい。

### day05: ログイン画面のUI
- Status: ⚠️
- Step(s) checked: Step 1-9
- Notes: `src/app/login/page.tsx` と `@/component/ui/*`, `@/trpc/react` の参照先は存在する。現行ファイルはすでに toast・`callbackUrl` 検証・`Suspense` まで含む完成形で、教材の段階的実装は大筋こそ合うが current target と完全一致しない。

### day06: ユーザー登録画面
- Status: ❌
- Step(s) checked: Step 1-10
- Notes: 教材は「クライアント側のパスワード要件がサーバー側と一致する」と説明しているが、現行 `src/app/register/page.tsx` は `min(8)` と確認欄のみで、`src/server/api/routers/auth.ts` の大文字・小文字・数字・記号必須 regex と一致していない。教材どおりに作ると current target からずれる。

### day07: ログイン体験を改善しよう
- Status: ✅
- Step(s) checked: Step 1-8
- Notes: `src/server/api/routers/auth.ts` の bcrypt 照合、`src/lib/session.ts` の JWT/Cookie 処理、`src/app/login/page.tsx` の成功 toast まで参照先が揃っている。読み進めて確認する日としては現行実装と概ね一致していた。

### day08: サイドバーを完成させよう
- Status: ✅
- Step(s) checked: Step 1-8
- Notes: `src/component/layout/app-layout.tsx` の認証ガード・ロール別メニュー・ログアウト確認ダイアログ、`src/component/ui/alert-dialog.tsx` の存在確認まで教材どおり追えた。read-only walkthrough として破綻は見当たらない。

### day09: プロジェクト一覧画面
- Status: ❌
- Step(s) checked: Step 1-10
- Notes: `src/app/project/page.tsx` は現時点で詳細ビュー、メンバー追加、削除確認、アーカイブ切替まで含むより進んだ実装。教材はファイルを簡略版に置き換える前提で書かれており、そのまま追うと current target の機能を落としてしまう。

### day10: プロジェクト新規作成を実装しよう
- Status: ⚠️
- Step(s) checked: Step 1-8
- Notes: `src/component/project/project-dialog.tsx` 自体は存在し、概念的には教材と同じ。だが教材の中核説明は `useForm({ values: ... })` 前提なのに、現行実装は `defaultValues` + `useEffect(reset)` + `buildProjectFormValues()` で同期しており、検索しても教材どおりのコードが出てこない。

## Aggregate summary
- Blocking issues (❌): 5 days — day01, day02, day03, day06, day09
- Minor frictions (⚠️): 3 days — day04, day05, day10
- Clean days (✅): 2 days — day07, day08

## Top 3 priority fixes (if any)
1. day01 を先に直す。`docker-compose.yml` の固定 `container_name` と、Prisma がそのまま読める `.env` 記述を見直さないと初回セットアップが安定しない。
2. day02 / day05 / day06 / day09 / day10 を current `src/` ベースに書き直す。いまの教材は greenfield 手順と現行完成形が混在している。
3. day03 の `git add .` をやめ、明示パスの staging 手順に差し替える。検証ルールにも実運用にも合っていない。
