# Curriculum Walkthrough — day11 to day20 (A-2)

Date: 2026-04-18
Scope: day11-20
Worktree: task-app-verify-day11-20

## Per-day findings

### day11: プロジェクト編集・削除
- ⚠️ Minor friction
- Step 1 / Step 3 の日付変換説明は `toISOString()` 前提ですが、現行 `src/app/project/page.tsx` は `dateOnlyFromValue()` / `dateOnlyToUtcStartIso()` を使う実装です。手順どおりでも概念は通じますが、current `src/` との差分があります。
- 同ファイルの `description ?? null` と `description || null` の比較説明は、直前のコード例・現行実装の両方と食い違っており、初学者が混乱しやすいです。

### day12: メンバー追加
- ❌ Blocking issue
- ロール表では「MEMBER はプロジェクト編集可」と読めますが、現行 `src/server/api/routers/project.ts` の `update` は `canManageMembers` で権限判定しており、実際に更新できるのは OWNER / ADMIN だけです。
- 追加・削除フロー自体は `src/app/project/page.tsx` / `src/component/project/project-detail-view.tsx` と概ね一致しますが、権限説明は structural mismatch です。

### day13: タスク一覧画面
- ✅ OK
- `src/app/task/page.tsx`、`src/component/task/task-card.tsx`、`src/component/task/task-detail-dialog.tsx` の配置と流れはカリキュラムどおりです。現行画面には一括操作が足されていますが、day13 の手順を壊す差分ではありません。

### day14: タスク新規作成
- ⚠️ Minor friction
- `src/component/task/task-dialog.tsx` は存在し、フォーム項目も概ね一致しますが、送信時の日付変換は教材の `new Date(...).toISOString()` ではなく現行 `src/app/task/page.tsx` の `dateOnlyToUtcStartIso()` に合わせる必要があります。
- 完成形の挙動は一致するものの、コードスニペットは current `src/` に対して少し古いです。

### day15: タスク編集・削除
- ⚠️ Minor friction
- Step 1 は `TaskDialog` が `useForm({ values })` で同期している前提ですが、現行 `src/component/task/task-dialog.tsx` は `defaultValues` + `useEffect(reset)` パターンです。
- `handleSubmit` の日付変換も `toISOString()` 記述のままで、現行 `src/app/task/page.tsx` の helper ベース実装とずれています。

### day16: ステータス変更・タイマー
- ✅ OK
- `src/component/task/task-timer.tsx` と `src/component/task/time-log-dialog.tsx` が存在し、`api.task.updateTimer` / `api.task.addTime` を使う流れも教材と一致します。Step の並びで破綻する箇所は見当たりませんでした。

### day17: 自分のタスクページ
- ⚠️ Minor friction
- 期限グループ化の中心説明は現行 `src/lib/date.ts` と `src/app/my-task/page.tsx` に合っており、`dateOnlyFromValue()` / `localDateOnly()` で比較する説明は妥当です。
- ただし Step 11 の `handleSubmit` 例はまだ `new Date(data.dueDate).toISOString()` のままで、現行実装の `dateOnlyToUtcStartIso()` とずれています。

### day18: コメント投稿
- ✅ OK
- 「読む日」としての目的は現行 `src/component/task/task-detail-dialog.tsx` / `src/server/api/routers/comment.ts` に沿っています。コメント一覧は `taskDetail.comments` から読む構成で、教材の補足とも整合しています。

### day19: コメント編集・削除
- ✅ OK
- `editingCommentId`、本人チェック、`DeleteConfirmDialog`、`comment.update` / `comment.delete` の流れは現行コードと一致しています。`src/component/task/task-detail-dialog.tsx` の実装をそのまま追えます。

### day20: タスク検索
- ⚠️ Minor friction
- フロント側の `formValues.keyword || undefined` パターンは現行 `src/app/search/page.tsx` と一致し、`enabled: shouldSearch` もそのまま確認できます。
- ただし日付フィルターは教材後半のコード例が `new Date(...).toISOString()` のままで、現行実装は `dateOnlyToUtcStartIso()` / `dateOnlyToUtcEndIso()` を使います。検索 API の実体も `src/server/api/routers/task.ts` ではなく `src/server/api/routers/search.ts` です。

## Aggregate summary

- 判定内訳: `✅ 4`、`⚠️ 5`、`❌ 1`
- 最大のズレは day12 の権限説明です。教材のロール表と現行 `project.update` の enforce 条件が一致していません。
- day11 / 14 / 15 / 17 / 20 は、主に date-only helper 導入後の説明更新漏れです。現在の `src/` は UTC 境界 helper に寄せられており、古い `toISOString()` ベースの断片が残っています。
- 実行確認:
  - `npm install`: 成功
  - `npm run lint`: 成功
  - `npm run type-check`: 成功
  - `npm test`: 失敗。`src/test/setup.ts` からの `npx prisma db push --skip-generate` が `P1000 Authentication failed` で止まり、DB 資格情報がない状態では教材の検証コマンドとして再現不能でした。

## Top 3 priority fixes (if any)

1. day12 の権限表を現行実装に合わせて修正するか、`project.update` の権限判定を `canEdit` に見直す。今は教材とサーバー enforce が食い違っています。
2. day11 / 14 / 15 / 17 / 20 の日付処理コード例を `dateOnlyFromValue()` / `dateOnlyToUtcStartIso()` / `dateOnlyToUtcEndIso()` ベースへ統一する。初学者が raw `toISOString()` を写すと current `src/` と揃いません。
3. walkthrough 前提のテスト実行条件を明記する。少なくとも `npm test` が通るための DB 接続方法か、ローカル検証用の代替手順が必要です。
