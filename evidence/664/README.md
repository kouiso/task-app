# #664 証跡 — Gate B（day01→30）と day14/15/16 PDF 再生成

`main` 5996c647 に対して 2026-11-02 に実施。

## Gate B: `python3 scripts/curriculum-qa/build_day_snapshots.py --all --verify`

PostgreSQL 16 を `localhost:25532`（`.env.example` と同じ user/password/taskapp）で起動した
macOS 環境で実行。教材から復元した全日ツリーの Prisma生成・tsc・next build を実走。

### 最終結果（run6 / 5996c647、run5 / e5f51f7c も全グリーン）

**30/30 日すべて ツリー・Prisma生成・tsc・build OK。NG・SKIP なし。**
連続 2 回の全量実行で同じ結果。最新の取り込み直前に入った PR #727
（day09/10/15/20/21 の重複コード掲載削減）を含む main でも全件グリーン。

- `gateb-run6-20261102T0212-all-green.log` — 5996c647 での全日グリーンのコンソールログ
- `run-records/20261102T021244.229403Z-a40e3f5a44be.json` — 不変の実行記録
- `day-snapshots-result-20261102T0212.md` — 結果 doc（全件 OK）

### 途中で観測された NG の切り分け（参考記録）

パッチ未適用の node_modules で回した旧コミット（0105f146）の実行では、
実行ごとに 1〜3 日が次のエラーで落ちた:

```
An error occurred in `next/font`.
TypeError: Cannot read properties of null (reading '1')
```

- 失敗日は実行ごとに変わる（day01/04/18/23/25/26/28）。同じ日が連続して落ちたことはない。
- 落ちた全日を個別に再実行して build OK を確認（`--day 25` / `--day 28` の実行記録、
  `day04-rebuild-after-flake.log`）。
- 原因は `next/font/google` がビルド時に実際に Google Fonts へ fetch する処理の脆弱性で、
  拡張子のないフォント URL が返ると `loader.js:122` の `exec(...)[1]` が null になる。
  環境依存の一時的なネットワーク応答の揺らぎで、教材・src の欠陥ではない。
  （応答の健全性は node https / fetch / curl で 90/90・10/10 成功を確認済み）
- 同一の根本修正が **PR #728**（`patches/next+15.5.24.patch` で
  フォント形式を取得データのマジックバイトから判定）として main に入ったため、
  パッチ適用済みでは発生しない。run5・run6 の全日グリーンがその実測証明。

### 旧コミットでの実行記録（切り分け用に残す）

- `gateb-run1..5-*.log` — 各全量実行のコンソールログ
- `run-records/` — run1〜6 の全量実行記録と `--day` 個別検証の実行記録

## 教材 PDF の再生成と目視確認

`PDF_BOOK_LINK_MAP=scripts/pdf-book/pdf-link-map.json python3 scripts/pdf-book/build_pdf_book.py <md>`
で day14/15/16 を再生成し、#685/#686 の修正が PDF に反映されていることを目視確認した。
（PDF 本体は配布物のため dist/ 止まり。以下は修正コードが確認できるページの抜粋）

- day15 は PR #727 の対象章のため、5996c647 で再生成し直して確認
  （118p。`isReopening` 条件付きロック・`assertTaskAssigneeBelongsToProject`・
  再オープン分岐が残っていることを確認）
- day14/day16 は 0105f146 時点の生成物。0105f146..5996c647 で両章の教材本文に
  差分が無いため、5996c647 の内容と一致している。

- `after-0105f146-day14-p019/p021/p022` — create のトランザクション内ロック・担当者検査
- `after-0105f146-day14-p096` — 完成版 `lockTaskProjects`（FOR UPDATE 直列化）
- `after-0105f146-day14-p106` — 完成版 `assertTaskAssigneeBelongsToProject`
- `after-5996c647-day15-p018/p019/p021` — 0-6/0-7 `isReopening` 条件付きロックと担当者再確認
- `after-5996c647-day15-p082/p083` — update の担当者条件と再オープン分岐
- `after-0105f146-day16-p056/p065/p068/p069` — ステータス変更時の同パターン
