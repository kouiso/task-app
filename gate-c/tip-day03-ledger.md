# Gate C 目視台帳(tip再検証) — day03_GitHubに保存する.pdf (60頁)

- 検査者: devin-87c010e81da1437aa9ceebcd1cb441df
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day03_GitHubに保存する.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド)
- SHA256照合: `2e3726d03802`(先頭12桁 = manifest値・実測一致。頁数60も一致)
- 方法: poppler(pdftoppm)で全60頁を100dpi PNG化し1頁ずつ目視(30頁×2の2チャンク)。脚注所在はpdftotextで全頁洗い出し確認。
- 結果: **must 0件 / suggest 7件 / ok 53件**(全60/60頁検査済)
- 明細JSON: `gate-c/tip-day03-pages.json`

## 旧build(e39a1ce9) must の再検証結果

- **旧 must p30 図2(作業ツリー→ステージ→ローカルの履歴→GitHub): 解消**。tip版では図が縦フロー構成で「作業ツリー いま編集したファイル」「ステージ 今回残すものの控え室」「ローカルの履歴 .git の中」「GitHub」の各ノードと「git add」「git commit」「git push」の全エッジラベルが完読可能。font-measure fix の効果を確認。

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p11, p17, p24, p25, p37, p50, p59
- **ok(note付き)**: p33, p38, p39
- **ok**: 上記以外の全頁

## must(納品不可級)

なし。

## suggest(納品可だが修正推奨)

- **p11 / p24 / p25 / p37 / p50**: 脚注が裸URLのみ(参考文献名なし、endnote式同型)。p50は`/account-and-data-s`/`ecure/`で語途中改行。
- **p17**: 「編集アンカー」節直後に約75%空白(改頁不可ブロック由来、day01 p23/day02 p30同型)。
- **p59**: 脚注7〜12が全て裸Google Drive URLのみ・語途中改行(次に読むもの節、day01 p81-82/day02 p69同型)。

## ok(note付き)

- p33: 下部約60%余白 / p38: 下部約45%余白 / p39: 下部約60%余白

## 健全性

- ノンブル2-60連続・全頁ヘッダー帯あり・真っ白頁なし・コードブロック末尾切れなし
- 図3(p40)整形図・図4(p45)GitHub UIスクリーンショットともクリップなし(図4はREADME上端のみ切り出す意図的トリミング。キャプションと一致)
- 奥付(p59)紺帯装飾は意図的(他冊と同一)
