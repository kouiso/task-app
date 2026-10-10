# Gate C 目視台帳 — day18_コメント投稿.pdf (105頁)

- 検査者: devin-5fb0621981f244b199d515a943fe0387
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day18_コメント投稿.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365`
- SHA256照合: `a0046b83155e`（先頭12桁 = 指定値・実測一致。pdf-manifest の頁数105・原稿sha256 も一致）
- ⚠ commit補足: 指示の固定commit `e39a1ce9` ではday14-18全冊のsha12が不一致だった。指定sha12が一致するブランチ先端 `5881e2f7`（"rebuild all 36 PDFs after macOS mermaid font-measure fix"）を対象とした。統括へ報告済み
- 方法: poppler(pdftoppm) で全105頁を100dpi PNG化し1頁ずつ目視（24頁チャンクで生成→目視→削除を繰返し）。抽出テキスト確認は不使用
- 結果: **must 0件 / suggest 2件 / ok 103件**（全105/105頁検査済）
- 明細JSON: `gate-c/day18-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p104, p105
- **ok（note付き）**: p6
- **ok**: 上記以外の全頁

## must（納品不可級）

なし。Mermaid図1件（p6 flowchart「コメント機能の構成」）は全ノードラベル完全・右端クリップ無し。旧組版の Mermaid クリップ問題は再発していない。

## suggest（納品可だが修正推奨）

### p104 — 「次に読むもの」の脚注1〜3が全て裸URLのみ

「前の日: Day 17*1 / 次の日: Day 19*2 / 全体の地図: 学びのロードマップ*3」の脚注3件が、説明文なしの Google Drive 裸URLのみ。`/vie` `w?usp=drivesdk` の語途中改行あり。day14 p173・day15 p125・day16 p114-115・day17 p160 と同型の endnote 式裸URL脚注（組版共通問題）。

### p105 — 奥付ページ下部の脚注4〜6が全て裸URLのみ

奥付（Day 18 / 磯貝光佑 / 第1版 2026年9月19日 / © 2026 磯貝光佑）の下部に、目次・トラブルシューティング・用語集への Google Drive 裸URL3件が続く。day16 p114-115・day17 p160 と同じく、脚注が奥付ページに流れ込む配置（組版共通問題）。

## ok（note付き・参考記録）

- p6 図2（Mermaid flowchart「コメント機能の構成」）: タスクカードをクリック→TaskDetailDialog→コメント投稿フォーム→api.comment.create→キャッシュ更新 invalidate→api.task.getById で取得→コメント一覧表示。全ラベル完全・右端クリップ無し
- コードブロック（comment.ts router、task-detail-dialog.tsx の JSX 完成版 1/23〜23/23、root.ts 登録）は長い行を左端への hanging wrap 様式で継続（`src={` 継続・`commentForm.watch('content').trim() ||` 等）。全頁で文字欠落・崩壊は確認されず
- p5・p10・p29 など自然な改頁による疎ページあり。内容の欠落なし
- p36 図3・p57 図4（コメント投稿フォーム・一覧のスクリーンショット）は鮮明、はみ出しなし
