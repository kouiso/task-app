# Gate C 目視台帳(tip検証) — 00-1_学びのロードマップ.pdf (7頁)

- 検査者: devin-fc85e1e5e2e749e2a7aaa1c0f4dbc94a
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/00-1_学びのロードマップ.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド・mermaid font-measure fix後)
- SHA256照合: `5576d7683a8c`(先頭12桁 = manifest値・実測一致。pdf-manifestの頁数7も一致)
- 方法: poppler(pdftoppm)で全7頁を100dpi PNG化し1頁ずつ目視(7頁×1チャンク)。
- 結果: **must 0件 / suggest 1件 / ok 6件**(全7/7頁検査済)
- 明細JSON: `gate-c/tip-00-1-roadmap-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p3
- **ok**: p1, p2, p4, p5, p6, p7

## must(納品不可級)

なし。

## suggest(納品可だが修正推奨)

- **p3**: 脚注1-2が裸URLのみ(Google Drive共有リンク・`vie`/`w?usp=drivesdk`で語途中改行)。説明文なしのURL単体脚注で、他冊と同型のendnote式組版共通問題。

## 健全性

- 目次5項目の頁番号と実頁一致(8つの局面→p3 / 技術のつながり→p5 / 大きな2つの周回・進め方のコツ→p6 / 奥付→p7 を実頁で確認)
- ノンブル2-7連続・全頁ヘッダー帯あり・真っ白頁なし
- 「8つの局面」表(p4-5)・「技術のつながり」表(p5-6)とも全行描画・セル内文字欠落なし・跨ぎページで表頭行が正しく再掲
- 奥付(タイトル/著者 磯貝光佑/第1版 2026年9月19日/© 2026)完読
