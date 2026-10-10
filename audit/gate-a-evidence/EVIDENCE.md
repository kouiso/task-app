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
- 残存論点は checker が `読み比べ用` マーカーを機械認識しない点のみ → **教材ではなく tooling 改善の別枠提案**（checker 側で `**読み比べ用**` 直後ブロックをスキップする改修を別途提案）

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
- 回帰 fixture（`fixture/`）: `day09_test.md`（`getAll: protectedProcedure` 定義）+ `day13_test.md`（呼出）を**同時に**渡す → `✅ ... 2 ファイル / 手続き 1 個`。`day13_test.md` 単独 → `❌ 未定義 1 件`。単体呼出時の誤検出を再現・封じる
- 実在確認: `api.project.getAll` は `src/server/api/routers/project.ts` に定義実在、`check_scaffold_src_sync` 78件すべて教材↔src一致済み

## 総評（5軸）

技術正確性◎ / 初心者再現◎ / 学習価値◎ / 日本語品質◎ / 章間整合◎ — 機械ゲート30種の全緑に加え、実読で「なぜ」の説明・読み比べ設計・読み方+例えの概念表を確認。残リスク: 機械検査は「初心者30日走破」の代用にならない（実走行は別ゲート）。
