# 第3回レビュー回答

検査器の2点を修正し、既存PDFで36/36冊が合格しました。
再ビルドは不要です。ビルダー、book.css、教材Markdownは変更していません。
変更は検査器・テスト・引き継ぎ資料だけです。

## 修正と結果

- `post_pdf_text_and_geometry` だけを別工程へ委ねる項目として扱います。PDF監査の成功、空の問題一覧、入力ハッシュ一致を要求します。ほかの未対応項目や失敗は通しません。
- 表内はPDF監査のトークン座標に対応する行群で照合します。ページ内の単調なカーソルを使いません。別の範囲にある同名語や、同じ抽出文字の二重使用は拒否します。
- 未対応項目、折り返した第2列と中央寄せの第1列、誤った座標、重複使用をfixtureで検査しました。修正前の失敗は `dist/review-round-3/test-before.log` にあります。

| 実行した検査 | 結果 | 証拠 |
|---|---|---|
| unittest | 28件成功 | `dist/review-round-3/test-final.log` |
| 既存36冊の検査 | 36/36合格、終了コード0 | `dist/review-round-3/check-system-python.log` |
| インラインコード | 14,110箇所一致、うち表内563箇所を座標照合 | [全冊報告](pdf-evidence-round-3.json) |
| 独立ソースレビュー | 指摘なし | `dist/review-round-3/independent-review.md` |

失敗した冊子はありません。列・セルの測定記録は9,264件です。
Claudeの1,203件・分断0件は、別検査の結果として区別しました。
Homebrew Pythonはpyexpatの読込エラーで停止しました。
システムPythonへ切り替えて上記検査を完了しました。
実行方法は [pdf-evidence.md](pdf-evidence.md) に記載しています。

## Claudeへ残す確認

ブラウザ、再組版、PNGの目視、Docker、全日スナップショットは今回実行していません。
`dist/review-round-2/claude/table-pages/sweep.md` は読込時点で存在しませんでした。
全表ページの総評と、予定されているスナップショット結果を追記してください。
この検査器も同じ手順で再実行してください。

今回の差分はstageへ渡せます。stage・commitはしていません。
`dist/` と `_tmp-*` はstage対象から除外してください。
2回連続で指摘ゼロとなる判定やDrive更新は、まだ行っていません。

## 今回の変更ファイルと行範囲

| ファイル | 行範囲 | 内容 |
|---|---|---|
| `doc/review-handoff/check_pdf_evidence.py` | 14、46–146、315–336 | 名前を限定した判定、座標抽出、表内照合、実行経路 |
| `doc/review-handoff/test_pdf_evidence.py` | 68–108、136–138 | 3つの回帰テストと監査fixture |
| `doc/review-handoff/pdf-evidence.md` | 1–54 | 実結果、手順、検査範囲 |
| `doc/review-handoff/pdf-evidence-round-3.json` | 1–201426 | 36冊の実検査結果 |
| `doc/review-handoff/adversarial-round-3.md` | 1–45 | この回答 |
