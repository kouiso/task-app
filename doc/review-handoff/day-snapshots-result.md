# Day スナップショットの検査結果

`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の
手元を組み直して、型検査とビルドが通るかを見た結果である。

- 出どころ: `python3 scripts/curriculum-qa/build_day_snapshots.py --all --verify`（2026-09-12 21:13 UTC / 30 日ぶん）
- 型検査とビルド: 実行した
- tsc・build とも OK: 30 / 30 日
- ツリーの置き場: `dist/day-snapshots/dayNN/`
- tsc の NG は教材の欠陥とは限らない。教材がその日の `完成版` として
  変更箇所の抜粋だけを出す日があり、道具はそれを丸ごとの書き直しとして扱う。
  1件ずつ現物と突き合わせてから判断すること。下の切り分けの表を見ること。

| Day | ツリー構築 | tsc | build | 最初のエラー3行 |
| --- | --- | --- | --- | --- |
| day01 | OK（76 ファイル） | OK | OK | - |
| day02 | OK（76 ファイル） | OK | OK | - |
| day03 | OK（76 ファイル） | OK | OK | - |
| day04 | OK（76 ファイル） | OK | OK | - |
| day05 | OK（78 ファイル） | OK | OK | - |
| day06 | OK（79 ファイル） | OK | OK | - |
| day07 | OK（86 ファイル） | OK | OK | - |
| day08 | OK（89 ファイル） | OK | OK | - |
| day09 | OK（91 ファイル） | OK | OK | - |
| day10 | OK（92 ファイル） | OK | OK | - |
| day11 | OK（92 ファイル） | OK | OK | - |
| day12 | OK（92 ファイル） | OK | OK | - |
| day13 | OK（94 ファイル） | OK | OK | - |
| day14 | OK（96 ファイル） | OK | OK | - |
| day15 | OK（96 ファイル） | OK | OK | - |
| day16 | OK（98 ファイル） | OK | OK | - |
| day17 | OK（99 ファイル） | OK | OK | - |
| day18 | OK（101 ファイル） | OK | OK | - |
| day19 | OK（101 ファイル） | OK | OK | - |
| day20 | OK（103 ファイル） | OK | OK | - |
| day21 | OK（105 ファイル） | OK | OK | - |
| day22 | OK（105 ファイル） | OK | OK | - |
| day23 | OK（106 ファイル） | OK | OK | - |
| day24 | OK（108 ファイル） | OK | OK | - |
| day25 | OK（111 ファイル） | OK | OK | - |
| day26 | OK（113 ファイル） | OK | OK | - |
| day27 | OK（114 ファイル） | OK | OK | - |
| day28 | OK（114 ファイル） | OK | OK | - |
| day29 | OK（118 ファイル） | OK | OK | - |
| day30 | OK（118 ファイル） | OK | OK | - |
