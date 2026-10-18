# Gate C 台帳 — 36冊全ページ目視 + 機械検査

担当: devin-3b59b953（目視/機械検査） / 生成: devin-3a7a21dd（release実行中）
入力パック: `kouiso/task-app` `devin/source40-input-pack` HEAD `e338032211198e00f9cffcc2f40e1822717bd9b7`（旧base 08d631e8 → e3380322 で共通組版変更が入った。教材md36本は無変更のため下表 baseline sha256 は引き続き有効・実測確認済）
本ファイル: `devin/gate-c-evidence` ブランチ `gate-c/ledger.md`（生成側・他AI共有用）

## 受領形態（確定 — ブランチ経由）

生成完了後、生成側が成果物ブランチ（`devin/source40-output*` 系）へ `dist/pdf/*.pdf` 36冊 + receipt を push。
受領側(本台帳)がブランチから取得して照合する項目:
1. 各PDF実バイナリ → sha256（この台帳の「受領sha256」欄へ記録）
2. 各PDFページ数（pdfinfo/mutool 実測）
3. ビルド commit — 原稿hashがどの版で組版されたか。**A担当の修正確定後の原稿hash＋dirty差分で固定した版が正**。receipt には e3380322 ベース確定差分への対応を残す
4. `write_release_receipt` の receipt JSON（inputs→outputs、EXPECTED_PDFS=36契約）

## A修正・再生成の受領ルール（統括指示を固定）

- 生成PDFにA修正が未反映の冊 → **再生成→その最終hashを受領して検査**
- 原稿hashの照合基準: 検査対象PDFの入力md sha256 ≠ 下表 baseline の場合、差分を「A修正後hash」欄に記録し、receiptのinput hashと一致することを確認
- **共通組版（build_pdf_book.py/book.css/フォント等）の変更が入った場合は全36冊を再検査対象とする**
- ⚠ e3380322 で共通組版が実際に変更済（`build_pdf_book.py`・`code_wrap.py`・`decorative-margin-outline.mjs`・新規 `hanging_scope.py`+`selective-hanging-scope-current40.json`+`test_hanging_scope.py`）。**e3380322 以前に生成されたPDFは旧組版 → 再生成後のものだけを受領対象とし、受領時に receipt のビルド基準が e3380322 以降であることを確認する**

## manifest 照合（実測済, devin-3b59b953）

- @08d631e8: manifest sha256=`346b9f898aef…` / 1110件 sha256 全一致・欠落0
- @e3380322（現HEAD）: manifest 1114エントリ sha256 全一致・欠落0（file_count欄=1110・commit欄=40a5ac34 は旧ベース名残。記録は実HEAD e3380322 基準）
- 配布ZIP 85/85件 byte 一致
- manifest対象外40件 = 教材md36 + sample PDF2 + manifest自身 + edu-creator(サブモジュール)

## 検査台帳（36冊）

**candidate受領記録**（`gate-c/logs` 相当・実測 2026-10-10 devin-3b59b953）: 成果物ブランチ `devin/source40-pdf-artifacts` @ `e39a1ce9b7e3ea8dd7d922902f77af4c98741f07`、36PDF sha256・pdfinfo頁数・原稿sha256全一致・合計3743頁を自前照合で確認。候補版・機検未完了・checker版は生成担当修正版へ後揃え。Day26完成版ファイル欠落は**未確定欠陥**扱い（B担当が8断片から再構築中）

**新版受領記録（2026-10-18 統括4adf・実測）**: 成果物ブランチ `devin/source40-pdf-artifacts` @ `73d26d6`（生成 `5881e2f` = mermaidフォント修正後の全36冊再ビルド）。全36冊のsha256・頁数をmanifestと突合済。e39a1ceの受領sha256は旧candidateのため下表は新版へ置換済。頁数差あり（day11 161→160, day13 103→104, day15 127→126, day19 130→129, day21 87→86）→ mermaidフォント計測修正によるリフロー実在。**S01-S03の旧hash目視結果は無効、新版で要再検査**

