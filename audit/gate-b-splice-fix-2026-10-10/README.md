# Gate B splice 修正 — 30日写経 実走証跡 (2026-10-10)

`scripts/loop-runner/apply_day.py` の修正後、`material/30days-curriculum/` 全30日を
基線コミット `d6d810f` 上で機械適用した走行証跡。

## 実行方法

サンドボックス `/Users/devin/gate-b-run/app`（task-app の別 clone、基線 `d6d810f`）に対し、
day01〜day30 を順に `apply_day.py <md> app --tag dayNN --ledger ledger.jsonl` で適用し、
各日終了ごとに git commit して逐次 baseline を再現した。

## 結果サマリ

- 30日分すべて end-to-end で完走（exit=0、途中停止なし）し、reject 0 件。
  全断片が「適用成功」。
- day16（「taskRouter の前に追加」型）は task.ts / page.tsx とも全断片適用成功。
  宣言の先頭行アンカーにより宣言内部への誤挿入と use-before-declare 連鎖は解消。
- day28 の `src/app/task/page.tsx` は、教材側の完成版フェンスを完成版オラクルに
  沿った単一記述（全ファイル listing）へ統合し、WRITE 適用でオラクルと一致。
  二重記述（指示フェンスと完成版フェンスが同一 JSX 領域を再度記述する教材側の
  実欠陥）は解消済み。個別ブロックの `完成版:` マーカーは外し、
  ファイル全体の listing だけを完成版の権威とした（スナップショット照合の
  二重計上防止）。
- `.env.example` はクリーンな baseline（`git clean -fdxq` 後）で空行配置差異なく
  適用成功（以前の差分はサンドボックスの未追跡ファイル混入による測定汚染だった）。

## ファイル

- `ledger.jsonl` — 全日の適用レコード（日付・ファイル・結果・ギャップ）
- `day16.log`, `day28.log`, `day29.log`, `day30.log` — 該当日の apply_day 出力
