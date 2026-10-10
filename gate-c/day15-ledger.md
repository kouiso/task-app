# Gate C 目視台帳 — day15_タスク編集・削除.pdf (126頁)

- 検査者: devin-5fb0621981f244b199d515a943fe0387
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day15_タスク編集・削除.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365`
- SHA256照合: `dc24c93bbb4a`（先頭12桁 = 指定値・実測一致。pdf-manifest の頁数126・原稿sha256 も一致）
- ⚠ commit補足: 指示の固定commit `e39a1ce9` ではday14-18全冊のsha12が不一致だった。指定sha12が一致するブランチ先端 `5881e2f7`（"rebuild all 36 PDFs after macOS mermaid font-measure fix"）を対象とした。統括へ報告済み
- 方法: poppler(pdftoppm) で全126頁を100dpi PNG化し1頁ずつ目視（24頁チャンクで生成→目視→削除を繰返し）。抽出テキスト確認は不使用
- 結果: **must 0件 / suggest 3件 / ok 123件**（全126/126頁検査済）
- 明細JSON: `gate-c/day15-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p7, p27, p125
- **ok（note付き）**: p6, p10
- **ok**: 上記以外の全頁

## must（納品不可級）

なし。図2（p6 flowchart TD「編集・削除の流れ」）は全ノードラベル完全・右端クリップ無し。旧組版の Mermaid クリップ問題は再発していない。

## suggest（納品可だが修正推奨）

### p7 — 概念表でコンポーネント名が語途中セル折返し

「タスク編集・削除の概念」表で `DeleteConfirmDialog` が `DeleteConf` / `irmDialog` と語途中で折返し。文字欠落はないが、コンポーネント名を読者が写経する教材で誤読余地。day14 p8（`TASK_STATUS_LABELS` 折返し）と同型で、組版のセル幅・word-break 設定に由来する冊固有ではない問題。

### p27 — 頁末に孤立hr（水平線）のみ

Step 0 本文末の段落直後に区切り線のみが頁末へ残り、次頁（p28）は Step 1 見出しから開始。区切るはずの見出しと分離して置き去りになった孤立hr。

### p125 — 「次に読むもの」脚注1〜6が全て裸URLのみ

脚注1〜6が説明文なしの Google Drive 裸URLのみで、`/vie` / `w?usp=drivesdk` など語途中改行。day14 p173 および day03/04/05 の既出指摘と同型のendnote式裸URL脚注（組版共通問題）。

## ok（note付き・参考記録）

- p6 図2（flowchart TD「編集・削除の流れ」）: `handleEdit` → 「タスクデータを取得」→「TaskFormDataに変換」→「TaskDialog 編集モード で 開く」、`handleDelete` →「DeleteConfirmDialog を開く」→「確認」→`api.task.delete.mutate` 、「キャンセル」→「何もしない」、合流して「キャッシュ更新」。全ラベル完全・右端クリップ無し
- p10: 見出し「読む目安： 35分」が「読む目/安」で語途中折返し（欠落なし）
- コードブロックの長い行（文字列リテラル・属性・式）は左端への hanging wrap 様式で継続。全頁で文字欠落・崩壊は確認されず
