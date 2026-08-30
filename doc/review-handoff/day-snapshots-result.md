# Day スナップショットの検査結果

`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の
手元を組み直して、型検査とビルドが通るかを見た結果である。

- 出どころ: `python3 scripts/curriculum-qa/build_day_snapshots.py --all --verify`（2026-08-30 16:08 UTC / 30 日ぶん）
- 型検査とビルド: 実行した
- tsc・build とも OK: 29 / 30 日
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
| day11 | OK（92 ファイル） | NG | NG | src/component/project/project-detail-view.tsx(29,47): error TS2339: Property 'getById' does not exist on type 'GetInferenceHelpers<"output", { ctx: { headers: H<br>src/component/project/project-detail-view.tsx(144,44): error TS7006: Parameter 'member' implicitly has an 'any' type.<br>src/component/project/project-detail-view.tsx(167,31): error TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to inde |
| day12 | OK（93 ファイル） | OK | OK | - |
| day13 | OK（95 ファイル） | OK | OK | - |
| day14 | OK（97 ファイル） | OK | OK | - |
| day15 | OK（97 ファイル） | OK | OK | - |
| day16 | OK（99 ファイル） | OK | OK | - |
| day17 | OK（100 ファイル） | OK | OK | - |
| day18 | OK（102 ファイル） | OK | OK | - |
| day19 | OK（102 ファイル） | OK | OK | - |
| day20 | OK（104 ファイル） | OK | OK | - |
| day21 | OK（106 ファイル） | OK | OK | - |
| day22 | OK（106 ファイル） | OK | OK | - |
| day23 | OK（107 ファイル） | OK | OK | - |
| day24 | OK（109 ファイル） | OK | OK | - |
| day25 | OK（113 ファイル） | OK | OK | - |
| day26 | OK（115 ファイル） | OK | OK | - |
| day27 | OK（116 ファイル） | OK | OK | - |
| day28 | OK（116 ファイル） | OK | OK | - |
| day29 | OK（120 ファイル） | OK | OK | - |
| day30 | OK（120 ファイル） | OK | OK | - |

## NG の日の切り分け

「教材の欠陥」は現物を読んで確かめたものだけ。読んでいない日は「判定不能（未調査）」。

| Day | 分類 | 根拠 |
| --- | --- | --- |
| day11 | 想定内（教材が本文で断っている） | day11 は 'getById' を書く前に配布物を取り込むため型エラーが5件出る。教材が本文で明示している |
