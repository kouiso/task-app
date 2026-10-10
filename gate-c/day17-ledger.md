# Gate C 目視台帳 — day17_自分のタスクページ.pdf (161頁)

- 検査者: devin-5fb0621981f244b199d515a943fe0387
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day17_自分のタスクページ.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365`
- SHA256照合: `5797ff5d4964`（先頭12桁 = 指定値・実測一致。pdf-manifest の頁数161・原稿sha256 も一致）
- ⚠ commit補足: 指示の固定commit `e39a1ce9` ではday14-18全冊のsha12が不一致だった。指定sha12が一致するブランチ先端 `5881e2f7`（"rebuild all 36 PDFs after macOS mermaid font-measure fix"）を対象とした。統括へ報告済み
- 方法: poppler(pdftoppm) で全161頁を100dpi PNG化し1頁ずつ目視（24頁チャンクで生成→目視→削除を繰返し）。抽出テキスト確認は不使用
- 結果: **must 0件 / suggest 1件 / ok 160件**（全161/161頁検査済）
- 明細JSON: `gate-c/day17-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p160
- **ok（note付き）**: p5, p46
- **ok**: 上記以外の全頁

## must（納品不可級）

なし。Mermaid図2件（p5 flowchart「マイタスクページの構成」、p46 flowchart「期限別グループ分岐」）はいずれも全ノードラベル完全・右端クリップ無し。旧組版の Mermaid クリップ問題は再発していない。

## suggest（納品可だが修正推奨）

### p160 — 奥付下部の脚注1〜6が全て裸URLのみ

奥付（第1版 2026年9月19日 / © 2026 磯貝光佑）の下部に、説明文なしの Google Drive 裸URL6件が並ぶ。`/vie` / `w?usp=drivesdk` など語途中改行。day14 p173・day15 p125・day16 p114 および day03/04/05 の既出指摘と同型のendnote式裸URL脚注（組版共通問題）。本冊では奥付ページに脚注が同居する点のみ配置が異なる。

## ok（note付き・参考記録）

- p5 図2（Mermaid flowchart「マイタスクページの構成」）: マイタスクページ→状態と期限で分類したグループ／ステータスTabs／プロジェクトフィルター→期限切れ・今日が期限・今後の予定・期限なし・完了済み・キャンセル済み、`api.task.getAll({assigneeId})` →TaskCard表示。全ラベル完全・右端クリップ無し
- p46 図4（Mermaid flowchart「期限別グループ分岐」）: tasks→status終了状態か→DONE→completed／CANCELLED→cancelled／どちらでもない→dueDateあるか→無い→noDueDate／有る→todayKeyと比べる→同じ→today・小さい→overdue・大きい→upcoming。全ラベル完全・右端クリップ無し
- コードブロックの長い行（JSX式・属性・条件式）は左端への hanging wrap 様式で継続（`&& (`・`PAGE_SIZE)`・`'all'>('all');` など）。全頁で文字欠落・崩壊は確認されず
- p3（目次続き）・p50・p131 など自然な改頁による疎ページあり。内容の欠落なし
