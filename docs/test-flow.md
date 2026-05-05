# task-app テストフロー棚卸し 2026-05-05

## 目的

task-app は「売れる30日教材」。完成判定はスポットチェックではなく、販売ZIP、clean展開scaffold、写経対象Day、repo本体品質、実ブラウザE2Eが同じ成果物を検証している状態で固定する。

## 30日教材の完成ゲート

- 販売ZIP `task-app-curriculum-v1.0.zip` を生成できる。
- 生成した販売ZIPを clean temp に展開し、`bash scripts/scaffold-from-scratch.sh` が完走する。
- ZIP展開後の生成アプリで `npm run lint`、型検査、`npm run build`、`npm test` 相当が通る。現状は型検査script未定義と server root 未同梱で未達。
- repo本体で `npm run lint`、`npm run type-check`、`npm run build`、`npm test`、`npm run test:e2e -- --project=chromium` が通る。
- rewrite対象 Day 07/08/12/18/19/24/26/28 が `bash script/check_quality.sh <day.md>` を全通過する。
- 学習者E2Eとして signup/login/logout、project CRUD/member/role、task CRUD/status/timer/bulk、comments CRUD/permission、search/filter URL sync、dashboard/report、profile/user/admin を実ブラウザで検証する。
- README、Day 01、Day 30、ZIP内 package/scaffold のバージョン・コマンド・成果物パスが一致する。
- 既知リスクを解消または明示分類する: Prisma client/version mismatch、npm audit moderate、broken symlink warning、production deployment caveat、検索/権限/一括操作/ユーザー編集の実装バグ。

## 現在通るコマンド / 落ちるコマンド

### repo本体

- PASS: `npm run lint`。ただし broken symbolic link warning 40件あり。ログ: `/tmp/taskapp-testflow-logs/npm-lint.log`
- PASS: `npm run type-check`。ログ: `/tmp/taskapp-testflow-logs/npm-type-check.log`
- PASS: `npm run build`。ログ: `/tmp/taskapp-testflow-logs/npm-build.log`
- PASS: `docker compose up -d db test-db && npx prisma db push && npm test`。203 tests / 14 files pass。ログ: `/tmp/taskapp-testflow-logs/npm-test-final.log`
- PASS: `npx prisma db push && npm run db:seed && npm run test:e2e -- --project=chromium`。50 Playwright tests pass。ログ: `/tmp/taskapp-testflow-logs/npm-test-e2e.log`
- NOTE: DB未起動またはZIP scaffoldと並走してDBコンテナが再作成されると `localhost:5436` unreachable で `npm test` は落ちる。ログ: `/tmp/taskapp-testflow-logs/npm-test.log`, `/tmp/taskapp-testflow-logs/npm-test-after-db.log`

### ZIP展開後

- PASS: `bash scripts/build-zip.sh`。出力: `/Users/kouiso/ghq/kouiso/task-app/task-app-curriculum-v1.0.zip`、12M。ログ: `/tmp/taskapp-testflow-logs/build-zip.log`
- PASS: clean unzip to `/tmp/taskapp-zip-verify/task-app`。ツリー: `/tmp/taskapp-testflow-logs/zip-tree.log`
- PASS: `(cd /tmp/taskapp-zip-verify/task-app && bash scripts/scaffold-from-scratch.sh)`。ログ: `/tmp/taskapp-testflow-logs/scaffold-from-zip.log`
- PASS: ZIP展開後 `npm run lint`。ログ: `/tmp/taskapp-testflow-logs/zip-npm-lint.log`
- FAIL: ZIP展開後 `npm run type-check`。理由: scaffold後 package に `type-check` script がない。ログ: `/tmp/taskapp-testflow-logs/zip-npm-type-check.log`
- FAIL: ZIP展開後 `npm run build`。理由: `src/trpc/react.tsx` が `@/server/api/root` を import するが、ZIP/scaffoldに `src/server/api/root` 相当が入っていない。ログ: `/tmp/taskapp-testflow-logs/zip-npm-build.log`
- FAIL: ZIP展開後 `npm test`。理由: test files が同梱されていないため Vitest が exit 1。ログ: `/tmp/taskapp-testflow-logs/zip-npm-test.log`

## ZIP/scaffold実行ログ要約とパス

