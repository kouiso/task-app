# Day スナップショットの検査結果

`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の
手元を組み直して、型検査とビルドが通るかを見た結果である。

- 出どころ: `python3 scripts/curriculum-qa/build_day_snapshots.py --all --verify`（2026-09-21 14:37 UTC / 30 日ぶん）
- 対象範囲: 全件実行
- 検証: 要求した（各段階の実行結果は表を参照）
- Prisma生成・tsc・build がすべて OK: 30 / 30 日
- ツリーの置き場: `dist/day-snapshots/dayNN/`
- 上書きしない実行記録: `dist/day-snapshots/result/20260921T143703.479054Z-5fc31341ae63.json`
- これは教材から静的に復元したスナップショットの検査であり、
  初心者が教材だけで完走できたことの証明ではない。
- tsc の NG は教材の欠陥とは限らない。教材がその日の `完成版` として
  変更箇所の抜粋だけを出す日があり、道具はそれを丸ごとの書き直しとして扱う。
  1件ずつ現物と突き合わせてから判断すること。下の切り分けの表を見ること。

| Day | ツリー構築 | Prisma生成 | tsc | build | 最初のエラー3行 |
| --- | --- | --- | --- | --- | --- |
| day01 | OK（77 ファイル） | OK | OK | OK | - |
| day02 | OK（77 ファイル） | OK | OK | OK | - |
| day03 | OK（77 ファイル） | OK | OK | OK | - |
| day04 | OK（77 ファイル） | OK | OK | OK | - |
| day05 | OK（79 ファイル） | OK | OK | OK | - |
| day06 | OK（80 ファイル） | OK | OK | OK | - |
| day07 | OK（87 ファイル） | OK | OK | OK | - |
| day08 | OK（90 ファイル） | OK | OK | OK | - |
| day09 | OK（92 ファイル） | OK | OK | OK | - |
| day10 | OK（93 ファイル） | OK | OK | OK | - |
| day11 | OK（94 ファイル） | OK | OK | OK | - |
| day12 | OK（94 ファイル） | OK | OK | OK | - |
| day13 | OK（96 ファイル） | OK | OK | OK | - |
| day14 | OK（98 ファイル） | OK | OK | OK | - |
| day15 | OK（98 ファイル） | OK | OK | OK | - |
| day16 | OK（100 ファイル） | OK | OK | OK | - |
| day17 | OK（101 ファイル） | OK | OK | OK | - |
| day18 | OK（103 ファイル） | OK | OK | OK | - |
| day19 | OK（103 ファイル） | OK | OK | OK | - |
| day20 | OK（105 ファイル） | OK | OK | OK | - |
| day21 | OK（107 ファイル） | OK | OK | OK | - |
| day22 | OK（107 ファイル） | OK | OK | OK | - |
| day23 | OK（108 ファイル） | OK | OK | OK | - |
| day24 | OK（110 ファイル） | OK | OK | OK | - |
| day25 | OK（113 ファイル） | OK | OK | OK | - |
| day26 | OK（120 ファイル） | OK | OK | OK | - |
| day27 | OK（121 ファイル） | OK | OK | OK | - |
| day28 | OK（121 ファイル） | OK | OK | OK | - |
| day29 | OK（125 ファイル） | OK | OK | OK | - |
| day30 | OK（125 ファイル） | OK | OK | OK | - |
