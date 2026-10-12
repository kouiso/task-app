# Gate B complete-copy-unit 統合 — 30日写経 実走証跡 (2026-10-12)

issue #631 対応として、`material/30days-curriculum/` の `## 完成コード全体` 節で
同一 filepath を複数フェンスで記述していた残存 20 日分
（day05/06/07/08/09/10/13–25/29）を day28 と同じ complete-copy-unit パターンへ統合した後の
走行証跡。

## 変更内容

- 対象ファイル個別ブロックの `完成版:` / `完成形:` ラベル接頭辞を除去
  （ラベル本文は残す。計 606 箇所）。
- 各対象ファイルのフェンス群末尾に
  `<!-- code-block-length-exception: complete-copy-unit -->` + `// filepath:` +
  `// 完成版: ファイル全体` の全ファイル listing を 56 件追加。
  listing の中身は、その日の適用結果として生成されるファイルの本文
  （apply_day の oracle 相当）。day24 `src/app/user/page.tsx` と
  day29 `src/app/user/[id]/` 配下 4 ファイルは `src/` 現物を使用
  （いずれも最終記述日であり `check_complete_code` の照合対象）。

## 実行方法

サンドボックス（`scripts/scaffold-from-scratch.sh` 相当のファイルツリー＋
`git init` した基線コミット）に対し、day01〜day30 を順に
`python3 apply_day.py <md> app --tag dayNN --ledger ledger.jsonl` で適用し、
各日終了ごとに git commit して逐次 baseline を再現した。

## 結果サマリ

- 30日分すべて end-to-end で完走（exit=0、途中停止なし）。対象日の splice reject 0 件。
- `check_complete_code.py` もパス（一致 22 / 例外登録 17 / 対象外 10 /
  棚卸し済みドリフト 2 / 未登録の差分 0）。
- day01 の `.env.example` 1 件のみ「splice rejected, baseline kept」が出るが、
  これはサンドボックス側 scaffold 生成物との差異によるもので、教材の変更とは無関係
  （修正前の走行でも同じ 1 件が出ていた）。

## ファイル

- `ledger.jsonl` — 全日の適用レコード（日付・ファイル・結果・ギャップ）
