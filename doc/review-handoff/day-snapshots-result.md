# Day スナップショットの検査結果

`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の
手元を組み直して、型検査とビルドが通るかを見た結果である。

- 出どころ: `python3 scripts/curriculum-qa/build_day_snapshots.py --day 1 --verify`（2026-08-30 12:57 UTC / 1 日ぶん）
- 型検査とビルド: 実行した
- tsc・build とも OK: 1 / 1 日
- ツリーの置き場: `dist/day-snapshots/dayNN/`

> ⚠ この結果は全 30 日の通し走行ではない（1 日ぶん / --verify あり）。
> 通しの実測を上書きした可能性がある。証拠として出す前に
> `--all --verify` を回し直して、この行が消えたことを確かめること。
- tsc の NG は教材の欠陥とは限らない。教材がその日の `完成版` として
  変更箇所の抜粋だけを出す日があり、道具はそれを丸ごとの書き直しとして扱う。
  1件ずつ現物と突き合わせてから判断すること。下の切り分けの表を見ること。

| Day | ツリー構築 | tsc | build | 最初のエラー3行 |
| --- | --- | --- | --- | --- |
| day01 | OK（76 ファイル） | OK | OK | - |
