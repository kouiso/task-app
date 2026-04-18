# Premortem

最終更新: 2026-04-17

## 目的

本番投入後に現実的に起こりうる失敗シナリオを先回りで洗い出し、事故前提で対策優先順位を整理する。

## 最優先で潰すべき項目

### 1. 無効化ユーザーが操作を継続できる

- 再現条件: ログイン済みユーザーを管理者が無効化し、そのまま画面操作を続ける
- 影響: 停止済みアカウントがタスク・プロジェクト操作を継続できる
- 対応状況: `src/server/api/trpc.ts` で `protectedProcedure` 実行時に `isActive` を再検証する修正を反映済み

### 2. 日付がタイムゾーンでずれる

- 再現条件: `type="date"` 由来の値を `new Date(...).toISOString()` で保存し、UTC 以外で閲覧する
- 影響: 期限日、検索条件、今日・期限切れ判定がずれる
- 未対応箇所: `src/app/task/page.tsx`, `src/app/search/page.tsx`, `src/app/my-task/page.tsx`, `src/component/task/task-card.tsx`
- 必要対応: date-only 値の保存方針を見直し、`dateFrom/startOfDay`, `dateTo/endOfDay` を統一する

### 3. 別プロジェクトのユーザーを担当者にできる

- 再現条件: A プロジェクトのタスクに、B プロジェクトだけのメンバーを担当者として指定する
- 影響: 非メンバーへタスク情報が露出する
- 対応状況: `src/server/api/routers/task.ts` で create/update 時の project-membership 検証を追加済み
- 残課題: UI の候補リストも project 単位に絞るとより堅い

### 4. プロジェクトが無主化する

- 再現条件: 最後の OWNER を role 更新で外す
- 影響: メンバー管理や復旧ができない project が発生する
- 未対応箇所: `src/server/api/routers/project.ts`
- 必要対応: `updateMemberRole` に OWNER 下限 1 の保証と transaction を入れる

### 5. 101 件目以降でダッシュボードとレポートが嘘をつく

- 再現条件: タスク数が `task.getAll` の既定 limit 100 を超える
- 影響: 完了率、件数、工数、最近のタスク表示が欠落する
- 未対応箇所: `src/server/api/routers/task.ts`, `src/app/dashboard/page.tsx`, `src/app/report/page.tsx`
- 必要対応: 集計専用 endpoint を分離し、一覧 API の limit 前提を UI から外す

## 次点の懸念

### 6. 検索の `dateTo` で当日分が漏れる

- `src/app/search/page.tsx` と `src/server/api/routers/search.ts` の date 変換が end-of-day になっていない

### 7. ステータス絞り込み WARN が未解決

- `docs/evidence/playwright-scenario-3.md` に「進行中 filter で TODO が残存」の WARN がある
- DOM 検証の誤りか実装バグかを切り分ける必要がある

### 8. 同時操作で position や timer 計算が壊れる

- `src/server/api/routers/task.ts` の position 採番と timer 更新は transaction 非依存

### 9. 動的詳細ページが route-level 404 に乗っていない

- `src/app/user/[id]/page.tsx`, `src/app/user/[id]/edit/page.tsx` が `notFound()` を使わず画面内分岐している

### 10. 低 coverage により回帰を拾いにくい

- 分母補正後も coverage は 25.20% で、`app` / 業務 UI が広く未検証

## 判断

現時点で塞いだ本質課題は以下。

- 無効化ユーザーの継続利用
- 担当者の project-membership 欠落
- CI の lint false green
- session ログの過剰出力

未解決の本命は `date-only / timezone`, `owner invariant`, `report/dashboard >100件`, `route-level 404`, `low coverage`。
