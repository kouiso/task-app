# Day スナップショットの検査結果

`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の
手元を組み直して、型検査とビルドが通るかを見た結果である。

- 型検査とビルド: 実行した
- tsc・build とも OK: 0 / 1 日
- ツリーの置き場: `dist/day-snapshots/dayNN/`
- tsc の NG は教材の欠陥とは限らない。教材がその日の `完成版` として
  変更箇所の抜粋だけを出す日があり、道具はそれを丸ごとの書き直しとして扱う。
  1件ずつ現物と突き合わせてから判断すること。下の切り分けの表を見ること。

| Day | ツリー構築 | tsc | build | 最初のエラー3行 |
| --- | --- | --- | --- | --- |
| day28 | OK（116 ファイル） | NG | NG | src/app/task/page.tsx(332,9): error TS2552: Cannot find name 'bulkDeleteDialogOpen'. Did you mean 'deleteDialogOpen'?<br>src/app/task/page.tsx(333,17): error TS2552: Cannot find name 'setBulkDeleteDialogOpen'. Did you mean 'setDeleteDialogOpen'?<br>src/app/task/page.tsx(336,5): error TS2304: Cannot find name 'bulkDeleteMutation'. |

## NG の日の切り分け

「教材の欠陥」は現物を読んで確かめたものだけ。読んでいない日は「判定不能（未調査）」。

| Day | 分類 | 根拠 |
| --- | --- | --- |
| day28 | ツールの限界 | day18 に加え、src/server/api/routers/task.ts も day15 止まり（94ブロック中22）で PermissionKey が無い |
