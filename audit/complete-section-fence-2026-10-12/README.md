# 完成コード節の二重記述（#631）— 是正と検証の証跡 (2026-10-12)

`## 完成コード全体` 節で同じ書き込み先を複数のフェンスが別の粒度で記述していた問題の是正と、
その検証結果。検証はすべてローカル（Node 22.22.2、Python 3）で行った。GitHub Actions は
課金ブロックで動いていないため CI は未実行である。

## 何をしたか

1. PR #637 のコミット `82c9f83` を取り込んだ。抜粋から `完成版:` の目印を外し、
   各ファイルの末尾に全ファイル listing を1件置く構成。
2. `82c9f83` の listing は中身を検証していなかった。esbuild で 59 件中 7 件が構文解析できず、
   main の日次スナップショットと 27 件が食い違い、`build_day_snapshots.py --all --verify` は
   day05〜day14 で tsc が通らなかった（記録: `snapshot-before.log`）。
   27 件を main の日次スナップショットから作り直した（`345603d`）。
3. 完成コード節の案内文を「各ファイルの最後のブロックが全文」という構成に合わせて直した（`b7e58a4`）。
4. 読み取り専用の別エージェントによる敵対的レビューで、day25 `app-layout.tsx` の listing が
   前日の版のまま（プロフィールへの入口が無い）、day20 `task/page.tsx` の listing が
   編集リンクの処理を欠く、という2件の欠陥が見つかった。スナップショットの組み立ては
   抜粋しか出さない日の変更を落とす（`latest_version()`）ので、2 の作り直しでその日の変更が
   抜けていた。前日の listing に Step の変更を足して作り直し、day16・20・24・25 の listing に
   残っていた抜粋の見出しと字下げの崩れも直した（`78021e5`）。
5. 再発防止の検査 `scripts/curriculum-qa/check_complete_section_fences.py` を追加し、
   `check_quality.sh` と `material-gate.yml` に組み込んだ。listing が1件だけで最後にあること、
   `完成版:` 付きの抜粋が並ばないこと、listing 単体がファイル全体であること、listing の前の
   断片の各行が listing に入っていることを見る。4 の2件はこの検査で検出できる。
6. PR 上の自動レビュー（Codex・CodeRabbit）の指摘を受けて検査を締めた。断片と listing の照合を
   空白を潰した部分文字列から字句の並びへ変え（`= 1` が `= 10` に一致しない、文字列の中の空白を
   潰さない）、断片の import が取り込む名前と取り込み元を listing の import と照合し、
   `## 完成コード全体` が2つある場合も全部の節を見るようにした。目印は `build_day_snapshots.py` が
   読む `完成版` だけを認め、`完成形:` は誤りとして落とす。完成コード節に断片が1つだけ置かれた形も
   完全なファイルでなければ落とす。`LISTING_DIVERGES` には listing に無い断片の行数（day28 は 10 行）を
   持たせ、数が変わったら落とす。教材側の変更は無い。

## 検証結果

| 検査 | main `5a4ef12` | この PR |
| --- | --- | --- |
| `check_complete_section_fences.py material/30days-curriculum/` | 9 件検出（6 の後） | 検出 0 |
| 同上を 4 の修正前（`3ca1c9d`）に実行 | - | day20 task/page・day25 app-layout を検出 |
| `test_check_complete_section_fences.py` | - | 32/32 パス（6 の後） |
| 検査本体の変異 14 種（字句の区切りを外す・import 照合を外す・最初の節だけ見る・行数照合を外すなど） | - | 14 種ともテストが失敗して検出 |
| `check_quality.sh material/30days-curriculum/` | ALL CHECKS PASS | ALL CHECKS PASS |
| `check_complete_code.py material/30days-curriculum/` | - | 一致 23 / 未登録の差分 0 |
| loop-runner unittest（apply_day_test / verify_day_test） | 58 OK | 58 OK |
| Gate B 30日再生（apply_day、create-next-app 15.5.24 + scaffold） | day01/20/21 が exit 3 | day01 だけ exit 3（`.env.example`、既知） |
| Gate B 再生後の day25・day30 `app-layout.tsx` を esbuild で解析 | 解析不能 | 解析可、`/profile` の入口あり |
| `build_day_snapshots.py --all --verify`（`3ca1c9d`） | - | day01〜day27 OK、day28〜30 NG |
| `build_day_snapshots.py --day N --verify`（`78021e5`、N=16,20,24,25,26,27） | - | すべて tsc・build OK |
| textlint（案内文を直した 21 日分） | - | exit 0 |
| `check-naming-convention.sh` | - | exit 0 |

`--all --verify` の途中で day08・11・14・22・23 の build が `next/font` の
`Cannot read properties of null (reading '1')` で落ちた回があった。Google Fonts の取得失敗で、
同じ listing のまま再実行すると通った（`snapshot-after.log`）。

## 範囲外で見つけたもの

- day28〜30 のスナップショットは main でも tsc が通らない。day28 `task/page.tsx` の listing は
  PR #622 で `src/` の実装を載せたもので、Day 28 時点に無い `@/lib/task-filter-query` を
  import し、断片とも実装が違う。新しい検査では `LISTING_DIVERGES` に理由つきで登録した。
- Gate B の再生では、`root.ts` が day07 以降 main でも解析できない形に崩れる。
  apply_day の終了コードは 0 なので、終了コードだけでは検出できない。
- `is_complete_file` は構文の正しさまでは見ない近似である。構文は `--verify` の tsc と
  Gate B の esbuild 解析で確かめており、この検査には TypeScript のパーサーを入れていない。
- day10 `project/page.tsx` の listing が `projectsError` を扱わない点と、day29 の自分のプロフィールで
  「ユーザー一覧に戻る」が管理者専用の `/user` へ向く点は、main の日次スナップショットと `src/` でも同じで、
  この PR の変更で生じたものではない。

## ファイル

- `snapshot-before.log` — `82c9f83` を main に重ねた状態の `--all --verify`（day05〜14 で tsc NG）
- `snapshot-after.log` — `3ca1c9d` の `--all --verify` と `78021e5` の個別日の再検証
- `gate-b-exit.txt` — `78021e5` の Gate B 再生の日ごとの終了コード