| # | 冊子(stem) | baseline sha256(12)@08d631e8 | A修正後sha256 | 受領sha256(新版@73d26d6) | 頁数 | 機検 | 目視 | 備考 |
|---|---|---|---|---|---|---|---|---|
| 1 | 00-1_学びのロードマップ | `8bd349ed7bc9` | | `5576d7683a8c`| 7 | ⬜ | ⬜ | 旧hash検査済→新版要再検査 |
| 2 | 00_カリキュラム目次 | `fadedb04d72a` | | `41b6d9b19931`| 20 | ⬜ | ⬜ | 同上 |
| 3 | appendix_トラブルシューティング | `0865ac0146eb` | | `4cf1350761c8`| 21 | ⬜ | ⬜ | 同上 |
| 4 | appendix_参考資料 | `68d4ab3b32ef` | | `2cda346ce990`| 10 | ⬜ | ⬜ | 同上 |
| 5 | appendix_次のステップ | `fabeb1b6a820` | | `7bae1ff876f4`| 16 | ⬜ | ⬜ | 同上 |
| 6 | appendix_用語集 | `a47847a5d887` | | `2a0947c60ad4`| 16 | ⬜ | ⬜ | 同上 |
| 7 | day01_開発環境を整えて、初めてのアプリを動かそう | `dcc268aacb28` | | `c1f5c906d303`| 82 | ⬜ | ⬜ | 同上 |
| 8 | day02_ダッシュボードに自分だけのメッセージを追加しよう | `7394d8c218cf` | | `999ca07b8857`| 70 | ⬜ | ⬜ | 同上 |
| 9 | day03_GitHubに保存する | `f083816f377f` | | `2e3726d03802`| 60 | ⬜ | ⬜ | |
| 10 | day04_ネットに公開 | `1df5d1504706` | | `427c6a1057e6`| 50 | ⬜ | ⬜ | |
| 11 | day05_ログイン画面のUI | `b1e169627e56` | | `cdc89038a94f`| 81 | ⬜ | ⬜ | |
| 12 | day06_ユーザー登録画面 | `cce883290502` | | `40bc5a5aefbb`| 77 | ⬜ | ⬜ | |
| 13 | day07_ログイン体験を改善しよう | `d0255667c618` | | `9b97f379589b`| 146 | ⬜ | ⬜ | |
| 14 | day08_サイドバーを完成させよう | `e1ac9093bb51` | | `581d4e00346e`| 85 | ⬜ | ⬜ | |
| 15 | day09_プロジェクト一覧画面 | `476ecea5ff2d` | | `d90cb705069d`| 86 | ⬜ | ⬜ | |
| 16 | day10_プロジェクト新規作成 | `b190d2dd0055` | | `3c99e8d846a8`| 120 | ⬜ | ⬜ | |
| 17 | day11_プロジェクト編集・削除 | `1b28e36e7121` | | `4d873fbbb420`| 160 | ⬜ | ⬜ | |
| 18 | day12_メンバー追加 | `cd9c659a1fa6` | | `55c0f815ce90`| 169 | ⬜ | ⬜ | |
| 19 | day13_タスク一覧画面 | `5c1a9b8481a0` | | `7882f529b4f5`| 104 | ⬜ | ⬜ | |
| 20 | day14_タスク新規作成 | `08507cdcb6bf` | | `9768cb91a72e`| 174 | ⬜ | ⬜ | |
| 21 | day15_タスク編集・削除 | `9558e3dc03f3` | | `dc24c93bbb4a`| 126 | ⬜ | ⬜ | |
| 22 | day16_ステータス変更・時間記録 | `dd519fe31d67` | | `2a44003fc190`| 115 | ⬜ | ⬜ | |
| 23 | day17_自分のタスクページ | `2ed751ead24d` | | `5797ff5d4964`| 161 | ⬜ | ⬜ | |
| 24 | day18_コメント投稿 | `8021236ed149` | | `a0046b83155e`| 105 | ⬜ | ⬜ | |
| 25 | day19_コメント編集・削除 | `da4c94b52e39` | | `341ddae4fa12`| 129 | ⬜ | ⬜ | |
| 26 | day20_タスク検索機能 | `bceee5e7351e` | | `71a67be90fa2`| 274 | ⬜ | ⬜ | |
| 27 | day21_統計カードを表示 | `ab3803a1f285` | | `d2cf29f07b92`| 86 | ⬜ | ⬜ | |
| 28 | day22_グラフを表示 | `7899ae6bf39f` | | `ba192afa3b08`| 56 | ⬜ | ✅ | S26: 3a7a単頁150dpi・must0(2026-10-18) |
| 29 | day23_週次レポート | `99643922c4e6` | | `910c49da9e4f`| 121 | ⬜ | ✅ | S27: 3a7a単頁150dpi・must0/note13(改頁不可由来の半白頁・仕様容認) |
| 30 | day24_ユーザー一覧（管理者用） | `17078826fcff` | | `e926f830b351`| 86 | ⬜ | ✅ | S28: 3a7a単頁150dpi・must0/note5(不可分ブロック半白頁・仕様容認)。p35「ロ」は誤検知撤回(実グリフCID12525)・notdef全冊0件@ea7ab79 |
| 31 | day25_プロフィール編集 | `192cf5d0f54d` | | `403f7a65923a`| 202 | ⬜ | ✅ | S29-30: 3a7a単頁150dpi・must0/note78(不可分ブロック半白頁・仕様容認)。mermaid3基完整・findings機械可読版=gatec/day25_findings.json |
| 32 | day26_エラーページを作って、バグを退治しよう | `c1dd6f612135` | | `8fc0656f84f1`| 179 | ⬜ | ⬜ | ⏸再構築確定確認後 |
| 33 | day27_プロジェクト詳細・アーカイブを実装しよう | `21270018bf76` | | `bc11d6f6db77`| 140 | ⬜ | ✅ | S33: 3a7a単頁150dpi・must0/note40(不可分ブロック半白頁・仕様容認)。mermaid3基+スクショ完整・findings=gatec/day27_findings.json |
| 34 | day28_タスク一括操作を実装しよう | `cf043db6fb97` | | `56cce696bbda`| 162 | ⬜ | ✅ | S34-35: 3a7a単頁110dpi+・must0/note38(不可分ブロック半白頁・仕様容認)。mermaid1+スクショ4完整・findings=gatec/day28_findings.json |
| 35 | day29_ユーザー詳細・編集ページを作ろう | `c6169f6eb540` | | `918a903a9120`| 176 | ⬜ | ⬜ | |
| 36 | day30_完成版を公開！ | `5bedd55830c2` | | `bf0b2591e3a0`| 68 | ⬜ | ⬜ | |

