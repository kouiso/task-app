# Gate C 目視台帳 — day09_プロジェクト一覧画面.pdf (86頁)

- 検査者: devin-772a3657897443cbab48d3ea9d2f6cd8
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day09_プロジェクト一覧画面.pdf` @ `devin/source40-pdf-artifacts` `e39a1ce9b7e3ea8dd7d922902f77af4c98741f07`
- SHA256照合: `db326a9a626f37d6cc8e2b2b1e…`（先頭12桁 `db326a9a626f` = 指定値・実測一致。pdf-manifest の頁数86も一致）
- 方法: poppler(pdftoppm) で全86頁を120dpi PNG化し1頁ずつ目視。p29のMermaid図は220dpiで再描画して拡大確認。抽出テキスト確認は不使用。
- 結果: **must 1件 / suggest 22件 / ok 63件**（全86/86頁検査済）
- 明細JSON: `gate-c/day09-pages.json`

## verdict 別ページ一覧

- **must**: p29
- **suggest**: p12, p16, p21, p22, p32, p34, p48, p51, p57, p60, p62, p64, p67, p68, p72, p73, p74, p75, p76, p77, p85, p86
- **ok（note付き）**: p5, p25, p39, p42, p44, p47, p61, p65, p66, p69, p70, p71, p80, p84
- **ok**: 上記以外の全頁

## must（納品不可級）

### p29 図5 — Mermaidフローチャートのノードラベルが右端で語途中切断（既知Mermaid共通問題）

「プロジェクト取得の分岐」フローチャートで、**2ノード計3トークンがノード枠の右端で語途中切断**（120dpiで検出→220dpi拡大確認）:

| 表示 | あるべき表示（推定） |
|---|---|
| `/project を開` | `/project を開く` |
| `if projectsLoa` | `if projectsLoading` |
| `スピナーを出` | `スピナーを出す` |

- `projectsLoa` は実在しない識別子として表示され、直前頁(p24-26)で実装させた `projectsLoading` と食い違う。
- 分岐ダイヤ `一覧のデータは届いたか`・右ノード `再読み込みの案内を出す`・中央ノード `カードを並べる`・エッジラベル `まだ`/`届いた`/`失敗` は完全描画。
- day01 p13/p67・day03 p30と同型の **組版パイプライン共通問題**（Mermaidノードラベル右端SVG overflow）。冊固有ではない。

## suggest（改善余地）

大半は**同一パターンのコード折返し**: コードブロック内で長い行が幅を超え、継続行がブロック左端（行頭・インデント喪失）へ割れるハード折返し。day03 p28/p43と同型。

| 頁 | 指摘 |
|---|---|
| p12 | `if (input?.userId && input.userId !==`→`ctx.session.userId) {` が行頭へ割れる |
| p16 | import `createTRPCRouter } from`→`'./trpc';`、`createCallerFactory(`→`appRouter);` が行頭へ割れる(2箇所) |
| p21 | ページ最下部で import `} from`→`'lucide-react';` が行頭へ割れる |
| p22 | 確認ポイント後の区切り線がページ最下部に孤立（Step 2見出しは次頁） |
| p32 | 仮実装note box後の区切り線がページ最下部に孤立（Step 6見出しは次頁） |
| p34 | 続きのコードブロックが改ページ後送りで下部約65〜70%白紙 |
| p48 | `continue;`・`doneCount++;` が行頭へ割れる(2箇所) |
| p51 | 三項演算子真側 `'アーカイブ済みのプロジェクトはありません。'` が行頭へ割れる |
| p57 | 「このコードの問題点」3項目のみで下部約70%白紙（After節が次頁開始） |
| p60 | import `} from`→`'lucide-react';` が行頭へ割れる(p21と同じimport再掲) |
| p62 | import `protectedProcedure } from`→`'../trpc';` が行頭へ割れる |
| p64 | `input.userId !==`→`ctx.session.userId)` が行頭へ割れる(p12と同じ判定コード完成版) |
| p67 | `'./trpc';`・`appRouter);` が行頭へ割れる(p16と同じroot.ts再掲) |
| p68 | import 2行 `'@/component/project/project-card';`・`'@/component/ui/loading-spinner';` が行頭へ割れる |
| p72 | `projectAccessDenied)) {` が行頭へ割れる |
| p73 | `justify-between">`・`tracking-tight">`・filepathコメント `同じフ`→`ァイルの続き` が行頭へ割れる(3箇所・語途中含む) |
| p74 | `&& !projectAccessDenied && (`・`text-destructive">` が行頭へ割れる(2箇所) |
| p75 | filepathコメント `同じフアイ`→`ルの続き`(語途中切断)・`lg:grid-cols-3 xl:grid-cols-4">`・`continue;`・`doneCount++;` が行頭へ割れる(4箇所) |
| p76 | `memberCount={... ??`→`0}` が行頭へ割れる |
| p77 | className2段・三項演算子両分岐が行頭へ割れる(4箇所) |
| p85 | `'./trpc';`・`appRouter);` 行頭割れ + 脚注1が裸URL(Drive)のみで `vie`/`w?usp=` 語途中折返し |
| p86 | 脚注2〜6が全て裸URL(Google Drive)のみ、各 `vie`/`w?usp=drivesdk` 語途中折返し |

## note（備考・verdict=ok）

- p5, p25, p34(本体はsuggest), p39, p42, p44, p47, p61, p65, p66, p69, p70, p71, p84: 下部3〜6割の白紙（節末・図やコードブロックの次頁送りによる自然な空白）
- p80: 「サイドバーが二重に表示される」項目の「原因」ラベルのみが最下部に残り本文は次頁

## 良好描画の確認例（実目視の証跡）

- **p4 図2**（プロジェクト取得のシーケンス図）: `プロジェクト一覧ページ`/`tRPC useQuery`/`サーバーAPI`/`データベース` の4要素と全エッジラベルが完全描画。クリップなし
- **p36 図6**（アーカイブ表示ONのスクリーンショット）: サイドバー・空のカード枠・ヘッダの「新規プロジェクト」ボタンまで実UIの通り完全に描画
- **p52 図8**: `/project` の実画面（グリッド2枚のプロジェクトカード・タスク件数・丸形編集/削除ボタン）が完全描画
- **p81 用語表**: `useQuery`/`Suspense`/`グリッドレイアウト` 3行すべて完全描画
