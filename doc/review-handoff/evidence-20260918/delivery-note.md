# 2026-09-18 配布証跡

## Drive フォルダ構成（実測）

フォルダ ID: `1LXf2Ws7MKN0hBjEGCU6W3CmwH5Y4GjxU`

| 場所 | 内容 | 件数 |
|---|---|---|
| ルート直下 | 現行版PDF（既存IDのまま上書き） | 36 |
| ルート直下 | `task-app-curriculum-v1.1.zip`（写経ZIP）ID `1JGcp9mhde-MOD97CcIjKacHgcD38OLkr` | 1 |

※ `旧版-20260912/`（上書き前の元版PDF 36件、ID `1-F6Pe3X7dtgcKYf0999y5erpU0y8C2Pp`）は
2026-09-19 に配布フォルダの外（チームドライブ直下）へ移動済み。購入者には現行版のみが見える。

## 検証記録

- `release-manifest.json` — PDF 36冊＋ZIP のインベントリ・Drive記録・リモート照合結果
- `drive-metadata.json` — Drive 上の各ファイル ID・sha256・URL（37件）
- `pdf-link-map.json` — PDF 生成時に章間リンクへ焼き込んだ Drive URL 対応表
- `release-build-receipt.json` — 36冊のビルド実行記録
- `release_manifest.py --remote-check`: PDF36＋ZIP1 を Drive から再取得して sha256 照合（ID一致も検査）

## 旧版保全

- 旧版フォルダの36件は元のDrive原本とバイト一致（sha256・md5で往復照合済み）
- ローカル予備: `~/.devin/taskapp-resume-20260917T055337397756Z/preserved/` ほか2箇所
- Drive側のリビジョン履歴でも上書き前版は復元可能（ファイル右クリック→版を管理）
- 注意: 旧版PDFの章間リンクは生成当時の `localhost:13000` リンクのまま（内部リンクは動かない）。本文・スクリーンショット自体は完全。閲覧専用の保全用途

## 写経ZIP

- `scripts/build-zip.sh` で生成。内容: scaffold-from-scratch.sh + scripts/_*-base 一式 + README + .env.example + doc/SUPPORTED_ENVIRONMENTS.md（`material/`・`src/` は含まない — 教材はPDFで別配布、srcは読者がscaffoldで作る）
- ZIPの共有権限はPDFと同一フォルダの権限モデルに従う

## 配布リンク（2026-11-05 有効化・#404）

- 配布方式: Drive 共有リンク（`type=anyone, role=reader`、リンクを知っている全員が閲覧可）
- 配布フォルダ: `30日教材PDF_36冊_2026-09-02`（ID `1LXf2Ws7MKN0hBjEGCU6W3CmwH5Y4GjxU`）
- リンク: https://drive.google.com/drive/folders/1LXf2Ws7MKN0hBjEGCU6W3CmwH5Y4GjxU
- 権限付与: 2026-11-05 に Drive API `files.permissions` で付与（`allowFileDiscovery=false` — 検索には出ずリンク保持者のみ）
- 外部実検証（未認証・ログインなし）: フォルダ表示 HTTP 200・配下 PDF の `uc?export=download` が HTTP 200 で本文取得を確認（ファイルはフォルダ権限を継承）
- 旧版フォルダ `旧版-20260912`（ID `1oL6mKfjH-TY8TIKc_A647eGHTAFuAfak`）: 権限は domain reader + organizer のみで anyone 権限なし・未認証アクセスは 302（ログイン要求）を確認

## 部分再配布（2026-11-05・5冊）

`c8178aaf`（Refs #658）で5冊の教材本文へ注記ブロック（完成版との差異を読者へ説明する節）が入ったため、
対象5冊だけ `build_pdf_book.py` で組み直し、`rclone copyto` で同一 file ID の中身を更新した。
残り41件（他31冊PDF・ZIP・関連ファイル）は未変更。出自コミット: `bf0e3318`。

| PDF | Drive file ID | 旧 sha256（先頭12） | 新 sha256（先頭12） | 頁数 |
|---|---|---|---|---|
| day19_コメント編集・削除.pdf | `1fxqVw24Ib7a2g_AvXucqoAowi9aGtvnI` | `a532e9531a43` | `1c6971edd9d1` | 111→111 |
| day25_プロフィール編集.pdf | `1ZxIG1alOFSR758Rak5knuSA7A15gwcAj` | `cfdf565d6046` | `ddbb71ac7cf5` | 193→194 |
| day27_プロジェクト詳細・アーカイブを実装しよう.pdf | `16zGgynKmh0LG4wF5u7p2xrkm5yunRZIX` | `9927b37c1c03` | `b30b74f3ba47` | 120→120 |
| day28_タスク一括操作を実装しよう.pdf | `1gnCqq_w3xfJxrKoltDW7UMydml93Jy7v` | `5656fdaf9f6e` | `2ef3340330cd` | 137→137 |
| day29_ユーザー詳細・編集ページを作ろう.pdf | `1jxIONgRWWgaENJ1d3oE2OwQmG_uF7KPI` | `c83bf5499e64` | `f188c273d371` | 220→221 |

検査（`dist/pdf` を新5冊のみに絞って実行。出力上も「5冊/5 PDFs」と限定を確認）:

- `check_pdf_book.py --allow-gaps`: 5冊すべて商品として出せる状態
- `check_page_layout.py`: 5冊すべて紙面が崩れていません（表の断片の計測記録 5/5 冊）
- `check_inline_break.py`: 失敗カテゴリ4種すべて0件
- `verify_pdf_copy.py --allow-missing`: Poppler 抽出 9326/9326 行・5 PDFs で PASSED

配布後照合: `rclone cat` で再取得した sha256 がローカル生成物と全5件一致。
上書き前のリモート sha256 も旧値と一致（= 旧版が実際に配布されていたこと）を確認。
完全な記録は `release-manifest.json` の `redistributions` 節。前版は Drive の版管理履歴から復元可能。
