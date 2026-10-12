# #630 レビュー残件の修正 — 検証証跡 (2026-10-12)

PR #635 の head `502566e` に残っていた未対応のレビュー指摘（Codex 3件・CodeRabbit 2件）と、
敵対レビューで見つかった1件への対応の証跡です。対象コミットは `2e9b6b1` と `9ad294b` です。

## 対応内容

| 指摘 | 対応 | 回帰テスト |
|---|---|---|
| Codex P1: `${"a b"}` の内側の文字列が閉じるとテンプレート状態を失う（`_norm_blob`） | テンプレート文脈をスタックで持つ | `test_blob_keeps_template_state_across_interpolated_string` / `test_template_text_change_after_interpolation_is_applied` |
| Codex P1: 先頭行が未変更の置き換えで断片原文の対応がずれ、正規化行が書かれる（`_splice_raw`） | 断片が res 内に連続して書かれた位置で原文グループを対応させる | `test_replace_keeps_fragment_raw_after_unchanged_first_line` |
| Codex P2: `element_region_replace` の一致行マップで `break` が抜け、領域終端がファイル末尾になる | 一致ごとの `break` を戻す | `test_element_region_maps_each_hit_to_one_line` |
| CodeRabbit: 本体だけが一致した修復経路で位置指示コメントを書き込む | 本体行と対応する原文グループだけを書く | `test_core_match_repair_does_not_insert_meta_comment` |
| 敵対レビュー: 置き換え区間で既存行の空行と断片の空行が重なり、テンプレートに改行が増える | 断片区間内では既存側の保留空行を捨てる | `test_replace_does_not_double_blank_lines_inside_fragment` |
| 敵対レビュー: テンプレート内の改行だけの変更を「適用済み」と誤認する | `_norm_blob` がテンプレート内の改行を残す | `test_template_newline_change_is_applied` |

CodeRabbit の「`positional_splice` で全空白除去キーを使わない」は対応しません。
`positional_splice` は完成版と食い違う中間版断片のための最終手段で、キーは挿入位置の手がかりにだけ使います。
書き込む内容は常に断片自身で、「適用済み」の判定には使いません。main でも同じキーで位置を探していました。

## ローカル検証

CI は GitHub Actions の課金ブロックで実行されていません。以下はローカルの実行結果です。

- `cd scripts/loop-runner && python3 -m unittest -v apply_day_test verify_day_test`
  （Python 3.12.3）→ 58件 OK（`unittest.log`）。
  新規・変更テストは修正前の `apply_day.py` では失敗することを確認済みです（`502566e` で5件、`2e9b6b1` で3件）。
- Gate B 30日写経の再実行（同一基線で修正前後を比較）
  - 基線: `create-next-app@15.5.24 --skip-install` に `scripts/scaffold-from-scratch.sh` の配置手順
    （`configure_package_json` から `copy_prisma_files` まで。npm install・DB 起動は省略）を適用したもの。
  - 実行: 各日 `python3 apply_day.py <dayNN md> <app> --oracle <repo> --tag dayNN --ledger ledger.jsonl` の後に `git commit`。
  - 結果: 修正前（`502566e`）と修正後（`9ad294b`）で各日の exit code は同じです（27/30日 exit=0。day01/20/21 は既知の教材起因 gap で exit=3）。
    ledger は ts を除いて完全一致しました（`gateb-before-summary.log` / `gateb-after-summary.log`）。
  - 最終ツリーの差分は `src/component/task/task-dialog.tsx` から教材用コメント2行
    （`// Day 14 で書いた useForm の初期値`、`// 同じファイルの続き。間は省略しています`）が消えた点だけです（`gateb-final-tree-diff.patch`）。
    完成版の同ファイルにこの2行はありません。

## 敵対レビュー

読み取り専用のサブエージェントが `2e9b6b1` をレビューし、上表の blocking 1件を指摘しました。
`9ad294b` で修正後に再レビューして PASS です。指摘は nit 2件で、どちらも対応不要と判断しました。

再レビューでの確認内容:

- `_splice_raw` のファズ 20,000件で `len(new_raw) == len(res)` と `norm(flat) == res` が常に成り立つ。
- `_norm_blob` の出力行数が空行以外の入力行数と一致する（ファズ 50,000件と全 `src/**/*.ts*`）。
- 教材の全1,683断片で `_match_in_oracle` / `_blob_locate` / `_oracle_pos` / `present_norm` の結果が `2e9b6b1` と同一。
- Gate B 再実行で最終ツリー `ed7fff5`、ledger 同一。
