# Gate C 目視台帳 — day07_ログイン体験を改善しよう.pdf (146頁)

- 検査者: devin-5e46fa7b625f4154a5eff435b71fda1d
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day07_ログイン体験を改善しよう.pdf` @ `devin/source40-pdf-artifacts` `e39a1ce9b7e3ea8dd7d922902f77af4c98741f07`
- SHA256照合: `69f92c674c6f`（先頭12桁 = 指定値・実測一致。pdf-manifest の頁数146・原稿sha256 `d0255667c618…` も一致）
- 方法: poppler(pdftoppm) で全146頁を100dpi PNG化し1頁ずつ目視（25頁×5+21頁の6チャンクで生成→目視→削除を繰返し）。must判定箇所は `material/30days-curriculum/day07_ログイン体験を改善しよう.md` のMermaid原文とラベル照合。抽出テキスト確認は不使用。
- 結果: **must 3件 / suggest 5件 / ok 138件**（全146/146頁検査済）
- 明細JSON: `gate-c/day07-pages.json`

## verdict 別ページ一覧

- **must**: p52, p75, p80
- **suggest**: p8, p9, p10, p145, p146
- **ok（note付き）**: p5, p12, p13, p14, p15, p17, p19, p24, p25, p27, p30, p34, p35, p40, p41, p42, p43, p44, p45, p46, p47, p48, p51, p59, p60, p61, p62, p63, p66, p67, p69, p73, p79, p86, p87, p94, p95, p96, p98, p99, p100, p101, p102, p103, p104, p105, p108, p109, p112, p113, p114, p115, p116, p117, p118, p119, p120, p125, p126, p127, p130, p131, p132, p134
- **ok**: 上記以外の全頁

## must（納品不可級）

いずれもday01 p13/p67・day03 p30・day04 p4/p5/p23・day05 p6/p39・day06 p6/p38と同型の「Mermaid flowchart ノード/エッジラベル右端クリップ」（組版パイプライン共通問題）。冊固有ではない。

### p52 図3 — 5箇所のラベル右端クリップ

`ログイン処理の流れ`(flowchart TD)で、否定的経路の終端ノードが軒並み途中切断:

| 表示 | あるべき表示 |
|---|---|
| `TOO MANY REQUES` | `TOO MANY REQUESTS`（TS欠落） |
| `UNAUTHORIZED エラ` | `UNAUTHORIZED エラー`（ー欠落） |
| `FORBIDDEN エラ` | `FORBIDDEN エラー`（ー欠落） |
| `JWT 生成 + Cookie {` | `JWT 生成 + Cookie 保存`（保存欠落・括り崩れ） |
| エッジ `Ye` | `Yes`（s欠落） |

エラー応答の3種類全てと成功系終端が判読不能。

### p75 図5 — エッジラベルのパス識別子クリップ

`middlewareとprotectedProcedureの2重ガード`(flowchart TB)で:

| 表示 | あるべき表示 |
|---|---|
| エッジ `API /api/trp` | `API /api/trpc/...`（c/...欠落・パス識別子が変化） |
| ノード `…駄目な ら UNAUTHORIZED を` | `…駄目なら UNAUTHORIZED を返す`（返す欠落） |

### p80 図6 — 約9箇所のラベルクリップ（本冊最大）

`middleware の判定フロー`(flowchart TD)で:

| 表示 | あるべき表示 |
|---|---|
| エッジ `Ye` ×4 | `Yes`（s欠落） |
| エッジ `Nc` ×4 | `No`（o欠落で「Nc」に化ける） |
| ノード `Cookie 削除 + /l` | `Cookie 削除 + /login`（ogin欠落） |
| 菱形 `tRPC API` / `Cookie あり` | `tRPC API？` / `Cookie あり？`（末尾「?」欠落） |

分岐の全エッジラベルが「Yes/No」を正しく表示できていない。day07の3図はいずれも右端クリップが複数箇所に及ぶ。

## suggest（納品可だが修正推奨）

| ページ | 内容 |
|---|---|
| p8 | 実装ステップ一覧表の「作業内容」セルが語途中折返し多発（`控えを取/り`、`session.t/s を作り直/す`）。day04 p12同型 |
| p9 | 同表の語途中折返し継続（`trpc.ts を/作り直す`、`auth.ts/を作り直す`、`middlew/are.ts`、`ログインし/て動作確認/する`）。同型 |
| p10 | 同表Step7セル `DevTool/s で JWT/と/Cookie/を確認する`。同型 |
| p145 | 脚注1〜5が裸URLのみ（Google Drive・`vie/w?usp=drivesdk` 語途中改行）。endnote式同型 |
| p146 | 脚注6が裸URLのみ（Google Drive）。同型 |

## 傾向メモ

- **コード折返し崩壊が本冊で最頻発**（note約40頁）。長い関数シグネチャ・import文・日本語メッセージ文字列が行頭に戻る続き行が全冊を通じて多い。読み取りは可能だが写経者が「行頭の残り」を正しく繋げるかに負荷がある。
- ページ末尾の大きな白紙（4〜8割）は約15頁。大半はコードブロック・図版の改頁不可ブロックの次頁送り。
- 用語表・API一覧表は正常。表の語途中折返しは実装ステップ一覧表（p8-10）に集中。
- **本冊固有の欠陥はなし。must3/suggest5 の全8件が既知の組版パイプライン共通問題の再現例。**
