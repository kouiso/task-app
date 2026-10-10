# Gate C 目視台帳(tip再検証) — day01_開発環境を整えて、初めてのアプリを動かそう.pdf (82頁)

- 検査者: devin-87c010e81da1437aa9ceebcd1cb441df
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day01_開発環境を整えて、初めてのアプリを動かそう.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド・mermaid font-measure fix後)
- SHA256照合: `c1f5c906d303`(先頭12桁 = manifest値・実測一致。pdf-manifestの頁数82も一致)
- 方法: poppler(pdftoppm)で全82頁を100dpi PNG化し1頁ずつ目視(28頁×2+26頁の3チャンクで生成→目視)。疑義箇所は原稿mdと照合。
- 結果: **must 0件 / suggest 13件 / ok 69件**(全82/82頁検査済)
- 明細JSON: `gate-c/tip-day01-pages.json`

## 旧build(e39a1ce9)からの変化

- **旧must p13 図2 — 解消**: 「あなたのパソコン」「Node.js 22.12.0 以上 23 未満」「Docker」「npm」「task-app npm run dev」「DATABASE_URL」「PostgreSQL」全ノードラベルが完読可能。旧buildの`Dock(`/`npr`/`DATABASE_UR`切断は消失。
- **旧must p67 図5 — 解消**: 「src/app/page.tsx → /」「src/app/dashboard/page.tsx → /dashboard」「src/app/login/page.tsx Day 05 で作る → /login」全ラベル完読。旧buildの`src/app/paɢ`/`/dashbo`切断は消失。
- 半白頁パターン(pp.43,45,47,49,51,65,70)と脚注裸URL×19は組版共通の既知問題として継続(悪化・改善ともになし)。
- p23 の約7割空白は継続(改頁不可ログブロック由来)。

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p3, p7, p8, p9, p10, p11, p12, p15, p22, p23, p35, p81, p82
- **ok(note付き)**: p18, p37, p43, p45, p47, p49, p51, p65, p70
- **ok**: 上記以外の全頁

## must(納品不可級)

なし。旧buildでmustだった2箇所(p13図2・p67図5のMermaidラベル右端クリップ)はmacOS font-measure fixにより全ラベル完読へ改善。

## suggest(納品可だが修正推奨)

全て既知の組版パイプライン共通問題(裸URL脚注・大余白)。冊固有欠陥なし。

- **裸URL脚注(endnote式)**: p3(脚注1), p7(脚注2-3), p8(脚注4), p9(脚注5-6), p10(脚注7-9), p11(脚注10), p12(脚注11), p15(脚注12), p22(脚注13), p35(脚注14), p81(脚注15-18), p82(脚注19) — いずれも説明文なしのURL単体脚注。Google Drive系は`vie`/`w?usp=drivesdk`で語途中改行。旧buildと同一の19件構成。
- **p23**: 「ターミナル出力」見出し後に約7割空白(改頁不可ログブロックが次頁送り。内容欠落なし)。

## ok(note付き)

- p18: 下部約3割余白
- p37: 下部約6割半白
- p43, p45, p47, p49, p51, p65, p70: 半白頁パターン(内容欠落なし・旧build記録の同型)

## 健全性

- 目次17項目の頁番号と実頁一致(検査時に複数頁で確認)
- ノンブル2-82連続・全頁ヘッダー帯あり・真っ白頁なし
- 図版(ダッシュボード実写・図1/図2/図5/図6)全て描画・コードブロック末尾切れなし
- Mermaid図2(p13)・図5(p67)ラベル完全描画を画像上で確認
