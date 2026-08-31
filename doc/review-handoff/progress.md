# 30日教材 商品化 — 引き継ぎ

最終更新: 2026-08-31 / ブランチ `claude/30days-material-product-ready-hor18z` / PR **#388**（draft・CI全緑）

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
| ① | ZIPを開いたら商品外が入っとる | ✅ | 12.1MB/221ファイル → **86.6KB/74ファイル**。`material/` 丸ごと0件 |
| ② | Day01 で環境構築に失敗して進めん | ✅ | つまずき節・所要時間・環境図を追加 |
| ③ | **写経したのに動かん** | ✅ | `build_day_snapshots.py --all --verify` で **29/30**。day11 は教材が「ここは赤くなります」と断っとる想定どおり |
| ④ | 誤字・矛盾 | ✅ | 70件＋走査95件の裏取りで29件 |
| ⑤ | 紙面が崩れる | ✅ | `check_pdf_book.py` / `check_page_layout.py` とも **36冊 exit 0** |
| ⑥ | スクショと自分の画面が違う | 🔶 **未完** | 撮り直したのは day01/02/08 の**7枚だけ** |
| ⑦ | コードだけ並んで説明が無い | 🔶 **未完** | mermaid 39枚のまま。day01/02/03 は 0図 |
| ⑧ | 30日終わって理解が残らん | ✅ | 理解チェック 3問×30日 = 90問 |
| ⑨ | Step ごとに撮ってへん（同じ画像の使い回し） | 🔶 **未完** | **21箇所・のべ50回**が使い回し。うち7枚だけ解消 |
| ⑩ | 写真に「まだ作ってへんもの」が映る | 🔶 **未完** | ⑨と同じ作業で一緒に潰す |

**出荷を止めるものはゼロ。**残る⑥⑦⑨⑩は「壊れとるのを直す」やのうて「足りん分を足す」側。
ただし ¥10,000 の商品として見られたら弱点になる、と局長へは伝えてある。

---

## 残作業① — 写真の撮り直し（⑥⑨⑩・最優先）

### 何が問題か

`check_visualization.py` が「スクショ位置3箇所以上」を機械で強制しとる。**それを通すために
同じ画像を貼って数を稼いどった。**検査が品質を下げる方向に効いとった。

参照のべ114回に対して実画像64枚。**21箇所・のべ50回が使い回し。**
day21 が `report.png` を5回、day17 が `my-task.png` を4回。

### 基盤は全部動く状態で置いてある

| 道具 | 場所 | 役割 |
|---|---|---|
| 日別ツリー再構成 | `scripts/curriculum-qa/build_day_snapshots.py` | 「その日のコード状態」を組む |
| 撮影 | `scripts/curriculum-qa/shoot_screenshots.py` | Playwright で撮る。赤枠は `boundingBox()` 基準なので座標がズレん |
| 撮影表 | `scripts/curriculum-qa/screenshot-shot.json` | `name/day/path/login/actions/wait_for/marks/full_page/clip/note/viewport` の宣言 |
| 撮り直し計画 | `doc/review-handoff/screenshots-plan.md` | 21箇所の内訳と、各カットで赤枠にすべき要素 |
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

## 残作業② — 図の追加（⑦）

`doc/review-handoff/diagrams-added.md` に「どの節に図が要るか」の判定結果がある。
判定は1問だけ: **「この節を読んだ人が紙に描いて確かめたくなるか」**。

描かんもの3類型。水増しを防ぐため。
- 手順の羅列を四角で囲んだだけの図
- 箇条書きをそのまま絵にした図
- 画面写真がある所の重複

day01/02/03 が 0図。Docker / Node / Postgres の繋がりが最優先。

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

走査95件を裏取りしたら **real 25 / false 42 / unclear 1 = 誤り率62%**。
反証を噛ませてへんかったら**正しい教材を42箇所壊しとった**。逆に、走査が**見落とした**件も
自分の grep で見つかっとる（day29 の `名前は必須です` 4件目）。

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
bash scripts/build-zip.sh                                                # 74ファイル / 86.6KB
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
| `screenshots-plan.md` | **残作業①の作業指示書** |
| `diagrams-added.md` | **残作業②の判定結果** |
| `duplicate-image-gate.md` | 画像重複ゲートの設計 |
| `gate1-summary.md` | Gate 1 で確定した件数 |
