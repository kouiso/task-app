# PDF証拠検査

Round 3の実行結果は36/36冊合格、終了コード0です。
[全冊の結果](pdf-evidence-round-3.json)に記録しています。
生成HTML由来のインラインコード14,110箇所が一致しました。
このうち表内563箇所はPDF座標で照合しました。
列・セルの測定記録9,264件も検査対象です。

Claudeの実ビルドは36/36冊、終了コード0でした。
Claudeの別検査はトークン1,203件、分断0件です。
根拠は `dist/review-round-2/claude/candidate-build.log` と `table-check.log` です。
これは今回の14,110箇所とは集計範囲が異なります。
単体テストのモック出力は実PDFの証拠に含めません。

## 実行方法

リポジトリ直下で実行します。ブラウザは起動しません。

```sh
/usr/bin/python3 -m unittest discover -s doc/review-handoff -p test_pdf_evidence.py
/usr/bin/python3 doc/review-handoff/check_pdf_evidence.py --pdftotext /opt/homebrew/bin/pdftotext \
  --report dist/review-round-3/pdf-evidence-full.json \
  --summary doc/review-handoff/pdf-evidence-round-3.json
```

このMacではHomebrew Pythonのpyexpat読み込みに失敗しました。
上記のシステムPythonで単体テストと36冊の実検査が成功しています（単体テストは2026-09-24時点で38件）。
2026-09-25 JST にコミット f90afeabdb35d8308bcd0e80e2dc73f8de730467 で `/usr/bin/python3 -m unittest discover -s doc/review-handoff -p test_pdf_evidence.py` を実行し、`Ran 38 tests in 0.064s` / `OK` を確認しました。
全件の観測は約5MBあるため `dist/` に置き、`doc/` には要約だけを残します。
ほかの環境では、XMLを読めるPython 3とPopplerのpdftotextを指定してください。

## 検査内容

正本36冊は `scripts/pdf-book/pdf-link-map.json` から取得します。
`dist/.pdf-book-build/` のHTML、DOM監査、PDF監査、表構造が必要です。
ビルド時の結合記録で、原稿・PDF・監査・CSS・組版設定のハッシュを確認します。
古いPDF監査の転用や、共通CSSの作業用コピーの不一致も拒否します。

DOM監査の未対応項目は `post_pdf_text_and_geometry` だけを許します。
別工程のPDF監査が `pass`、問題一覧が空であることが条件です。
その監査と同じHTML用manifest、DOM報告、PDFであることも照合します。
別名の未対応項目、失敗、集計件数の不一致は拒否します。

通常本文は `pdftotext -layout` のページ内順序で照合します。
表は列の折り返しと中央寄せで抽出順が逆転するため、別に扱います。
`pdftotext -bbox-layout` の単語座標から、対象トークンの行群を取得します。
範囲はPDF監査の `selected.bbox` です。ページ全体からの順不同検索はしません。
このPDF監査はDOMのセル境界とコードの位置も検査しています。
同じ抽出文字を別のトークンへ使い回すことは禁止します。
パスの `/` と `.` の直後だけ改行を許し、途中の空白は除去しません。

通常表の列幅と本文セル幅、縦組みのdt/dd幅を報告します。
空・欠落・重複した通常表の測定値は拒否します。
本文セルは書体サイズに対して全角約10文字分の幅を求めます。
通常表の測定誤差許容は0.25pxです。

この検査は全ページの目視、コードの実コピー、公開承認を代替しません。
Round 2の旧JSONは当時の未完了記録として残しています。
