# 30日教材 商品化 — 引き継ぎ

最終更新: 2026-08-31 / ブランチ `claude/30days-material-product-ready-hor18z` / PR **#389**（#388 はマージ済み）

PR #389 は9ラウンド・15件対応済み（Codex 14 / CodeRabbit 9・重複含む）。異議はゼロ。
**マージは局長の明示指示待ち。**

---

## 次のAIが最初に読むもの

1. このファイル（現在地）
2. `/root/.claude/plans/task-app-30-10-000-deep-iverson.md` — 計画の全文。§1 の「不満10類型」が判断の背骨
3. `doc/review-handoff/cover-letter.md` — 局長への添え状。潰した不満の before/after が全部入っとる
4. `doc/post-release-backlog.md` — リリース後へ回した13件

---

## ゴールと判定基準（ここを外したら全部無駄）

**¥10,000 の商品として出荷する。** 局長の要求は2つ。

1. この商品を売りたい
2. **買った人が次の商品も買ってくれる** = 品質の不満が出て見放される状態を防ぐ

局長が置いた線。この一文が優先順位を全部決める。

> 次買ってもらえる観点での品質は落とさない、クソみたいなものは売らない。
> ただ**いつまでも終わらない無限ループでリリースにたどり着けないのはそれはそれで違う**。

だから作業は「リリースブロッカー」と「リリース後」に切る。8類型に効かん作業は
`doc/post-release-backlog.md` へ回す。

**商品の形**: 36冊のバラPDF（`dist/pdf/`）＋ 写経用 scaffold ZIP の2点。
1冊綴じは作らん。ZIP に教材は入れん（2026-08-31 に局長判断で外した）。

---

## 現在地 — 不満10類型の消化状況

| # | 不満 | 状態 | 証拠 |
|---|---|---|---|
| ① | ZIPを開いたら商品外が入っとる | ✅ | 12.1MB/221ファイル → **88,757バイト（86.7KB）/74ファイル**。`material/` 丸ごと0件 |
| ② | Day01 で環境構築に失敗して進めん | ✅ | つまずき節・所要時間・環境図を追加 |
| ③ | **写経したのに動かん** | ✅ | `build_day_snapshots.py --all --verify` で **29/30**。day11 は教材が「ここは赤くなります」と断っとる想定どおり |
| ④ | 誤字・矛盾 | ✅ | 70件＋走査95件の裏取りで29件 |
| ⑤ | 紙面が崩れる | ✅ | `check_pdf_book.py` / `check_page_layout.py` とも **36冊 exit 0** |
| ⑥ | スクショと自分の画面が違う | ✅ | 実画像111枚のうち**101枚**をその日のツリーで撮影（新規98・撮り直し3）。残る10枚はアプリ外の画面か付録専用の完成版 |
| ⑦ | コードだけ並んで説明が無い | ✅ | mermaid **39 → 71枚**（+32）。図が0枚の日は無くなった |
| ⑧ | 30日終わって理解が残らん | ✅ | 理解チェック 3問×30日 = 90問 |
| ⑨ | Step ごとに撮ってへん（同じ画像の使い回し） | ✅ | 同一ファイル内の重複参照が**余剰31 → 0**（36本・参照のべ125箇所） |
| ⑩ | 写真に「まだ作ってへんもの」が映る | ✅ | その日のツリーで撮った101枚を1枚ずつ開いて確認（`cover-letter.md` 9-2 節） |

**10類型すべて片付いとる。**⑥⑦⑨⑩ は #388 で潰した。この表は 2026-08-31 に
一次データから数え直した値で、数え方は次のとおり（母集団はどれも `material/30days-curriculum/*.md` の36本）。

