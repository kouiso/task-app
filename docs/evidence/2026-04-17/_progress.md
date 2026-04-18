# task-app 統合進捗

最終更新: 2026-04-17

## 参照した plan

| plan | 役割 | 現在の扱い |
|---|---|---|
| `~/.claude/plans/moonlit-scribbling-hoare.md` | 4本柱の検証本体 | **主計画** |
| `~/.claude/plans/woolly-painting-storm.md` | 教材更新 Phase B 残タスク | A系の教材整合・スクショ系の補助計画 |
| `plan-2026-03-31-curriculum-completion.md` | 教材完成の終了条件定義 | 教材完了判定の補助根拠 |
| `~/.claude/plans/crystalline-inventing-hedgehog.md` | リリース前の残存リスク修正 | ドキュメント・環境差分の補助計画 |
| `~/.claude/plans/swift-nibbling-hollerith.md` | カリキュラム品質100点計画 | 教材レビュー差分の補助計画 |

## 今回の統合方針

1. `moonlit-scribbling-hoare.md` を最上位とする
2. 他 plan は `moonlit` を進めるための具体タスク集として吸収する
3. 実装・検証・証跡をこのディレクトリに集約する

## 実施済み

### ワークツリーで確認できた既存反映

- `.env.example` に `TEST_DATABASE_URL` を追加済み
- `biome.json` に `docs/evidence/**` 除外を追加済み
- `vitest.config.ts` で `_DOCKER_COMPOSE_HOST_PORT_TEST_DB` / `TEST_DATABASE_URL` を参照する構成に整理済み
- `.gitignore` に `docs/evidence/report.html`, `docs/evidence/report.json`, `docs/evidence/screenshots/` を追加済み
- `material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md` に bash / WSL2 向け補足を追加済み
- `doc/20_deployment.md` は `JWT_SECRET` ベースの説明へ更新済み
- `prisma.config.ts` を追加し、`package.json#prisma` 依存を解消済み

### 今回の追加反映

- `CLAUDE.md` の重複していた `context-mode` ブロックを削除
- `.github/workflows/npm-audit.yml` を `--audit-level=high` に強化
- `.github/workflows/reusable-ci.yml` に test 用 PostgreSQL service / type-check / test を追加
- `day05` `day06` `day12` `day17` の教材を修正し、`console.log` を一時確認用として明示
- `day17` の `toDateString()` 比較の残骸を除去し、`isSameDay` 説明へ統一
- `day20` に `|| undefined` を使う理由を追記
- `docs/evidence/2026-04-17/curriculum-src-alignment-refresh.md` を追加
- `docs/evidence/2026-04-17/nextjs-idioms.md` を追加
- `src/app/page.tsx` を server redirect 化し、`src/app/layout.tsx` から `force-dynamic` を削除
- `edu-creator/.claude/rules` の broken symlink を修正
- `src/lib/session.ts` の JWT 復号失敗ログを簡素化し、payload / error 詳細の露出を抑制
- `src/server/api/trpc.ts` で `protectedProcedure` 実行時に `isActive` を再検証し、無効化ユーザーの継続利用を遮断
- `src/server/api/routers/task.ts` で担当者が対象プロジェクトのメンバーであることを server 側で強制
- `.github/workflows/reusable-ci.yml` の lint 成功扱いバイパスを削除
- `src/lib/session.test.ts` を追加し、session roundtrip / invalid token / cookie 属性 / verifySession を固定
- `src/component/task/task-dialog.tsx` / `src/component/project/project-dialog.tsx` を `defaultValues + reset` 構成へ修正し、新規作成ダイアログが前回入力値を持ち越さないようにした
- `src/component/task/__test/task-dialog.test.tsx` / `src/component/project/__test/project-dialog.test.tsx` を追加し、ダイアログ再オープン時の form reset を固定
- `material/30days-curriculum/day17` `day20` `day21` `day23` `day29` を更新し、date-only 方針・server 集計・server wrapper + route-level 404 の完成形を本文へ反映
- 開発DBに `npx prisma db push` を適用し、`public.users does not exist` による登録失敗を解消
- `next start` の本番相当起動で `scenario1` `scenario2` `scenario3` を再実行し、3本とも `consoleErrors: []` かつ expected 結果で通過

## 検証結果

### ローカル実行

| 項目 | 結果 |
|---|---|
| `npm run type-check` | PASS |
| `npm test` | PASS (`190/190`) |
| `npm test -- --coverage` | PASS (`190/190`) |
| `npm run build` | PASS |
| `npm audit --audit-level=high` | PASS (`0 vulnerabilities`) |
| `npm run lint` | PASS |
| coverage | **25.20%**。計測対象の分母補正後も plan の `80%` 条件は未達 |
| `docs/evidence/scripts/scenario1.mjs` | PASS |
| `docs/evidence/scripts/scenario2.mjs` | PASS |
| `docs/evidence/scripts/scenario3.mjs` | PASS |

## 柱ごとの状態

### Phase B

- B-1: 静的品質
  - 型チェック PASS
  - テスト PASS
  - build PASS
  - lint PASS
  - coverage 80% 条件は未達
- B-2: セキュリティ再監査
  - 初期調査を `security-refresh.md` に記録
  - 無効化ユーザーの継続利用を `protectedProcedure` 側で遮断
  - JWT 復号失敗ログの過剰出力を抑制
  - タスク担当者の project-membership を server 側で強制
- B-9: `npm-audit` CI
  - weekly schedule は既に存在
  - `audit-level=high` へ修正済み
- B-10 / B-11: debt / i18n / TZ
  - 初期分類を `debt-triage.md` に記録
  - `day05` `day06` `day12` `day17` `day20` `day21` `day23` `day29` の修正を実施

### Phase D

- D-1: CI ゲート組込
  - 既存 CI は build/lint 偏重だった
  - type-check / test を workflow に追加
  - lint false green を解消
  - coverage gate は未実装

### Phase A / C

- A-3:
  - `curriculum-src-alignment-refresh.md` を追加
  - mismatch の主戦場が `src` 欠落ではなく教材本文の運用・説明揺れだと整理
  - date-only / report aggregation / route-level 404 に関する主要な説明ズレを追加修正
- C-1/C-2/C-3:
  - `nextjs-idioms.md` を追加
  - App Router 採用済みで、root redirect の server 化まで反映

## 未完了

1. 教材側の残差分: Day 21/23 の再集計説明をさらに完成版 source ベースへ寄せる
2. B-2 の残件: rate limiting / CSP 強化 / Sentry 実送信 / HTTP header 実測
3. A-3 / A-5 / B-3 / B-4 / B-5 / B-6 / B-7 / B-8 / C系 / A-2 の実査
4. coverage 80% を満たすための `app` / 業務 UI テスト拡充

## 次アクション

1. `premortem.md` の上位 5 項目を修正タスクへ落とす
2. `security-refresh.md` を runtime 実測付きに更新する
3. `component/task` / `component/project` / `app` のテストを増やして coverage を引き上げる
4. B-1 静的品質ゲート最終化: サンドボックス内の localhost `EPERM` は偽陽性だった。サンドボックス外では `npm run test -- --coverage` が `190/190 PASS` で成功
5. B-1 最終 verdict: `type-check/lint/test/build` は全成功。ただし coverage は `Statements 32.67% / Branches 64.03% / Functions 35.52% / Lines 32.67%` で、line coverage 80% 未達のためゲート全体は FAIL
