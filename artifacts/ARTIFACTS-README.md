# SOURCE40 教材36PDF — 成果物（candidate/機械検査未完了）

**状態**: candidate。全36冊生成済み・バイナリ凍結。機械検査（check_pdf_book系）は
修正中のため未完了。検査側のみの修正で同一PDFのままなら目視やり直し不要。
内容が変わった冊は SHA256 差分で通知、共通組版変更なら全冊対象。

## 出処
- 正本: SOURCE40（kouiso/task-app `main`(51b2eb4d) とは別世代。差分台帳は
  `artifacts/SOURCE40-vs-main-ledger.md` 参照）
- 生成器: `scripts/pdf-book/build_pdf_book.py`（selective40統合+NFC/NFD正規化修正版）
- 生成ログ/受領: `artifacts/evidence/release-build-receipt.json`（built_at UTC記録）
- 環境: macOS / python3.12 / Vivliostyle CLI 11.1.0 / VFM 2.7.0 /
  theme-techbook 2.0.2 / Chrome
- 前提オプション: `PDF_BOOK_HANGING_SCOPE=scripts/pdf-book/selective-hanging-scope-current40.json`
  （10冊40フェンス対象の吊り下げ字下げ。既定OFF）＋
  `PDF_BOOK_LINK_MAP=dist/pdf-link-map.json`（本文内書誌リンク→Drive URL 解決）

## ファイル
- `artifacts/pdf/*.pdf` — 36冊（計3743ページ）
- `artifacts/evidence/pdf-manifest.json` — 各冊の絶対パス(生成環境)/ファイル名/
  ページ数/PDF SHA256/原稿MD名/原稿SHA256
- `artifacts/evidence/release-build-receipt.json` — リリースビルド受領
- `artifacts/evidence/pdf-link-map.json` / `pdf-link-map-collision-check.json`
  — 本文リンク→Drive ID 解決マップと衝突なし証明（58キー=36冊×NFC/NFD両形、36一意URL/ID）
- `artifacts/evidence/hanging-scope-test-{normal,O}.json` — selective40 VFM回帰
  実走JSON（skip=0。固定VFM 2.7.0=dist/.pdf-book-toolchain-test/node_modules/.bin/vfm、
  baseline code_wrap 同梱 `baseline-code_wrap.py` sha256=8c30ae69e5689e09…4e14a）

## 検査状況（candidate の理由）
- `check_pdf_book.py` は「検査側に生成側と同じNFC正規化が無かった」バグを
  修正中（document_id/glyph map title,path/provenance/expected_title 4箇所）。
  修正は検査側のみでPDFバイナリは不変。
- 並行調査中: ページ柱/ノンブルがベクターパス描画のため pdftotext 系
  家具検査が不適用かを判定中（MuPDF直接検査が権威側）。