```bash
# ⑥⑨: 画像の実数・参照のべ・同一ファイル内の重複
python3 - <<'PY'
import glob, re, os, collections
refs = []
for f in sorted(glob.glob('material/30days-curriculum/*.md')):
    refs += [(f, os.path.normpath(m)) for m in re.findall(r'!\[[^\]]*\]\(([^)]+\.png)\)', open(f).read())]
extra = sum(v - 1 for f in {a for a, _ in refs}
            for v in collections.Counter(m for a, m in refs if a == f).values() if v > 1)
print('参照のべ', len(refs), '/ 実画像', len({m for _, m in refs}), '/ 同一ファイル内の余剰', extra)
PY

# ⑥: そのうち何枚を #388 でその日のツリーから撮ったか（新規 + 撮り直し）
git diff --name-status 26c53e0^ 26c53e0 -- material/30days-curriculum/screenshots | cut -c1 | sort | uniq -c

# ⑦: 図の枚数
grep -c '^```mermaid' material/30days-curriculum/*.md | awk -F: '{s+=$2} END{print s}'
```

---

## 済んだ作業① — 写真の撮り直し（⑥⑨⑩・#388 で完了）

### 何が問題やったか

`check_visualization.py` が「スクショ位置3箇所以上」を機械で強制しとる。**それを通すために
同じ画像を貼って数を稼いどった。**検査が品質を下げる方向に効いとった。

before は参照のべ125箇所に対して実画像64枚（同一ファイル内の余剰31参照）。
after は実画像111枚・余剰0参照。101枚をその日のツリーで撮り直した。

**この節は「終わった作業の記録」やけど消さん。**撮影の道具立てとハマりどころは、
写真を1枚足すたびに要る。次に撮る人はここから読む。

| 道具 | 場所 | 役割 |
|---|---|---|
| 日別ツリー再構成 | `scripts/curriculum-qa/build_day_snapshots.py` | 「その日のコード状態」を組む |
| 撮影 | `scripts/curriculum-qa/shoot_screenshots.py` | Playwright で撮る。赤枠は `boundingBox()` 基準なので座標がズレん |
| 撮影表 | `scripts/curriculum-qa/screenshot-shot.json` | `name/day/path/login/actions/wait_for/marks/full_page/clip/note/viewport` の宣言 |
| 撮り直し計画 | `doc/review-handoff/screenshots-plan.md` | 撮り直しが要った21箇所の内訳と、各カットで赤枠にすべき要素 |
| 重複ゲート | `check_visualization.py`（同一日の画像重複を落とす検査を追加済み） | 水増しの再発を止める |

### 手順（実測済み・そのまま踏める）

```bash
# 1. Docker を起こす（コンテナ内では毎回要る）
setsid nohup dockerd --iptables=false --ip6tables=false > /tmp/dockerd.log 2>&1 < /dev/null &
until docker info >/dev/null 2>&1; do sleep 2; done

# 2. 撮影用DBを立てる（ホスト側 25532 番）
docker compose up -d db

