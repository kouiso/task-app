# 同一日での画像重複検査 — 今は WARNING、撮り直し後に FAIL へ上げる

対象: `scripts/curriculum-qa/check_visualization.py`
退行テスト: `scripts/curriculum-qa/test_check_visualization.py`

## なぜ入れたか

`check_visualization.py` は「スクショ位置3箇所以上」という**下限だけ**を機械で要求していた。
下限だけを見る検査は、同じ画像を3回貼れば満たせる。実測でそうなっていた。

- 画像参照 **のべ125回** に対し、実ファイルは **64枚**
- **17ファイル・20組**で、同じ画像を同じ日に2回以上貼っている
- 最多は `day21` の `report.png` **5回**、次が `day17` の `my-task.png` **4回**

Step 3 の結果として貼った画像が Step 9 の完成形と同じなら、買い手には
「Step ごとに撮っていない」と分かる。検査が品質を下げる方向に効いていた。

## 何を検査するか

同一ファイル内で、同じ画像パスが2回以上参照されていたら検出する。
数える母集団は「スクショ位置」の判定と同じ（`.png` / `.jpg` / パスに `screenshot` を含む）に
揃えてある。「3箇所が別々の画像か」を見る検査なので、母集団がずれると意味が変わるため。

既存の「スクショ位置3箇所以上」はそのまま残している。下限は下限で要る。

## 今は WARNING（既定）

今この検査を FAIL にすると、上の17ファイルが全部落ちて corpus 全体が止まる。
撮り直しは別担当が進行中なので、**既定は警告に留めてある**。

```
$ python3 scripts/curriculum-qa/check_visualization.py material/30days-curriculum/
...
対象 34 件 / FAIL 0 件      ← 既定。重複は ⚠️ で出るが落ちない
```

## FAIL への切り替え方（撮り直しが終わったら）

どちらか片方で切り替わる。

1. **環境変数**（CI / `check_quality.sh` からまとめて有効化する場合）

   ```bash
   CURRICULUM_QA_FAIL_ON_DUPLICATE_IMAGE=1 \
     python3 scripts/curriculum-qa/check_visualization.py material/30days-curriculum/
   ```

2. **CLI フラグ**（手元で一時的に確かめる場合）

   ```bash
   python3 scripts/curriculum-qa/check_visualization.py \
     --fail-on-duplicate-image material/30days-curriculum/
   ```

   現時点でどちらも `対象 34 件 / FAIL 17 件` を返す。残件数の計測にそのまま使える。

3. **恒久的に FAIL へ上げる**とき

   - `check_visualization()` の引数 `fail_on_duplicate_image` の既定値を `True` にする
   - `test_check_visualization.py` の `DUPLICATE_CASES` のうち、フラグ `False` の3ケース
     （「既定では落ちない」系）の期待終了コードを合わせて更新する
   - `default_is_warning()` は既定が WARNING であることを固定しているので、
     この関数も同時に書き換える。書き換え忘れると自己テストが落ちて気づける

## 現在の重複一覧（2026-08-30 実測）

| Day | 画像 | 回数 |
|---|---|---|
| day05 | `login.png` | 3 |
| day07 | `login.png` | 2 |
| day09 | `project-list.png` | 2 |
| day10 | `project-create-dialog.png` | 3 |
| day11 | `project-detail-dialog.png` / `project-delete-confirm.png` | 2 / 2 |
| day12 | `project-detail-tasks.png` | 2 |
| day14 | `task-create-dialog.png` | 3 |
| day17 | `my-task.png` | 4 |
| day19 | `task-comment-edit.png` / `task-detail-dialog.png` | 2 / 2 |
| day20 | `search-results.png` | 2 |
| day21 | `report.png` | 5 |
| day22 | `report.png` | 3 |
| day23 | `report.png` / `report-weekly.png` | 2 / 3 |
| day24 | `user-list.png` | 2 |
| day25 | `profile.png` | 3 |
| day26 | `error-page.png` | 2 |
| day27 | `project-detail-archive-action.png` | 2 |

再計測はこの1行で出る。

```bash
python3 scripts/curriculum-qa/check_visualization.py \
  --fail-on-duplicate-image material/30days-curriculum/ | tail -20
```
