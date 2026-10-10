# Gate A 判定記録（棄却3件・根拠・hash）

正本: `devin/source40-input-pack` @ `08d631e8b93e70f3f2d672cf72c2200959f5310f`
対象ファイル hash（変更なし = 棄却後も同一）:

| ファイル | blob sha1 |
|---|---|
| `material/30days-curriculum/day27_プロジェクト詳細・アーカイブを実装しよう.md` | `688977e9f665fafc27ce12555617370fe3351ea7` |
| `material/30days-curriculum/00_カリキュラム目次.md` | `783761afb2777d63aa6f123db94294d505904eb2` |
| `material/30days-curriculum/day30_完成版を公開！.md` | `cc10c1d1c8d8b78ef8172ac7fc28b2ccd7f91c82` |

## 判定1 — day27 ブロック28–32 の `filepath:` 欠落 5件 → **棄却**

**実読根拠**: ブロック28（861行）は `#### Before（改善前のコード）`、ブロック30（904行）は `#### After（プロが書くコード）` の見出し配下。ブロック29/31/32（875/918/933行）は直前の本文に「**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。」と明示済み。

- `.claude/skills/material-writing/SKILL.md` 上 `filepath:` は**完全コピー単位の書き込み先マーカー**（code-block-length-exception と対になる規約）。読み比べ例に付けると「ファイルへ書け」の誤指示になる → 追記は逆害
- `check_code_completeness.py` はこれを ⚠️ 警告（非 FAIL）として出す設計で、非コピー単位の存在を許容している
- **より強い棄却根拠（Claude独立レビュー指摘で補強・訂正）**: `check_anchor.py:49-56` の `find_sample_with_real_path` は、Before/After 節のブロックに実ファイル名の `filepath:` が付いていたらそれ自体を ❌ で落とす仕様。つまり day27 へ filepath を機械追記すると**別ゲートを赤くする** —— 棄却はこの一点だけでも確定する
- **認識範囲の訂正**: 「読み比べ用」マーカーは `check_why.py:35`（`COMPARE_ONLY = 読み比べ用|写経しません|比較用`）と `check_anchor.py` が**既に機械認識する**。認識しないのは `check_code_completeness.py` のみ。初版 EVIDENCE の「checker が読み比べ用を機械認識しない」は誤りで、残存論点は同 checker の⚠️警告が読み比べ例にも出る点だけ（教材ではなく tooling 改善の別枠）

## 判定2 — 目次/ロードマップ/付録4件に `## 理解チェック` なし → **棄却（呼出ミス）**

`check_quiz.py:97-98` は引数がディレクトリの時 `day[0-9][0-9]_*.md` のみを glob 対象にする設計。私がファイル単位で渡したため付録を day 規約で誤検査した。

正規呼び出し実測:

```
$ python3.12 scripts/curriculum-qa/check_quiz.py material/30days-curriculum
✅ 理解チェックの形 OK（30 ファイル / 各 3 問）
```

付録・目次・ロードマップは参照資料でクイズ対象外という設計そのものが正しい。

## 判定3 — day30 奥付「第1版(2026-09-19)」vs ZIP `task-app-curriculum-v1.1.zip` → **棄却（設計通り）**

- `check_version_split.py` 実測: `✅ 完成版の分断なし（30 ファイル）`
- 「第1版」は書籍の版次、v1.1 は配布 ZIP のパッケージ番号。`edu-config.yaml:172` が `task-app-curriculum-v1.1.zip` を学習開始時の正本と宣言、`day01:258,277,282` が同ファイル名を読者へ指示 → 版次と配布物は別軸で整合済み

## 証跡 — procedure_order 「未定義87件」は呼出ミス（教材・checker 両方無罪）

- 定義収集は `check_procedure_order.py:112` が「渡した targets の中」から行う仕様（`collect_definitions`）
- 正規呼び出し: `python3.12 scripts/curriculum-qa/check_procedure_order.py material/30days-curriculum` → `✅ 手続きを使う順番 OK（30 ファイル / 手続き 41 個）`
- 回帰 fixture（`fixture/`）: `day09_test.md`（`getAll: protectedProcedure` 定義）+ `day13_test.md`（呼出）を**同時に**渡す → `✅ ... 2 ファイル / 手続き 1 個`。`day13_test.md` 単独 → `❌ 未定義 1 件`。単体呼出時の誤検出を最小再現できる
- **fixture 位置づけ訂正（Claude指摘）**: 両ファイルは `scripts/`・`.github/`・`package.json` から参照ゼロ（grep 0件）の**手動再現材料**。CI 回帰は `test_check_procedure_order.py` が担う。CI 配線（同テストへ fixture 相当ケース追加）は tooling 変更の為本バンドルでは採用せず表記を訂正する。**early 経路（本物の順序違反）と別日同名再定義の扱いは未検証** —— その2系統は `test_check_procedure_order.py` の責任範囲
- 実在確認: `api.project.getAll` は `src/server/api/routers/project.ts` に定義実在、`check_scaffold_src_sync` 78件すべて教材↔src一致済み

## 新規指摘 — check_anchor の `page-query-state.test.tsx` 8件は正当（誤検出ではない）

Claude 反証で確認: `check_anchor.py material/30days-curriculum` → `❌ 完成版に存在しないファイルを書き込み先にしている 8 件` exit 1（day26:1114,1144,1174,1203,1233,1262,1292,1322、全て `filepath: src/app/profile/page-query-state.test.tsx`）。

**Gate A 判定: checker 側の仕様は正しく、正当な指摘。除外対象化は不採用。**

- `find_missing`（check_anchor.py:78-100）は「写経先が完成版に実在するか」を検査する設計で、day30 の架空 `graduation/page.tsx` 混入を実績として防いでいる。読み比べ節は `find_sample_with_real_path` が別途扱うので、「新規作成先の参照を一律許可」するとこの防御が崩れる → checker の allowlist 化は却下
- **教材側の設計自体は正しい**: day26:1101「`page-query-state.test.tsx`を作り」・:2341「新しく作る」表・:1112「上から順に同じファイルへ貼り付けます」＝読者が新規作成する演習として明示済み
- **不整合は完成版側にある**: 完成版 `src/` は `src/app/my-task/page.test.tsx` 等コロケート test を全件含む設計。テストは商品の一部なのに当該ファイルだけ完成版に無い＝**完成版/scaffold 側の欠落（ドリフト）**。本質修正は「完成版に `page-query-state.test.tsx` を足す」側であり、教材本文の修正ではない（a31e Gate B の Day26 断片再構築→型検査+vitest で断片成立が証明されれば、その成果物を完成版へ足すのが最終解）

## 総評（5軸）

技術正確性◎-（check_anchor 8件 = 完成版側に test 1本欠落の実指摘）/ 初心者再現◎ / 学習価値◎ / 日本語品質◎ / 章間整合◎ — **初版の「機械ゲート30種全緑」は誤り**: check_anchor は exit 1 で 8件を返していた（訂正）。実読で「なぜ」の説明・読み比べ設計・読み方+例えの概念表を確認。残リスク: 機械検査は「初心者30日走破」の代用にならない（実走行は a31e Gate B 側の責任範囲）。