# 3. 1日ずつ撮る。--day は数字1つだけ。複数日を1回で渡すと弾かれる
python3 scripts/curriculum-qa/shoot_screenshots.py --day 5
python3 scripts/curriculum-qa/shoot_screenshots.py --day 6
```

### ハマりどころ（全部踏んだ）

- `--day day05` は通らん。**数字のみ・1日ずつ**（引数解析が `rest[1].isdigit()` を見る）
- `project_members_user_id_fkey` でシードが落ちたら、たいてい**DBコンテナが途中で止まっとる**。
  シードのバグやない。`docker compose up -d db` で立て直す
- `nohup ... &` のラッパーは即座に終了するので「終わった」と誤読しやすい。
  **`until <条件>; do sleep N; done` で待つ**
- `material/**/screenshots/*.png` は Read が拒否される。**scratchpad へコピーしてから Read**

### 撮ったあと必ずやること

**1枚ずつ Read で目視する。**「まだ作ってへんナビ・メニュー・データが映ってへんか」は
機械では拾えん。見た枚数を報告に書く。

---

## 済んだ作業② — 図の追加（⑦・#388 で完了）

39枚 → **71枚**（+32）。図が0枚の日は無くなった。判定は1問だけ:
**「この節を読んだ人が紙に描いて確かめたくなるか」**。判定結果は
`doc/review-handoff/diagrams-added.md` にある。

描かんもの3類型。水増しを防ぐため、次に足すときも同じ線で切る。
- 手順の羅列を四角で囲んだだけの図
- 箇条書きをそのまま絵にした図
- 画面写真がある所の重複

---

## 絶対に踏んだらアカン地雷

### ZIP の除外を rsync に書くな

`sale_package.py:94` が `build-zip.sh` の**全文**から `--exclude="..."` を正規表現で拾って
「読者が自分で書くルーター」の一覧を組んどる。`build-zip.sh` の rsync に除外を足すと
その一覧が汚れて `check_zip_reference` と `check_tag_balance` が壊れる。
**コメントにもその書式を書いたらアカン**（ファイル内にその旨が書いてある）。

除外が要るときは `zip -qr ... -x` 側に足し、`FILE_COUNT` の `find` も同じ条件に揃える。

### 教材を触る前に必ずスキルを読む

`material/**` を編集する前に `.claude/skills/material-writing/SKILL.md` を読む。任意やない。
外部レビューで「AI独特の言い回しと翻訳文感」を指摘され、**商品として通用しないと判断された実績**がある。

- 教材本文は**ですます体**。関西弁は会話用であって本文に持ち込まん
- コードブロックの後には必ず「なぜこう動くか」を書く。手順の羅列は教材やない

### `test-*.mjs` は .gitignore に食われる

`.gitignore:99` が `test-*.mjs` と `*-test.mjs` を落とす。Node 側の検査を
`test-なんとか.mjs` で置くと、手元では緑やのに**リポジトリに入らん**。CI では
ファイルごと無いので、参照しとる検査が落ちるか、黙って退けられる。
検査は `test_なんとか.mjs`（アンダースコア）で置く。

### 節の存在チェックは素の grep でやるな

day03 の `## main` `## 現在できること` 等は README サンプルの**コードブロック内の文字列**。
`curriculum_blocks.py` の `mask_code` / `heading_scan_view` を通す。

### 新しい検査は4点セットで1本

4点セットの内訳は次のとおり。

1. `check_X.py` 本体
2. `test_check_X.py`
3. `check_quality.sh` の `CORPUS_CHECKS`(L204-220) と `SELF_TESTS`(L222-249) に登録
4. `material-gate.yml` Gate 4 の `*_status` 集計（L401 のロールアップ）

どれか1つ欠けると「検査を足したのにゲートが見てへん」状態になる。

### 子分の報告を鵜呑みにするな

走査95件のうち91件を裏取りして **real 40 / false 50 / unclear 1 = 誤り率55%**。
反証を噛ませてへんかったら**正しい教材を50箇所壊しとった**。逆に、走査が**見落とした**件も
自分の grep で見つかっとる（day29 の `名前は必須です` 4件目）。

**もう1つの教訓は、裏取りの取りこぼしを報告で全件扱いにしてしもたこと。**
最初の裏取りは65件で止まっとった（並列が上限に当たった）のに、添え状には「95件を確かめた」と
書いてしもとった。マージ前に自分で journal を数え直して気づいて、残り26件を通したら
**real が15件、うち blocker が2件**出た。数字は必ず一次データから数え直す。
残る4件は走査の生データ側で日が特定でけへん分で、**確かめた件数に入れてへん**。

必ず自分でファイルを開いて裏を取る。子分には「反証しろ・既定は間違っとる」と投げる。

### 数字の報告

定義は**局長の言葉から取る**。before/after を同一定義・同一母集団で測り、母集団を必ず添える。
定義を自分で狭めた数字は出さん。

### GitHub 操作

**PR の作成・更新・マージ、Issue の close は明示指示なしには触れん**（リポジトリのルール）。
PR #388 の本文は古い（「6.2M / 174ファイル」で止まっとる）が、局長の一言が無いと直せん。

### Git

- `git reset --hard/--soft/--mixed` 禁止
- `--no-verify` 禁止。提案すること自体が違反
- `--force` 禁止。`--force-with-lease` のみ
- develop・main への直接 push 禁止

---

## 検証コマンド一覧（全部この環境で通る）

```bash
# 原稿
npx textlint "material/**/*.md"                                          # 0件
bash scripts/curriculum-qa/check_quality.sh material/30days-curriculum/  # ALL CHECKS PASS

# 写経したら動くか
python3 scripts/curriculum-qa/build_day_snapshots.py --all --verify      # 29/30

# 配布物
bash scripts/build-zip.sh                                                # 74ファイル / 88,757バイト
python3 scripts/curriculum-qa/test_sale_package.py                       # 31/31

