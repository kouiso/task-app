# Gate C 目視台帳 — day14_タスク新規作成.pdf (174頁)

- 検査者: devin-5fb0621981f244b199d515a943fe0387
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day14_タスク新規作成.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365`
- SHA256照合: `9768cb91a72e`（先頭12桁 = 指定値・実測一致。pdf-manifest の頁数174・原稿sha256 も一致）
- ⚠ commit補足: 指示の固定commit `e39a1ce9` ではday14-18全冊のsha12が不一致だった。指定sha12が一致するブランチ先端 `5881e2f7`（"rebuild all 36 PDFs after macOS mermaid font-measure fix"）を対象とした。統括へ報告済み
- 方法: poppler(pdftoppm) で全174頁を100dpi PNG化し1頁ずつ目視（24頁チャンクで生成→目視→削除を繰返し）。抽出テキスト確認は不使用
- 結果: **must 0件 / suggest 2件 / ok 172件**（全174/174頁検査済）
- 明細JSON: `gate-c/day14-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p8, p173
- **ok（note付き）**: p6, p10, p12, p15, p16, p17
- **ok**: 上記以外の全頁

## must（納品不可級）

なし。旧組版で多発していた「Mermaid flowchart ノード/エッジラベル右端クリップ」は、本冊のMermaid図3件（p6 flowchart TD, p15 sequenceDiagram, ほか）いずれも再発せず。font-measure fix が効いている。

## suggest（納品可だが修正推奨）

### p8 — 概念表で定数名が語途中セル折返し

「タスクの概念」表で `TASK_STATUS_LABELS` が `TASK_STAT` / `US_LABELS`、`nativeEnum` が `nativeEnu` / `m` と語途中で折返し。文字欠落はないが、定数名を読者が写経する教材で誤読余地（`TASK_STAT US_LABELS` と読み違える恐れ）。組版のセル幅・word-break 設定の問題で冊固有ではない。

### p173 — 脚注1〜6が全て裸URLのみ

「次に読むもの」の参照先脚注1〜6が説明文なしのGoogle Drive裸URLのみで、全て `/vie` / `w?usp=drivesdk` や `p-6ry4RDlxBSyz` など語途中改行。day03 p59・day04 p15/p24/p34/p49・day05 p80/p81 と同型のendnote式裸URL脚注（組版共通問題）。

## ok（note付き・参考記録）

- p6 図2（flowchart TD「タスク作成の流れ」）: 全ノードラベル完全・右端クリップ無し。菱形ノード内「送信後に入力を変えていな/いか」は語途中折返しだが文字欠落なし
- p10: 見出し「読む目安： 25分」が「読/む目安」で語途中折返し（欠落なし）
- p12, p16: コードの型引数（`Array<{ id: string }>>`、`Pick<Prisma.TransactionClient, 'projectMember'>`）が行跨ぎ折返し。hanging wrap 様式内で判読可
- p15 図3（sequenceDiagram「positionの衝突」）: 全メッセージラベル完全（「FOR UPDATE でロックを取る」「最大値 3 を読み、position に 4 を付ける」等）
- p17, p50, p54, p98, p100, p102: 下半分の大きな余白（自然な改頁・コードブロック分割回避によるもの）
