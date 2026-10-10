# Gate C 目視台帳(tip再検証) — day04_ネットに公開.pdf (50頁)

- 検査者: devin-87c010e81da1437aa9ceebcd1cb441df
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day04_ネットに公開.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド)
- SHA256照合: `427c6a1057e6`(先頭12桁 = manifest値・実測一致。頁数50も一致)
- 方法: poppler(pdftoppm)で全50頁を100dpi PNG化し1頁ずつ目視(28+22頁の2チャンク)。脚注所在はpdftotextで全頁洗い出し確認。
- 結果: **must 0件 / suggest 4件 / ok 46件**(全50/50頁検査済)
- 明細JSON: `gate-c/tip-day04-pages.json`

## 旧build(e39a1ce9) must の再検証結果

- **旧 must p4 図1(ローカル→GitHub→Vercel→公開URL): 解消**。4ノード全ラベル完読可能。
- **旧 must p5 図2(公開の前にそろえておくもの): 解消**。「GitHubにpush済み Day 03 で完了」「npm run buildが手元で通る」「環境変数2本 DATABASE_URLとJWT_SECRET」「VercelがDeploy」「公開URLが発行される」全ラベル完読可能。
- **旧 must p23 図4(.env→.env.example→Vercel Environment Variables→Neon): 解消**。「名前だけ写す」「同じ名前で登録する」「DATABASE_URL」「Neon の PostgreSQL」全ラベル完読可能。

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p15, p24, p34, p49
- **ok(note付き)**: p22, p29
- **ok**: 上記以外の全頁

## must(納品不可級)

なし。

## suggest(納品可だが修正推奨)

- **p15**: 脚注1 GitHub機密削除ドキュメントURLが裸URLのみ・語途中改行。
- **p24**: 脚注2-3(neon.tech / supabase.com)が裸URLのみ。
- **p34**: 脚注4 Vercel project削除ドキュメントURLが裸URLのみ。
- **p49**: 脚注5〜10が全て裸Google Drive URLのみ・語途中改行(次に読むもの節、他冊同型)。

## ok(note付き)

- p22: 下部約40%余白 / p29: 下部約60%余白

## 健全性

- ノンブル2-50連続・全頁ヘッダー帯あり・真っ白頁なし・コードブロック末尾切れなし
- 図3(p6 URL構造図)・図5(p30 ダッシュボードスクリーンショット)・図6(Step11以降のUI図版)ともクリップなし
- 奥付(p49)紺帯装飾は意図的(他冊と同一)
