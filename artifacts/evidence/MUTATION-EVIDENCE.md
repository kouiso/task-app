# 変異テスト証拠（mutation testing）

方針: 実装側のNFC正規化を隔離コピーで除去し、テスト/実処理がFAILになることを実測。
「変異適用→FAIL→戻してPASS」のログを残す。

## check_pdf_book.py（4箇所のNFC正規化を除去）
対象: work_slug / glyph-map title+path / expected_title / provenance.source_title
- 変異後 `test_check_pdf_book.py` → **2件FAIL**:
  - `work_slug が NFD/NFC で別 document_id を返す`
  - `NFC回帰: NFD実ファイル+NFC glyph mapの等価証跡を拒否した`
- 復元後 → 145ケース全PASS
- ログ: `py-mutation-evidence.log`

回帰テスト自体は `find_outline_receipt_problems`/`work_slug` の本体を
実fixture（NFD実ファイル×NFC glyph map）で直接呼ぶ形に置換済み
（以前の normalize同士の比較は削除）。負例4件: 別title/別path/別sha256/provenance欠落。

## verify-margin-outline-pdf.mjs（4箇所のNFC正規化を除去）
対象: normalizedTitle / matchingTitle filter / expectedTail / path.endsWith
- `--title` に NFD 形式の margin title を渡した実PDF(day01)検査:
  - 現行コード → `result: pass`（inputs.title はNFDのまま記録）
  - 変異後 → `Error: p2: title DOM証跡が一意でないか文字列が不正`
  - 復元後 → `result: pass`
- ログ: `mjs-mutation-evidence.log`
