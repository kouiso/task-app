# Curriculum Walkthrough — day21 to day30 (A-2)

Date: 2026-04-18
Scope: day21-30 (advanced features + deploy)
Worktree: task-app-verify-day21-30

## Per-day findings
### day21: 統計カードを表示しよう
⚠️ Minor friction

`api.report.getOverview` の主要項目と `src/app/report/page.tsx` の 4 枚カード + `projectStats` テーブルは一致します。  
ただし教材は `src/app/report/page.tsx` を「新規作成」前提で進めるため、現行 `src/` に対してそのまま写経すると day22/day23 済みのグラフ・週次リンクを一度壊します。`getOverview` は `src/app/dashboard/page.tsx` でも使われており、説明が `/report` 専用に見える点も軽いズレです。

### day22: グラフを表示しよう
✅ OK

`recharts` は `package.json` にあり、`npm list recharts` でも `3.2.1` を確認できました。  
`src/app/report/page.tsx` のステータス別・優先度別円グラフ、色定数、`ResponsiveContainer` の使い方は教材と整合しています。

### day23: 週次レポートを表示しよう
⚠️ Minor friction

`src/app/report/weekly/page.tsx` は教材どおりの `Select`、サマリーカード、`LineChart` / `BarChart` を実装済みです。  
一方で `projectStats` の説明はやや単純化されすぎで、実際の `src/server/api/routers/report.ts#getOverview` は `project.findMany`、task の `groupBy`、`aggregate` を組み合わせており、「`groupBy` と `count` だけで作っている」と読むと現行実装を誤解しやすいです。

### day24: ユーザー一覧（管理者用）
✅ OK

`src/app/user/page.tsx` は `api.auth.getCurrentUser` と `api.user.getAll` を使う流れ、管理者チェック、空状態、詳細/編集導線まで教材の想定と概ね一致します。  
現在の実装は権限エラー時に toast + `/dashboard` への遷移も入り、教材より少し実務寄りです。

### day25: プロフィール編集
❌ Blocking issue

画面構成自体は `src/app/profile/{page,edit/page,change-password/page}.tsx` と一致しますが、教材のパスワード要件が現行サーバー実装と一致しません。  
教材とクライアント画面は「8文字以上」中心なのに、`src/server/api/routers/user.ts#changePasswordSchema` は大文字・小文字・数字・特殊文字も必須です。教材どおり入力すると保存でサーバーエラーになり、未経験者には原因が分かりにくいです。

### day26: エラーページを作って、バグを退治しよう
✅ OK

`src/app/error.tsx` と `src/app/not-found.tsx` は教材の説明どおり存在し、`npm run lint` も通ります。  
デバッグ演習は学習用の一時改変前提なので、現行 `src/` との構造差は特にありません。

### day27: プロジェクト詳細・アーカイブを実装しよう
❌ Blocking issue

アーカイブ API 自体は `src/server/api/routers/project.ts` の `setArchiveStatus` / `archive` / `unarchive` が教材どおりです。  
ただし UI は現行 `src/app/project/page.tsx` でダイアログではなく `ProjectDetailView` を使うインライン詳細ページに変わっており、教材の主軸である `ProjectDetailDialog` 完成形と最終到達点が構造的に一致しません。未経験者が教材どおり進めると「正解コードが違う」状態になります。

### day28: タスク一括操作を実装しよう
✅ OK

`src/app/task/page.tsx` と `src/server/api/routers/task.ts` は、`Set<string>` による選択管理、`indeterminate`、`bulkComplete` / `bulkDelete` / `bulkUpdateStatus` の流れが教材と合っています。  
教材のステップ順でも大きな中間破綻は見当たりません。

### day29: ユーザー詳細・編集ページを作ろう
⚠️ Minor friction

重点確認対象の `src/app/user/[id]/{page.tsx,user-detail-client.tsx,edit/page.tsx,edit/user-edit-client.tsx}` は存在し、route-level 404 と server wrapper + client split も現行実装に入っています。  
ただし教材前半には `useParams()` を使う旧説明が残っている一方、後半では wrapper + `userId` props に切り替わっており、Step 表も `page.tsx` だけを触るように読めるため少し混乱します。

### day30: 完成版を公開！卒業！
❌ Blocking issue

前提ファイルの存在自体は確認できました。`doc/20_deployment.md`、`prisma.config.ts`、`.env.example`、`vercel-build` は現行リポジトリにあります。  
ただし教材の `.env.example` 抜粋は実ファイルとずれています。実際は `${_DOCKER_COMPOSE_HOST_PORT_DB}` を使い、`JWT_SECRET` 文字列も異なります。さらに教材本文に `git add .` が残っており、この検証タスクの運用ルールに反します。実行確認でも `npm run build` は `.env` 未設定のため `DATABASE_URL` / `JWT_SECRET` 欠如で停止しました。

## Aggregate summary
- 4 日分はそのまま追従可能でした: day22, day24, day26, day28
- 3 日分は軽微なズレです: day21, day23, day29
- 3 日分は未経験者を止める可能性が高いです: day25, day27, day30

重点確認ポイントの結果:
- day21 / day23 の `getOverview` は、`src/server/api/routers/report.ts` と `src/app/report/page.tsx` の整合自体は取れています。`projectStats` は `/report` 側でそのまま描画しており、`src/app/dashboard/page.tsx` でも同じ overview を別用途で消費しています。
- day27 の archive spec は `src/server/api/routers/project.ts` と一致していますが、教材の UI ゴールが「詳細ダイアログ」のままで、現行 `src/app/project/page.tsx` のインライン詳細遷移と合っていません。
- day29 は現行実装が server wrapper + route-level 404 + client split に整理されている一方、教材に `useParams()` ベースの旧説明が残っています。
- day30 はファイル参照先は正しいものの、環境変数の抜粋と Git 手順が現行運用に追随していません。

実行確認メモ:
- `npm install`: 成功
- `npm list recharts`: 成功（`recharts@3.2.1`）
- `npm run type-check`: 成功
- `npm run lint`: 成功
- `npm test`: 失敗。test DB の認証エラーで `10` ファイル / `175` テスト失敗
- `npm run build`: 失敗。`.env` / `.env.local` が無い状態では `DATABASE_URL` と `JWT_SECRET` 未設定で停止

## Top 3 priority fixes (if any)
1. day27 の UI 説明を現行 `src/app/project/page.tsx` に合わせる。少なくとも「ダイアログ完成」が最終形ではないことを明示する。
2. day25 のパスワード要件を `src/server/api/routers/user.ts#changePasswordSchema` に合わせて更新する。最小 8 文字だけでは不十分。
3. day30 から `git add .` を外し、`.env.example` 抜粋も実ファイルどおりに直す。あわせて local build には `DATABASE_URL` / `JWT_SECRET` が必要だと明記する。
