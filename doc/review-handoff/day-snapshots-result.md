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
| day28 | OK（117 ファイル） | NG | NG | src/app/my-task/page.tsx(28,17): error TS2724: '"@/lib/constant/status"' has no exported member named 'TASK_STATUS'. Did you mean 'isTaskStatus'?<br>src/app/my-task/page.tsx(29,3): error TS2305: Module '"@/lib/constant/status"' has no exported member 'TASK_STATUS_LABELS'.<br>src/app/my-task/page.tsx(29,28): error TS2724: '"@/lib/constant/status"' has no exported member named 'TaskStatus'. Did you mean 'isTaskStatus'? |

## NG の日の切り分け

「教材の欠陥」は現物を読んで確かめたものだけ。読んでいない日は「判定不能（未調査）」。

| Day | 分類 | 根拠 |
| --- | --- | --- |
| day28 | ツールの限界 | src/app/task/page.tsx が 160 ブロック中 19（259/2044 行）しか残らず、div の閉じタグが捨てたブロックの中にある |
