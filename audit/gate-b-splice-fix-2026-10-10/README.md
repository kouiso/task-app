# Gate B splice 修正 — 30日写経 実走証跡 (2026-10-10)

`scripts/loop-runner/apply_day.py` の修正後、`material/30days-curriculum/` 全30日を
基線コミット `d6d810f` 上で機械適用した走行証跡。

## 実行方法

サンドボックス `/Users/devin/gate-b-run/app`（task-app の別 clone、基線 `d6d810f`）に対し、
day01〜day30 を順に `apply_day.py <md> app --tag dayNN --ledger ledger.jsonl` で適用し、
各日終了ごとに git commit して逐次 baseline を再現した。

## 結果サマリ

- 30日分すべて end-to-end で完走（exit=0、途中停止なし）
- 記録されたギャップは2件のみ:
  - `src/app/task/page.tsx` (day28) — `splice-result-failed-parse; baseline kept`。
    指示フェンスと完成版フェンスが同一 JSX 領域を二重に記述する教材側の重複パターンで、
    機械マージの結果が構造不整合になったため安全側に reject（baseline は壊れない = day28型耐性）。
  - `.env.example` — 空行配置のみの差異で reject（内容に実害なし）。
- day16（「taskRouter の前に追加」型）は task.ts / page.tsx とも全断片適用成功。
  宣言の先頭行アンカーにより宣言内部への誤挿入と use-before-declare 連鎖は解消。
- day28 で reject されたファイルは baseline を保持したまま day29・day30 へ進み、
  連鎖失敗は発生しない。

## ファイル

- `ledger.jsonl` — 全日の適用レコード（日付・ファイル・結果・ギャップ）
- `day16.log`, `day28.log`, `day29.log`, `day30.log` — 該当日の apply_day 出力