- ZIP build: `/tmp/taskapp-testflow-logs/build-zip.log`
- ZIP output: `/Users/kouiso/ghq/kouiso/task-app/task-app-curriculum-v1.0.zip`
- clean extract dir: `/tmp/taskapp-zip-verify/task-app`
- scaffold log: `/tmp/taskapp-testflow-logs/scaffold-from-zip.log`
- scaffold結果: create-next-app、dependencies install、Biome設定、UI/lib/constants/tRPC/app base/prisma/docker/seed 配置、Docker DB起動、Prisma db push、seedまで完走。
- scaffold警告: npm audit moderate 2件。Prisma update notice 6.19.3 -> 7.8.0。
- product blocker: PR #89 の目的に反して、販売ZIPのscaffold生成物は build 不能。`scripts/build-zip.sh` が `_server-base` / `_app-api-trpc` / auth router 等を同梱していない、または `scripts/scaffold-from-scratch.sh` がそれらを配置していない。

## Rewrite 対象 Day ごとの優先度

- Day 07: P0完了相当。`check_quality.sh` PASS。ただし filepath warning 2件は後続整備対象。
- Day 08: P0。視覚化FAIL、50/41/93行の長大コードブロック。sidebar/app-layout を scaffold-first に分割。
- Day 12: P0。56/64行の長大コードブロック、Step 8 filepathなし。member add の権限・既存コンポーネント前提を明確化。
- Day 18: P0。74/87行の長大コードブロック、Step 8 filepathなし。comment投稿の最小差分化が必要。
- Day 19: P0。61/50行の長大コードブロック、Step 7 filepathなし。comment編集/削除と権限テストを分割。
- Day 24: P1。56/51行の長大コードブロックのみ。admin user list の表示・権限制御を短い写経単位へ。
- Day 26: P1。50/56行の長大コードブロックのみ。error.tsx を scaffold前提または小コンポーネント化。
- Day 28: P0。49/45行の長大コードブロック。既知バグ「VIEWER bulk mutation」「hidden filtered tasks selected」と直結するため、教材rewriteと実装/E2Eを同時にPR化。

## 実ブラウザE2Eで必要な学習者フロー

現行Playwrightは `auth.spec.ts`, `project.spec.ts`, `task.spec.ts`, `screenshots.spec.ts` の50件が通る。ただし完成ゲートとしては弱いテストが多く、条件付き操作やスクリーンショット取得が中心。

追加すべき必須フロー:

- Auth: register -> login -> protected redirect -> logout -> invalid login error。
- Project: create -> detail -> edit -> add member -> role permission check -> archive/delete。
- Task: create -> edit -> status transition -> timer start/stop -> assignee/priority/due date -> delete。
- Bulk: visible tasks only select -> hidden filtered tasks deselect -> OWNER/ADMIN allowed -> VIEWER denied。
- Comments: add -> edit own -> delete own -> role denied cases。
- Search/filter: keyword/status/assignee/due/project filters、URL sync clear omitted params、search result edit link opens edit mode。
- Reports/dashboard: seeded counts/charts/weekly report visible and consistent。
- User/admin: admin list/detail/edit、non-admin denied、invalid role/isActive submission rejected、permission error does not spin forever。
- Profile: edit name/password and validation。

## 次にPR化する具体作業

1. P0 PR: sales ZIP scaffold build gate修正。`scripts/build-zip.sh` と `scripts/scaffold-from-scratch.sh` に server root/API route/auth router/helpers など buildに必要な scaffold support を戻し、ZIP展開後に `npm run build` が通るようにする。あわせて scaffold package に `type-check` script を追加する。
2. P0 PR: Day 08/12/18/19/28 rewrite。Day 07 と同じ scaffold-first 形式に揃え、`check_quality.sh` を対象全DayでPASSにする。
3. P0 PR: Playwright学習者E2E拡張。現行の薄い/条件付きテストを、CRUD・権限・URL sync・bulk選択の失敗検出テストへ置き換える。
4. P1 PR: ZIPの検証スクリプト追加。`bash scripts/verify-sales-zip.sh` のように build-zip -> clean unzip -> scaffold -> lint -> type/build/test を一発実行し、CIと販売物が同じartifactを検証する。
5. P1 PR: broken symlink warning と npm audit moderate の分類または解消。

## 作業メモ

- 現worktreeは開始時点から多数の未コミット差分あり。今回のPlaywright実行で `material/30days-curriculum/screenshots/*.png` も更新された。
- 他セッションの変更を戻さないため、repo内に新規文書は追加しなかった。
- PR候補を作るなら clean worktree で開始する。

## 次の1コマンド

```bash
git worktree add /tmp/task-app-zip-gate-pr HEAD && cd /tmp/task-app-zip-gate-pr && git switch -c codex/zip-scaffold-build-gate
```