# 紙面
python3 scripts/pdf-book/build_pdf_book.py <変更した.md>                 # 焼き直し
python3 scripts/pdf-book/check_pdf_book.py                               # 36冊 exit 0
python3 scripts/pdf-book/check_page_layout.py                            # 36冊 exit 0
```

---

## 環境の状態

| 前提 | 状態 |
|---|---|
| Docker | ✅ `dockerd --iptables=false` で起動する。**コンテナ再起動のたびに立て直しが要る** |
| npm registry | ✅ 到達する |
| poppler | ✅ `pdftotext` `pdfinfo` `pdffonts` `pdftoppm` `pdfimages` 全部ある |
| Chromium | ✅ `/opt/pw-browsers/chromium`。Vivliostyle と撮影の両方で使う |
| 撮影用DB | postgres 16-alpine / ホスト 25532 / user:user@localhost:25532/taskapp |

---

## これまでの記録（詳細が要るとき）

| ファイル | 中身 |
|---|---|
| `cover-letter.md` | 局長への添え状。潰した不満の before/after、見たページ枚数、リリース後へ回した一覧 |
| `scan-day01-08.md` 〜 `scan-day25-30-appendix.md` | 36本の走査結果（生・未検証） |
| `sweep-findings-raw.md` | 走査95件の生データ。**62%が誤り**なので単体で信用せん |
| `fix-day01-04.md` 〜 `fix-day22-30.md` | 実際に直した内容 |
| `day-snapshots-result.md` | 30日再構成ビルドの結果 |
| `page-layout-check.md` | 紙面検査の結果 |
| `screenshots-plan.md` | 撮影の作業指示書（済んだ作業①の元になった表） |
| `diagrams-added.md` | 図を足すか落とすかの判定結果（済んだ作業②の根拠） |
| `duplicate-image-gate.md` | 画像重複ゲートの設計 |
| `gate1-summary.md` | Gate 1 で確定した件数 |

---

## CodeRabbit / Codex のレビュー対応（2026-08-31 完了）

PR #388 を ready にしたあと、CodeRabbit が **41本**、Codex が **11本**のレビュースレッドを立てた。
局長の指示は「ボット指摘→返信・納得・resolve まで。異議は議論。したらマージ」。全部片付けた。

### 結果

| 相手 | 本数 | 直した | 成立せんと返した | 事前対応済み |
|---|---:|---:|---:|---:|
| CodeRabbit | 41 | 22 | 14 | 5 |
| Codex | 11 | 8 | 0 | 3 |

判定の根拠は `doc/review-handoff/coderabbit-verdicts.md`。**41本のうち14本は成立せんかった**ので、
1本ずつ自分でファイルを開いて確かめてから返信しとる。受け売りで直すと正しい記述を壊す。

### 直した中身（コミット）

| コミット | 中身 |
|---|---|
| `5cb4b5b` | day01 準備完了／day02 の todayGoal 3件／day03・day04 の `.node-version`／day09 狭幅／day11 alt／day23 Recharts／day27 の `?`／`ensure_tree_fresh` の入力漏れ＋退行テスト／500 応答のバックオフ／自己テスト2本／dashboard のコントラスト |
| `c50112e` | day05・day07 のロックアウト3段／day08 の `hasMounted` と `getSession` の順／day09 の Suspense |
| `9f22ea6` | 表のセルが割れる `\|` を8箇所エスケープ（MD056）／見出し前後の空行8箇所（MD022）／day02 の確認ポイント |

### 取らんと決めたもの（返信済み）

markdownlint の MD040/MD018/MD024/MD038 系。`doc/` には既存で MD060 が2133件・MD013 が1245件あって
**markdownlint のゲート自体が無い**。リポジトリが強制しとるのは textlint で、そっちは exit 0。
拾われた分だけ直しても片付かん。中身が消える **MD056 だけ**は別扱いで直した（8箇所 → 0）。

成立せんかった指摘のうち、実測で反証したものを残しておく。

- `check_page_layout.py:585` のページ並び順 → `pdftoppm` は総ページ数の桁数でゼロ埋めするので辞書順＝数値順。168ページの本で `page-001`〜`page-168`、6ページの本で `page-1`〜`page-6` を実測
- 「26行以上のコードブロック」→ 36本の ``` 対を全部数えて **0件**。指摘は行番号の範囲を数えており、フェンスの中身を数えていない
- day26 の `error.tsx` と `useEffect` → React の Error Boundary が捕まえないのはイベントハンドラー・非同期・SSR・境界自身の4つで、`useEffect` の同期例外は捕まる
- day08 の MD029 → 出荷する PDF を `pdftotext` で確かめたら `4.` `5.` のまま出る
- day18・day25 の「画像の到達 Step」→ 本文が完成画像であることと、いま自分の画面に何が無いかを名指しで断っとる

### #388 のマージで出した手落ち（PR #389 で回収）

**Codex が #388 の head へ3件を出した6分後に、それを見んままマージした。** 直前に
「ボット指摘は全部片付いた」と宣言しとったのに、着いたばかりの指摘を読まずに閉じたわけで、
これは完全にワイの手落ち。3件は #388 のスレッドで名指しで謝った上で、追いの PR #389 で直した。

