# Gate A 独立レビュー証跡バンドル

- **対象ブランチ/コミット**: `devin/source40-input-pack` @ `08d631e8b93e70f3f2d672cf72c2200959f5310f`
- **レビューア**: Devin 子セッション `devin-9159b88ae136455f8695852b97de14b9`（作者自己評価は未参照の独立採点）
- **修正対象ファイル数**: **0件**（3件すべて根拠付き棄却。material/**・共通組版・checker いずれも無変更）

## バンドル内容

| ファイル | 中身 |
|---|---|
| `EVIDENCE.md` | 棄却3件の判定と根拠・対象ファイル hash・検証コマンドと実測出力 |
| `SECRETS-INVENTORY.md` | Devin secrets 棚卸し（org15+personal8+追加分）の最終構造化表 |
| `fixture/day09_test.md` | 回帰 fixture（`getAll: protectedProcedure` 定義の最小再現） |
| `fixture/day13_test.md` | 回帰 fixture（`api.project.getAll.useQuery` 呼出の最小再現） |

## ⚠️ 実行環境要件（クラウド再現用）

**`scripts/curriculum-qa/check_quality.sh` 系は Python ≥ 3.10 が必須**。
macOS 標準 `python3`（3.9.6）では以下が TypeError で落ちる:

- `check_comprehension.py:167` — `int | None`
- `check_step_time.py:35` — `def day_number(...) -> int | None`
- `check_procedure_order.py:72` — `list[tuple[int, str, int | None]]`
- `check_quiz.py:42` — `list[str] | None`
- `test_sale_package.py:69` — `str | None` / `test_build_zip.py` — `zip(..., strict=True)`（3.10+）

再現手順:

```bash
# 落ちる側（python3.9系）
python3 scripts/curriculum-qa/check_step_time.py material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md
# → TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'

# 通る側（python3.10+。本検証は 3.12）
python3.12 scripts/curriculum-qa/check_step_time.py material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md
# → ✅
```

## 検査スクリプトの正しい呼び出し方（誤検出防止）

`check_quiz.py` / `check_procedure_order.py` 等は**ディレクトリ引数 or 全ファイル同時渡し**で呼ぶこと。
ファイル単位で呼ぶとスコープが壊れる:

- `check_quiz.py` は dir 引数時に `day[0-9][0-9]_*.md` のみ glob 対象化（scripts/curriculum-qa/check_quiz.py:97-98）。付録/目次を単体で渡すと day 用規約で誤検出する
- `check_procedure_order.py` は**渡した targets の中からだけ定義を収集**（同:112）。day13 単体で渡すと day09 で定義済みの `project.getAll` が「未定義」に見える。実測 fixture は `fixture/` を参照

```bash
python3.12 scripts/curriculum-qa/check_quiz.py material/30days-curriculum        # ✅ 30ファイル/各3問
python3.12 scripts/curriculum-qa/check_procedure_order.py material/30days-curriculum  # ✅ 30ファイル/手続き41個
```
