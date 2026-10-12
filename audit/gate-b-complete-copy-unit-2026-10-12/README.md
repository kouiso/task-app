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

## 走行の区別

この文書には2系統の走行が出てくる。数字を読むときはどちらの走行かを確かめること。

| 走行 | 対象コミット | 見たもの | 記録 |
| --- | --- | --- | --- |
| A | PR #637 の `82c9f83` | apply_day の終了コードだけ | この文書の「結果サマリ」、`ledger.jsonl` |
| B | `3ca1c9d`（listing 作り直し後）と `78021e5`（day20・day25 修正後） | 終了コードに加え、listing の esbuild 解析・日次スナップショットとの突き合わせ・tsc | 下の「追記」、`audit/complete-section-fence-2026-10-12/` |

## 結果サマリ（走行 A）

- 30日分すべて end-to-end で完走（exit=0、途中停止なし）。対象日の splice reject 0 件。
- `check_complete_code.py` もパス（一致 22 / 例外登録 17 / 対象外 10 /
  棚卸し済みドリフト 2 / 未登録の差分 0）。
- day01 の `.env.example` 1 件のみ「splice rejected, baseline kept」が出るが、
  これはサンドボックス側 scaffold 生成物との差異によるもので、教材の変更とは無関係
  （修正前の走行でも同じ 1 件が出ていた）。

## ファイル

- `ledger.jsonl` — 全日の適用レコード（日付・ファイル・結果・ギャップ）

## 追記: listing 中身の再生成（同日、走行 B）

上の「30日分すべて完走」は apply_day の終了コードだけを見た結果で、listing の中身が
型検査・ビルドを通るかは確かめていなかった。追加の検査で次が分かったため、listing を作り直した。

- esbuild で 59 件の全ファイル listing を構文解析すると 7 件が解析不能
  （day16 task/page、day20 app-layout と task/page、day21・24・25 app-layout、day29 user.ts）。
- main の `build_day_snapshots.py --day N` が組み立てる日次ファイルと突き合わせると
  59 件中 27 件が食い違う（例: day05 login/page.tsx に `'use client'` と import 9 行が無い）。
- `build_day_snapshots.py --all --verify` は day05 から day14 で
  `Cannot find name 'z'` などにより tsc・build が通らない。

27 件は main の日次スナップショット（その日の `完成版` の並び、またはスナップショットの
ファイル本文）から作り直し、トークン列がスナップショットと一致することを確かめた。
本文の案内（「上から順に貼り付けて置き換える」「今日の分だけを載せる」）は、
各ファイルの最後のブロックが全文であるという今の構成に合わせて書き直した。
検査の再実行結果は `audit/complete-section-fence-2026-10-12/README.md` に置く。
