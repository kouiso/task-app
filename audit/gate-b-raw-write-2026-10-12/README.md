# Gate B raw-write 修正 — 30日写経 実走証跡 (2026-10-12)

`scripts/loop-runner/apply_day.py` の #630 レビュー修正（生行書き戻し・import終端検出・
書込側長さ last_end）後、material/30days-curriculum/ 全30日を学習者 scaffold 基線へ機械適用した証跡。

## 実行方法

- 基線: `/tmp/gateb-app` — `scripts/scaffold-from-scratch.sh` と同じ手順で再構築
  （`create-next-app@15.5.24` + リポジトリ `scripts/_*` 配布物の配置。
  前回基線 `d6d810f` は旧 sandbox のローカルコミットで消失したため、
  現行リポジトリの配布物から再生成。npm install・DB 起動は適用対象外のため省略）。
- 実行: `python3.12 apply_day.py <md> /tmp/gateb-app --tag dayNN --ledger ledger.jsonl`、
  各日 `git commit`。所要時間約3秒。

## 結果サマリ（gateb-summary.log）

- 27/30日が exit=0 完走。部分適用（exit=3）は day01 / day20 / day21 の3日のみ。
- **同一基線での旧版比較**（origin/main の apply_day.py を同手順で実行）:
  旧版は 24/30 日グリーン、day16/18/20/21/25/28 の6日で部分適用（計14ブロック未適用）。
  新版はそのうち task/page.tsx（day16/18/20/28）・app-layout.tsx（day25）の
  splice を通すため、**すべての日で旧版以上の適用数**。

## 残り gap の分類（真因はコードではなく教材記述）

1. **day01 `.env.example`** — フェンス内容（環境変数7行）が全てファイル内に既存。
   旧版は「listing-run」でファイルを7行へ上書き（コメント類を破壊）。
   新版は断片が既存かつ非連続のため splice を拒否して baseline を維持する
   — 学習者が読み比べるだけの「確認用抜粋」なので no-op が正しい挙動。
2. **day20/21 `src/component/layout/app-layout.tsx`** —
   「検索メニュー項目」の追加断片。教材は `{ text: '検索', ... }` を
   **複数行オブジェクト**で示すが、完成版 oracle では**同一行に畳まれた1行**。
   断片は cur にも oracle にも文字列として存在せず、アンカーを一意に決められない
   （`fragment-not-in-baseline-or-anchor-ambiguous`）。
   従来 ledger の「diff-fragments = material gap 候補」と同じクラス。
   旧版も同一内容で失敗しており、新規バグではない。

## ファイル

- `gateb-summary.log` — 各日の exit code と変更ファイル数
- `ledger.jsonl` — apply_day が出力した適用/gap の機械可読ログ
- `apply-dayNN.log` — 各日の適用詳細
- `old-baseline-summary.log` — 同一基線・旧版 apply_day による対照実行の exit code 一覧
