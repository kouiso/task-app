# Gate C 目視台帳 — day16_ステータス変更・時間記録.pdf (115頁)

- 検査者: devin-5fb0621981f244b199d515a943fe0387
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day16_ステータス変更・時間記録.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365`
- SHA256照合: `2a44003fc190`（先頭12桁 = 指定値・実測一致。pdf-manifest の頁数115・原稿sha256 も一致）
- ⚠ commit補足: 指示の固定commit `e39a1ce9` ではday14-18全冊のsha12が不一致だった。指定sha12が一致するブランチ先端 `5881e2f7`（"rebuild all 36 PDFs after macOS mermaid font-measure fix"）を対象とした。統括へ報告済み
- 方法: poppler(pdftoppm) で全115頁を100dpi PNG化し1頁ずつ目視（24頁チャンクで生成→目視→削除を繰返し）。抽出テキスト確認は不使用
- 結果: **must 0件 / suggest 3件 / ok 112件**（全115/115頁検査済）
- 明細JSON: `gate-c/day16-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p6, p114, p115
- **ok（note付き）**: p5, p42
- **ok**: 上記以外の全頁

## must（納品不可級）

なし。Mermaid図2件（p5 stateDiagram「タスクステータス遷移図」、p42 flowchart「時間記録の流れ」）はいずれも全ノードラベル完全・右端クリップ無し。旧組版の Mermaid クリップ問題は再発していない。

## suggest（納品可だが修正推奨）

### p6 — 概念表で関数名が語途中セル折返し

「ステータス変更・時間記録の概念」表で `mutateAsync` が `mutateAsy` / `nc` と語途中で折返し。文字欠落はないが、関数名を読者が写経する教材で誤読余地。day14 p8・day15 p7 と同型で、組版のセル幅・word-break 設定に由来する冊固有ではない問題。

### p114 — 「次に読むもの」脚注1〜5が全て裸URLのみ

脚注1〜5が説明文なしの Google Drive 裸URLのみで、`/vie` / `w?usp=drivesdk` など語途中改行。day14 p173・day15 p125 および day03/04/05 の既出指摘と同型のendnote式裸URL脚注（組版共通問題）。

### p115 — 脚注6の裸URLが奥付頁下部へ続きとして残存

p114の脚注一覧の末尾（脚注6）が奥付ページ下部へ孤立して続く。著作権表示の直後にURL断片が置かれ、書物としての体裁を乱す。組版共通問題の延長。

## ok（note付き・参考記録）

- p5 図2（Mermaid タスクステータス遷移図）: 全ラベル完全（タスク作成→TODO、作業開始→IN_PROGRESS、レビュー依頼→IN_REVIEW、レビュー承認→DONE、キャンセル→CANCELLED、一時停止→TODO、修正必要→IN_PROGRESS）
- p42 図4（Mermaid flowchart「時間記録の流れ」）: 入力1時間30分→hours*60+minutes→90→incrementで足す→DB 720→810→getAllで読む→formatMinutes→画面表示13h 30m。全ラベル完全・右端クリップ無し
- コードブロックの長い行（className属性・文字列リテラル・式）は左端への hanging wrap 様式で継続。全頁で文字欠落・崩壊は確認されず