3件はどれも同じ形をしとった。**検査は動いとるのに噛んでへん。**

| 指摘 | 中身 |
|---|---|
| Codex P1 | `build_failure_is_db_less` が表示用に切った3行で判定しとった。DB のエラーが先頭に並ぶと、その後ろの本物の失敗を見逃す |
| Codex P2 | フラグ名を変えたのに `duplicate-image-gate.md` の手順が旧名のまま。なぞると `FileNotFoundError` で止まる |
| Codex P2 | `"settleAnimations(page)" in source` がヘルパーの宣言に当たる。呼び出しを消しても緑のまま通る飾りのテスト |

さらに CodeRabbit が #389 の head へ3件を出した。これも全部実在した。

| 指摘 | 中身 |
|---|---|
| `check_visualization.py:177` | `CURRICULUM_QA_WARN_ON_DUPLICATE_IMAGE=FALSE` が黙って WARNING へ落ちる |
| `shoot-page.mjs:282` | `catch` が例外の種類を見ず、評価エラーもページ破棄も「警告つきで撮れた」に化ける |
| `shoot_screenshots.py:858` | 撮影が成功した回にワーカーの `stderr` を捨てとって、収束タイムアウトの警告が消える |

さらに、その直しへ Codex がもう1件（P1）を返してきた。`ERROR_MARK` が
`Can't reach database server` にも `P1001` にも当たらんので、Prisma が例外名とマーカーを
別の行に吐いた回に、証拠の行ごとプールから落ちとった。**二巡目で足したテストが両方を
1行に詰めとったせいで、この形を踏んでいなかった。**`d796006` で直した。

そこからさらに Codex が2巡した。五巡目は3件 — Next.js のラッパー行が混じると DB だけの
失敗を通せん（`build_failure_needs_database` へ設計変更・`7868bb6`）／無限スピナーを
待つ相手から外しただけで止めてへん（撮るたびに別の角度）／`duplicate-image-gate.md` に
WARNING 時代の記述が残って自分と矛盾。六巡目も3件 — `P1012` を DB の印にしとった
（Prisma のスキーマ検証エラー全般の番号なので、本物のビルド欠陥が SKIP へ落ちて exit 0 になる）
／結果ドキュメントを切り分けより先に書き出しとって画面と成果物が食い違う／このファイル自身の
件数が古い。**七巡目は CodeRabbit が6件 — DB マーカーだけで SKIP にすると本物の失敗が exit 0 で出ていく（Codex と逆向きの穴。両側判定へ変更）／画面の日別行が切り分け前の状態／環境変数の判定が拒否リストのままで綴り間違いが WARNING へ落ちる／`duplicate-image-gate.md` の doc 3件。八巡目は Codex が2件 — `Error validating datasource` が P1012 と同じ形で残っとった／`EXPECTED_RED` が day11 の build 落ちを中身を見ずに丸ごと免除しとった。**合計21件、8ラウンド。**

判定と直し方は `doc/review-handoff/coderabbit-verdicts.md` の末尾。**21件とも退行テストを足し、
直しを戻すと落ちることを1件ずつ確かめた**（`rm -rf __pycache__` を先に打つ。キャッシュが残ると
戻したはずの挙動が古いまま報告されて、テストが嘘をつく）。

### この回で学んだこと（次の担当者へ）

1. **マージの直前にもう一度スレッドを取り直す。** 「片付いた」と言った時点から数分で増える。
2. **退行テストは、直しを戻して落ちることを見るまで書けたと言わん。** ラッパー越しに呼ぶと
   ラッパーの既定が効いて本体を戻しても緑のまま通る。本体を直接呼ぶ。
3. **`__pycache__` を消してから戻す。** 消さんとテストが古い挙動を報告する。
4. **`git checkout <file>` で戻さん。** HEAD に戻るので、まだコミットしてへん自分の直しごと
   消える。このセッションで3回踏んだ。戻すときは python でその行だけ書き換える。
5. **文字列一致で書いたテストは飾りになりうる。** `skipped = [` を探すだけやと、中身を
   `return list(results)` に潰しても通る。関数へ切り出して実際に値を通す。

### 残っとること

PR #389 のボット指摘は21件とも直して返信・resolve 済み。マージは局長の指示待ち。