## 機械検査（受領後に本worktreeで実行）

```bash
PY=/opt/homebrew/bin/python3.12    # Homebrew Python 3.12.14（検証済）。/usr/bin/python3=3.9.6 は失敗するので使わない
$PY scripts/pdf-book/release_manifest.py --write dist/release-manifest.json
$PY -m unittest discover -s scripts/pdf-book -p test_book_links.py
$PY scripts/pdf-book/check_pdf_book.py dist/pdf    # 引数は「PDFディレクトリ1つ」必須（mainが1dir要求・単一ファイル不可）。--allow-gaps は付けない（全冊inventory+dayNN連続性検査を有効にする）
```
- 実行ログは `gate-c/logs/` 配下に残して本ブランチへ push する（exit code も記録）
- 前提ツール: poppler（pdftotext/pdfinfo/pdffonts）。本boxは `brew install poppler` 26.10.0 導入済・`/opt/homebrew/bin` に存在確認済
- **チェッカー版一致ルール（統括追加）**: `check_pdf_book.py` にNFC等価修正が入る。最終PDF受領時は**生成子が使った修正後チェッカーと同一commit/版のもので再検査**する。受領sha256・機検結果は修正後チェッカーの出力を基準に固定し、使用したチェッカーのgit commitを `gate-c/logs/` の実行ログに記録する

## 並行開始ルール（統括指示）

- 生成子が **candidate版36PDF** を専用成果物ブランチへ先置きする（『candidate/機検未完了』明記・Drive未書込み）。**受領次第、全頁目視を機械検査修正と並行で開始**
- 後続hash差分が来た冊のみ再目視。**checker側修正のみでPDF同一なら目視やり直し不要**
- **最終判断時に「最終受領hash」と「対象checker版」の一致を必ず確認する**
- candidate receipt は `gate-c/logs/candidate-receipt.md` に記録（ブランチcommit・各冊sha256・頁数・生成基準commit）

## 目視手順（要poppler・導入済）

