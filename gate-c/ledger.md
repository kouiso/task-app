# Gate C 台帳 — 36冊全ページ目視 + 機械検査

担当: devin-3b59b953（目視/機械検査） / 生成: devin-3a7a21dd（release実行中）
入力パック: `kouiso/task-app` `devin/source40-input-pack` HEAD `08d631e8b93e70f3f2d672cf72c2200959f5310f`
本ファイル: `devin/gate-c-evidence` ブランチ `gate-c/ledger.md`（生成側・他AI共有用）

## 受領形態（確定 — ブランチ経由）

生成完了後、生成側が成果物ブランチ（`devin/source40-output*` 系）へ `dist/pdf/*.pdf` 36冊 + receipt を push。
受領側(本台帳)がブランチから取得して照合する項目:
1. 各PDF実バイナリ → sha256（この台帳の「受領sha256」欄へ記録）
2. 各PDFページ数（pdfinfo/mutool 実測）
3. ビルド commit — 原稿hashがどの版で組版されたか。**A担当の修正確定後の原稿hash＋dirty差分で固定した版が正**
4. `write_release_receipt` の receipt JSON（inputs→outputs、EXPECTED_PDFS=36契約）

## A修正・再生成の受領ルール（統括指示を固定）

- 生成PDFにA修正が未反映の冊 → **再生成→その最終hashを受領して検査**
- 原稿hashの照合基準: 検査対象PDFの入力md sha256 ≠ 下表 baseline の場合、差分を「A修正後hash」欄に記録し、receiptのinput hashと一致することを確認
- **共通組版（build_pdf_book.py/book.css/フォント等）の変更が入った場合は全36冊を再検査対象とする**

## manifest 照合（実測済 2026-10-10, devin-3b59b953）

- manifest sha256 = `346b9f898aef…` / 1110件 sha256 全一致・欠落0
- 配布ZIP 85/85件 byte 一致
- manifest対象外40件 = 教材md36 + sample PDF2 + manifest自身 + edu-creator(サブモジュール)

## 検査台帳（36冊）

| # | 冊子(stem) | baseline sha256(12)@08d631e8 | A修正後sha256 | 受領sha256 | 頁数 | 機検 | 目視 | 備考 |
|---|---|---|---|---|---|---|---|---|
| 1 | 00-1_学びのロードマップ | `8bd349ed7bc9` | | ⬜ | | ⬜ | ⬜ | |
| 2 | 00_カリキュラム目次 | `fadedb04d72a` | | ⬜ | | ⬜ | ⬜ | |
| 3 | appendix_トラブルシューティング | `0865ac0146eb` | | ⬜ | | ⬜ | ⬜ | |
| 4 | appendix_参考資料 | `68d4ab3b32ef` | | ⬜ | | ⬜ | ⬜ | |
| 5 | appendix_次のステップ | `fabeb1b6a820` | | ⬜ | | ⬜ | ⬜ | |
| 6 | appendix_用語集 | `a47847a5d887` | | ⬜ | | ⬜ | ⬜ | |
| 7 | day01_開発環境を整えて、初めてのアプリを動かそう | `dcc268aacb28` | | ⬜ | | ⬜ | ⬜ | |
| 8 | day02_ダッシュボードに自分だけのメッセージを追加しよう | `7394d8c218cf` | | ⬜ | | ⬜ | ⬜ | |
| 9 | day03_GitHubに保存する | `f083816f377f` | | ⬜ | | ⬜ | ⬜ | |
| 10 | day04_ネットに公開 | `1df5d1504706` | | ⬜ | | ⬜ | ⬜ | |
| 11 | day05_ログイン画面のUI | `b1e169627e56` | | ⬜ | | ⬜ | ⬜ | |
| 12 | day06_ユーザー登録画面 | `cce883290502` | | ⬜ | | ⬜ | ⬜ | |
| 13 | day07_ログイン体験を改善しよう | `d0255667c618` | | ⬜ | | ⬜ | ⬜ | |
| 14 | day08_サイドバーを完成させよう | `e1ac9093bb51` | | ⬜ | | ⬜ | ⬜ | |
| 15 | day09_プロジェクト一覧画面 | `476ecea5ff2d` | | ⬜ | | ⬜ | ⬜ | |
| 16 | day10_プロジェクト新規作成 | `b190d2dd0055` | | ⬜ | | ⬜ | ⬜ | |
| 17 | day11_プロジェクト編集・削除 | `1b28e36e7121` | | ⬜ | | ⬜ | ⬜ | |
| 18 | day12_メンバー追加 | `cd9c659a1fa6` | | ⬜ | | ⬜ | ⬜ | |
| 19 | day13_タスク一覧画面 | `5c1a9b8481a0` | | ⬜ | | ⬜ | ⬜ | |
| 20 | day14_タスク新規作成 | `08507cdcb6bf` | | ⬜ | | ⬜ | ⬜ | |
| 21 | day15_タスク編集・削除 | `9558e3dc03f3` | | ⬜ | | ⬜ | ⬜ | |
| 22 | day16_ステータス変更・時間記録 | `dd519fe31d67` | | ⬜ | | ⬜ | ⬜ | |
| 23 | day17_自分のタスクページ | `2ed751ead24d` | | ⬜ | | ⬜ | ⬜ | |
| 24 | day18_コメント投稿 | `8021236ed149` | | ⬜ | | ⬜ | ⬜ | |
| 25 | day19_コメント編集・削除 | `da4c94b52e39` | | ⬜ | | ⬜ | ⬜ | |
| 26 | day20_タスク検索機能 | `bceee5e7351e` | | ⬜ | | ⬜ | ⬜ | |
| 27 | day21_統計カードを表示 | `ab3803a1f285` | | ⬜ | | ⬜ | ⬜ | |
| 28 | day22_グラフを表示 | `7899ae6bf39f` | | ⬜ | | ⬜ | ⬜ | |
| 29 | day23_週次レポート | `99643922c4e6` | | ⬜ | | ⬜ | ⬜ | |
| 30 | day24_ユーザー一覧（管理者用） | `17078826fcff` | | ⬜ | | ⬜ | ⬜ | |
| 31 | day25_プロフィール編集 | `192cf5d0f54d` | | ⬜ | | ⬜ | ⬜ | |
| 32 | day26_エラーページを作って、バグを退治しよう | `c1dd6f612135` | | ⬜ | | ⬜ | ⬜ | |
| 33 | day27_プロジェクト詳細・アーカイブを実装しよう | `21270018bf76` | | ⬜ | | ⬜ | ⬜ | |
| 34 | day28_タスク一括操作を実装しよう | `cf043db6fb97` | | ⬜ | | ⬜ | ⬜ | |
| 35 | day29_ユーザー詳細・編集ページを作ろう | `c6169f6eb540` | | ⬜ | | ⬜ | ⬜ | |
| 36 | day30_完成版を公開！ | `5bedd55830c2` | | ⬜ | | ⬜ | ⬜ | |

## 機械検査（受領後に本worktreeで実行）

```bash
python3 scripts/pdf-book/release_manifest.py --write dist/release-manifest.json
python3 -m unittest discover -s scripts/pdf-book -p test_book_links.py
python3 scripts/pdf-book/check_pdf_book.py dist/pdf/<book>.pdf
```

## 目視手順

- `pdftoppm -r 60 -png` で全ページPNG化→1頁ずつ目視
- 観点: 文字化け・フォント欠落 / コードブロック枠外はみ出し / 見出しリンクURL行欠落 / footnote裸URL / 画像・スクショ欠落 / ページ送り崩れ / 白ページ / 目次頁番号ずれ
