# 検査エラー → 原因 → 最小修正 → 回帰結果 記録（SOURCE40 36PDF）

## E1. `override document_id is not in the canonical catalog`
- **エラー**: ビルド冒頭でピン留めカタログ（table-layout.json の
  day01-bf910a 等4件）が canonical catalog 不一致で拒否。
- **原因**: `work_slug(stem)` が stem をそのまま sha256。macOS の FS は
  NFD、ピン留めは NFC 生成環境 → dakuten 含む stem でハッシュがズレ。
- **修正**: `build_pdf_book.py` work_slug で `unicodedata.normalize("NFC", stem)`
  後にハッシュ。実体結合（sha256）は非接触。
- **回帰**: `test_work_slug_normalization.py` 3件 PASS（NFC/NFD両形式明示・
  36全stem・ピン留めカタログ⊂計算カタログ・day01→bf910a 一致）。

## E2. `margin title source不一致: <sha256>`（22冊）
- **エラー**: `loadMarginOutlineAssets` が
  `entry.title === expectedTitle` / path 末尾一致で照合し、22冊が失敗。
- **原因**: 同上。glyph map は NFC、macOS のファイル名は NFD。sha256 は一致
  （day01 で実例確認）→ 照合表現のみズレ。
- **修正**: `decorative-margin-outline.mjs` の title find / path endsWith /
  supportedTitles / DOM証跡 text / actualText を NFC 正規化照合へ。
  sha256・配置結合は据え置き。
- **回帰**: `decorative-margin-outline.test.mjs` に正例（NFD path/title で
  同一 source_sha256）+ 負例（`（別物）`タイトル / `material/other-dir/` 別配置
  を弾く）を追加、node --test 3件 PASS。失敗した22冊がそのまま組版通過。

## E3. `PDF_BOOK_LINK_MAP` 未解決 + `00-1` 未解決リンク
- **エラー**: `配布先が未登録` / MD 本文内の書誌リンクが Drive URL 未解決。
- **原因**: リンクマップ未同梱 + キーが NFD 名のみで MD 内 NFC 表記と不一致。
- **修正**: history の drive-current-link-inventory からマップ復元し、
  1冊につき NFC/NFD 両形キーを発行（58キー→36URL）。
- **回帰**: `pdf-link-map-collision-check.json` = `NO_COLLISION`
  （36一意URL・36一意file ID・衝突0）。既存共有リンクIDは読み取りのみ。

## E4. `test_hanging_scope.py` IndexError / NameError
- **エラー**: 未実行テストが存在しない `_markdown_fences` を参照。
  さらに duplicate_pre 負例が「先頭scope本は2行以上」を前提（day06=1行）で
  IndexError。
- **原因**: リファクタ時の参照残し + 暗黙の行数前提。
- **修正**: `hanging_scope._fences`（正準スキャナ）経由へ差替 +
  `selected_count >= 2` の本を選び、rendered texts を `resolve_with` へ渡す形へ。
- **回帰**: 通常/`python -O` 両方で実走 PASS。JSON:
  `{"books":10,"changed":40,"default_byte_exact":true,"message_checks":3,
  "minimum_font_pt":8,"negative_count":18,"pre_total":922,"safe_columns":58,
  "scope_sha256":"4857258f…a8","selected":40}`（skip=0）
  証拠: `evidence/hanging-scope-test-{normal,O}.json`
  固定VFM: `dist/.pdf-book-toolchain-test/node_modules/.bin/vfm` @2.7.0
  比較元: `evidence/baseline-code_wrap.py` sha256 `8c30ae69e5689e09…4e14a`
  （クラウド再実行: `PDF_BOOK_TEST_VFM_BIN=<pin> PDF_BOOK_BASELINE_CODE_WRAP=<同梱物> python3.12 scripts/pdf-book/test_hanging_scope.py`）

## E5. `outline DOM証跡が不正: ... .inline-layout.json が無い`（22冊）
- **エラー**: 修正後 checker が証跡を読めない。
- **原因**: `check_pdf_book.py` に work_slug の**独自コピー**が残っており
  NFC 修正が無く、生成側（NFC固定後）と別 document_id を探しに行く。
- **修正**: 同関数を生成側と同規則（NFC 正規化後ハッシュ）へ。
- **回帰**: `test_check_pdf_book.py` 145件 PASS + 新規NFC回帰（正例等価・
  負例別タイトル/別配置を弾く）。

## E6. `固定glyph mapの原稿path/title/SHA256が一致しない`（22冊）
- **エラー**: 証跡読込は直ったが glyph map との title/path 照合失敗。
- **原因**: checker が `entry.title == header`、`entry.path == expected` を
  生文字列比較。map（NFC）vs macOS stem（NFD）。
- **修正**: title_entries フィルタ・expected_title・provenance source_title の
  3照合を NFC 等価へ。sha256 照合は非接触。
- **回帰**: E5 の回帰ケースで正例/負例を実測。

## E7. `p*: 柱が無い / ノンブルが無い`（4650件）+ `原稿pathがglyph mapのsource-pinned一覧と一致しない`
- **エラー**: 全ページで柱/ノンブル欠落 + MuPDF直接検査不合格。
- **原因**: マージンはベクターパス描画（pdftotext抽出不能）で、設計どおり
  checker は DOM証跡→MuPDF直接検査へ切替。直接検査 `verify-margin-outline-pdf.mjs`
  内部の `entry.title === title` / path endsWith / 期待title が未正規化で
  ここだけ失敗 → text系4650件は直接検査失敗時の報告出力だった。
- **修正**: 同 mjs の title filter / path endsWith / 期待sequence の title を
  NFC 正規化照合へ。
- **回帰**: `check_pdf_book.py` 全冊実走 → `✅ 36冊すべて商品として出せる状態です`、
  `check_page_layout.py` → `✅ 36冊すべて紙面が崩れていません`。

## 機械検査最終結果（全36冊・この修正版checkerで実走）
- `check_pdf_book.py`: ✅ 36冊すべて商品として出せる状態
- `check_page_layout.py`: ✅ 36冊すべて紙面が崩れていません
- `test_check_pdf_book.py`: ✅ 145ケースすべて通過
- `verify_pdf_copy.py`: Poppler抽出 39658/39658 行 PASS（viewer実コピーは別途要）
- `test_work_slug_normalization.py`: 3 PASS
- `decorative-margin-outline.test.mjs`: 3 PASS（node --test）
- `test_hanging_scope.py`: normal/-O 両方 PASS（skip=0）
- ページ数計: 3743（manifest 参照）