- `bash gate-c/render_pages.sh <pdf_dir> gate-c/pages/` で全冊PNG化＋頁数/sha256一覧（`page-inventory.md`）を自動生成（poppler 26.10.0・pdftoppm）
- 目視方式（**進行中**・局長修正済）: ①全全頁を4頁/枚コンタクトシートで網羅走査しレイアウト欠陥を検出（計画中・render継続中）②**シートでは判読不可の細部は合格にしない** — 冊/頁範囲ごとに独立子セッションへ分担し、単頁相当の判読可能解像度で文字欠け・コード末尾・表・画像・リンク/ノンブルを全頁確認。検査済みは実見範囲のみ記録、未検査範囲は空欄/未完了のまま次担当へ渡す
- 観点: 文字化け・フォント欠落 / コードブロック枠外はみ出し / 見出しリンクURL行欠落 / footnote裸URL / 画像・スクショ欠落 / ページ送り崩れ / 白ページ / 目次頁番号ずれ

## 子セッション分担（38レンジ・判読可能解像度全頁目視）

| 担当 | セッション |
|---|---|
| S01 付録4+ロードマップ+目次 | devin-6f57aed9296946fc8f5efedfe102e429 |
| S02–S38（day01–day30、>150頁は頁範囲分割） | 作成キュー待ち（SWE-2プロモ7並列上限・org全体で使用中。子settle毎に1件ずつ順次投入・notify_on_responseで自動再開） |

## candidate機検プリチェック（実測・devin-3b59b953・2026-10-10）
- sha256: 36/36 manifest一致・頁数: 36/36一致・合計3743頁
- フォント: 全36冊・非埋め込みフォント0（文字化けリスク低）[pdffonts]
- 白頁: 全冊・テキスト15字未満の頁なし（空白頁なし）[pdftotext]
- 画像: pdfimages -list で各冊1〜7枚確認（冊毎の枚数は既記録）
- ※本項は機検のみ。細部の判読は子セッション分担の全頁目視で判定する

## S01結果集約（6冊・90頁・全頁目視済・e39a1ce9基準）
| 冊 | sha256(12) | 検査範囲 | must | suggest/note |
|---|---|---|---|---|
| 00-1_学びのロードマップ | b74d11f58b8d | 1-7 | 0 | 脚注裸URL(suggest,p3)・奥付紺帯(note,p7) |
| 00_カリキュラム目次 | f3bebae0d6d0 | 1-20 | 0 | 脚注裸URL(suggest,pp.3/8-19)・脚注次頁送り(note,pp.11/14)・奥付紺帯(note) |
| appendix_トラブルシューティング | e0d6402d18c3 | 1-21 | 0 | 脚注裸URL(suggest)・脚注次頁送り(note,p21)・奥付紺帯 |
| appendix_参考資料 | 2869cb1b3ce8 | 1-10 | 0 | 脚注裸URL(suggest,pp.4-10・表内inline重複) |
| appendix_次のステップ | (S01 JSON) | 1-16 | 0 | 脚注裸URL・p7大きな空白（統括転記・改頁不可ブロック由来の可能性） |
| appendix_用語集 | (S01 JSON) | 1-16 | 0 | 脚注裸URL・p15孤立hr（統括転記） |

採否: must=0。脚注裸URLは全冊共通のendnote式デザインの可能性が高く「suggest・様式統一確認」として記録（本文側リンクテキストあり・情報欠落なし）。脚注次頁送りはpaged-media脚注溢れの挙動・「note」で記録のみ。奥付紺帯は意図的装飾と認定（全冊共通）。次のステップp7大空白は「note・改頁不可ブロック由来と思われるが頁構成として残」、用語集p15孤立hrは「note・区切り線だけの孤立配置」と記録。全 suggest/note は元JSONの言い回しを台帳へ保全した。
運用変更（統括）: 以後のレンジは新規セッション作成せず本セッション（devin-6f57aed9296946fc8f5efedfe102e429）へ逐次再送。入力hash固定・担当範囲は各回で明記。

