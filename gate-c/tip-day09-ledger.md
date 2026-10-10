# Gate C 目視台帳(tip再検証) — day09_プロジェクト一覧画面.pdf (86頁)

- 検査者: devin-8fcefb2b353645f4a4411adc9e263f8a
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day09_プロジェクト一覧画面.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365`(tip再ビルド)
- SHA256照合: 実測先頭12桁 `d90cb705069d` = `artifacts/evidence/pdf-manifest.json` 記載値(同commit上で照合)。頁数86も一致
- 方法: poppler(pdftoppm) で全86頁を100dpi PNG化し1頁ずつ目視。Mermaid図(p4図2・p29図5)は各ノードラベル・エッジを文字単位で照合確認
- 結果: **must 0件 / suggest 7件 / ok 79件**(全86/86頁検査済)
- 明細JSON: `gate-c/tip-day09-pages.json`
- 旧build台帳(e39a1ce9、別worker): `gate-c/day09-ledger.md` — 旧buildの判定はstale

## 旧build(e39a1ce9)との関係

### 旧 must の解消確認

- **p29 図5(プロジェクト取得の分岐)Mermaidノードラベル右端切断 → ✅解消**。
  tipでは全ノードラベルが完全描画: `/project を開く`・`if projectsLoading`・`スピナーを出す`・`カードを並べる`・`再読み込みの案内を出す`・ダイヤ`一覧のデータは届いたか`・エッジ`まだ`/`届いた`/`失敗`。
  旧buildで語途中切断だった3トークン(`/project を開`・`if projectsLoa`・`スピナーを出`)はいずれも完全形で描画され、macOS mermaid font-measure fixが当図にも効いたことを確認。

### 旧 suggest の推移

- 旧suggestの大半(16件)は**コード行頭割れ(hardwrap)**で、tipでも同型が残る: p12/p16/p21/p60/p62/p64/p67/p68/p73/p74/p75/p76/p77/p85 等。tip-*系列ではhardwrapを ok+note に格下げしているため、本台帳では suggest 計上せずok備考に記録。
- 継続suggest(同型再現): p22・p32のページ最下部hr孤立、p57の下部約75%白紙、p85/p86の脚注裸URL。
- **新規検出**: p81・p82の用語表セル内語中分割(`デザ|イン手法`)。旧buildでは表が完全描画と記録されていたためレイアウト変動由来。

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p22, p32, p57, p81, p82, p85, p86
- **ok(note付き)**: p5, p10, p12, p16, p21, p28, p34, p47, p48, p51, p60, p62, p64, p65, p67, p68, p70, p71, p72, p73, p74, p75, p76, p77, p84, p85(hardwrap)
- **ok**: 上記以外の全頁

## suggest(改善余地)

| 頁 | 指摘 |
|---|---|
| p22 | ページ最下部に区切り線hr孤立(Step見出しは次頁・旧build同型) |
| p32 | ページ最下部に区切り線hr孤立(仮実装note box後・旧build同型) |
| p57 | Before問題点箇条書き3項目のみで下部約75%白紙(After節が次頁開始・旧build同型) |
| p81 | 用語表セル内で語中分割:`画面幅に応じてレイアウトを変えるデザ|イン手法` |
| p82 | 同上の表続きセルでも語中分割(デザ|イン手法) |
| p85 | 脚注1が裸URL(drive.google.com)のみ+コード行頭割れ2箇所 |
| p86 | 脚注2〜6が全て裸URL(Google Drive)のみ(各URL語途中折返し) |

## ok備考(主なもの)

- hardwrap(コード継続行が行頭に割れる、内容欠損なし): p10, p12, p16, p21, p48, p51, p60, p62, p64, p67, p68, p73, p74, p75, p76, p77, p85
- 下部余白50〜65%: p5(約65%), p28(約55%), p34(約60%), p47(約55%), p65(約55%), p70〜72(約45〜50%), p84(約45%)

## 良好描画の確認例(実目視の証跡)

- **p4 図2**(シーケンス図): `プロジェクト一覧ページ`/`tRPC useQuery`/`サーバーAPI`/`データベース`の4要素と、`api.project.getAll.useQuery({ isArchived })`・`prisma.project.findMany()`・`プロジェクト配列`・`レスポンス`・`data, isLoading, error`の全ラベル完全
- **p29 図5**: 上記の通り旧must完全解消
- **p36 図6**・**p52 図8**・**p54 図9**: スクリーンショット3枚ともUI要素(サイドバー・カード・ボタン・狭幅レイアウト)完全描画
- **p78**: `export default function ProjectPage()` 完成コードのSuspense構成完全

## 傾向メモ

- tip再ビルドで当冊のMermaid切断(must)は**全解消**。残るsuggestはhr孤立・巨大余白・表セル語中分割・脚注裸URLという版組み由来の軽微なものに限定された。
- コード行頭割れ(hardwrap)は旧build同様に複数頁で残存するが内容欠損はなく、tip-*系列ではok+note扱い。