## S02結果集約 — day01（82頁・全頁目視・sha256 7885999f22b9・manifest一致）
**must 2件（いずれも200dpi再描でPDF本体の物理切断を確認）**
| 頁 | 分類 | 内容 |
|---|---|---|
| p13 | 図の文字切れ | 図2(Mermaid系構成図)全ノードラベル途中切断:「Dock(」「npr」「task-ap/npm run (」「DATABASE_UR」「PostgreS」「Node.js 22.12.0 以上 2」判読不能 |
| p67 | 図の文字切れ | 図5(同型diagram)同様に全ラベル切断:「src/app/paɢ」「/dashbo」「src/app/login/pa」「/logi」 |

suggest/note: 脚注裸URL×19（endnote式・情報欠落なし）、p23約7割空白（改頁不可ログブロック由来）、pp.43,45,47,49,51,65,70 半白頁パターン（同型組版・内容欠落なし）、奥付紺帯（意図的装飾）。
その他健全性: 図版6点全存在・コード枠外/末尾切れなし・目次17項目頁番号全一致・ノンブル2-82連続・白頁なし。
※同型Mermaid図のラベル切断は他冊でも再発の可能性が高い。以後の検査で同型図を重点確認。
## 担当表（2026-10-18 統括4adf代行運用・2レーン並行）
※2026-10-18: Gate C統括 3b59b953 が F60 へ転用のため、統括 devin-4adf が集約・割付を代行。兄弟間 message は403のため全中継は統括経由。前半レーン=6f57ae（S04→昇順）、後半レーン=3a7a21dd（S26→昇順、生成担当だが目視は別工程として正直記録）。
| レンジ | 対象 | 頁数 | 担当 | 状態 |
|---|---|---|---|---|
| S01 | 付録4+ロードマップ+目次 | 90 | 3a7a21dd | 🚧新版再検査へ割当（旧hash結果は無効） |
| S02 | day01 | 82 | 3a7a21dd | 🚧新版再検査へ割当（旧hash結果は無効・旧must2は旧版のみ） |
| S03 | day02 | 70 | 6f57ae(ChatGPT投入) | 🚧投入済・中断→統括が再開指示 |
| S04 | day04+day05 | 131 | 6f57ae | 🚧前半レーン・S03後に逐次 |
| S05 | day06 | 77 | 6f57ae | 同上 |
| S06 | day07 | 146 | 6f57ae | 同上 |
| S07 | day08 | 85 | 6f57ae | 同上 |
| S08 | day09 | 86 | 6f57ae | 同上 |
| S09 | day10 | 120 | 6f57ae | 同上 |
| S10-11 | day11 前/後半 | 81+80 | 6f57ae | 同上 |
| S12-13 | day12 前/後半 | 85+84 | 6f57ae | 同上 |
| S14 | day13 | 103 | 6f57ae | 同上 |
| S15-16 | day14 前/後半 | 87+87 | 6f57ae | 同上 |
| S17 | day15 | 127 | 6f57ae | 同上 |
| S18 | day16 | 115 | 6f57ae | 同上 |
| S19-20 | day17 前/後半 | 81+80 | 6f57ae | 同上 |
| S21 | day18 | 105 | 6f57ae | 同上 |
| S22 | day19 | 130 | 6f57ae | 同上 |
| S23-24 | day20 前/後半 | 137+137 | 6f57ae | 同上 |
| S25 | day21 | 87 | 6f57ae | 同上（前半レーン終端） |
| S26 | day22 | 56 | 3a7a21dd | ✅集約済・単頁150dpi・must0 |
| S27 | day23 | 121 | 3a7a21dd | ✅集約済・単頁150dpi・must0/note13 |
| S28 | day24 | 86 | 3a7a21dd | ✅集約済・単頁150dpi・must0/note5 |
| S29-30 | day25 前/後半 | 101+101 | 3a7a21dd | ✅集約済・単頁150dpi・must0/note78 |
| S31-32 | day26 前/後半 | 90+89 | 3a7a21dd | ✅集約済・単頁150dpi・must0/note20（現版8fc0656f84f1で検査済） |
| S33 | day27 | 140 | 3a7a21dd | ✅集約済・単頁150dpi・must0/note40 |
| S34-35 | day28 前/後半 | 81+81 | 3a7a21dd | ✅集約済・単頁110dpi+・must0/note38 |
| S36-37 | day29 前/後半 | 88+88 | 3a7a21dd | ✅集約済・単頁・must0/note19 |
| S38 | day30 | 68 | 3a7a21dd | ✅集約済・単頁150dpi・must0/note5 |
※Gate C側は投入せず集約+担当表管理。目視結果JSONは本節に冊毎追記していく。