# Gate C 目視台帳 — day08_サイドバー付きのアプリレイアウトを作ろう.pdf (85頁)

- 検査者: devin-5e46fa7b625f4154a5eff435b71fda1d
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day08_サイドバー付きのアプリレイアウトを作ろう.pdf` @ `devin/source40-pdf-artifacts` `e39a1ce9b7e3ea8dd7d922902f77af4c98741f07`
- SHA256照合: `6f834c97a3d6`（先頭12桁 = 指定値・実測一致。pdf-manifest の頁数85・原稿sha256 `e1ac9093bb51…` も一致）
- 方法: poppler(pdftoppm) で全85頁を100dpi PNG化し1頁ずつ目視（25頁×3+10頁の4チャンクで生成→目視→削除を繰返し）。must判定箇所は `material/30days-curriculum/day08_サイドバー付きのアプリレイアウトを作ろう.md` のMermaid原文とラベル照合。抽出テキスト確認は不使用。
- 結果: **must 4件 / suggest 3件 / ok 78件**（全85/85頁検査済）
- 明細JSON: `gate-c/day08-pages.json`

## verdict 別ページ一覧

- **must**: p5, p9, p15, p38
- **suggest**: p7, p8, p84
- **ok（note付き）**: p10, p11, p12, p13, p14, p19, p20, p21, p22, p24, p27, p28, p29, p30, p31, p32, p33, p34, p35, p36, p37, p39, p40, p47, p49, p50, p54, p55, p56, p57, p58, p59, p60, p61, p62, p63, p64, p65, p66, p69, p70, p71, p72, p73, p74, p75, p76, p77, p78
- **ok**: 上記以外の全頁

## must（納品不可級）

いずれもday01 p13/p67以降一貫している「Mermaid flowchart ノード/エッジラベル右端クリップ」（組版パイプライン共通問題）。冊固有ではない。本冊は4図中4図ともflowchartが被害を受けた頻度最多冊。

### p5 図2 — 4箇所のノード右端クリップ

`今日作る構造`(flowchart TD)で、ファイルパス識別子が途中切断:

| 表示 | あるべき表示 |
|---|---|
| `layout.t` | `layout.tsx`（sx欠落） |
| `Provide` | `Providers`（rs欠落） |
| `dashboard/pa` | `dashboard/page.tsx`（ge.tsx欠落） |
| `AppLayo` | `AppLayout`（ut欠落） |

ファイル名自体が読み取れないため、写経者が対象ファイルを誤認し得る。

### p9 図3 — 4箇所のラベルクリップ

tRPC呼び出し経路(flowchart LR)で:

| 表示 | あるべき表示 |
|---|---|
| エッジ `api.auth.login.m` | `api.auth.login.mutate`（utate欠落・API識別子変化） |
| エッジ `HTTP POST /api` | `HTTP POST /api/trpc`（/trpc欠落・パス変化） |
| ノード `TRPCReactProv` | `TRPCReactProvider`（ider欠落） |
| エッジ `dat` | `data`（a欠落） |

### p15 図4 — エッジ・ノードのクリップ

`AppLayout の判定フロー`(flowchart TD)で:

| 表示 | あるべき表示 |
|---|---|
| `AppLayout マウン` | `AppLayout マウント`（ト欠落） |
| エッジ `Ye` ×2 | `Yes`（s欠落） |
| エッジ `Nc` ×2 | `No`（o欠落で「Nc」に化ける） |

### p38 図6 — 5箇所のノードクリップ（本冊最多）

`Providers → 各ページの構成`(flowchart TD)で、全ファイルパス系ノードがクリップ:

| 表示 | あるべき表示 |
|---|---|
| `src/app/layout.tsx (P` | `src/app/layout.tsx (Providers)`（roviders)欠落） |
| `dashboard/pa` | `dashboard/page.tsx`（ge.tsx欠落） |
| `login/page` | `login/page.tsx`（.tsx欠落） |
| `register/pac` | `register/page.tsx`（ge.tsx欠落） |
| `AppLayo` | `AppLayout`（ut欠落） |

## suggest（納品可だが修正推奨）

| ページ | 内容 |
|---|---|
| p7 | 概念表『useMutatio/n』＋実装ステップ表『provide/rs.tsx』『Provide/r が囲ん/でいるか読む』が語途中折返し。day07 p8-10同型 |
| p8 | 同表続行『AppLay/out を作/る』『ダッシュ/ボードに/AppLay/out を適/用する』『ログインし/て全体の/動作を確/認する』。同型 |
| p84 | 脚注1〜6が裸URLのみ（Google Drive・`vie/w?usp=drivesdk` 語途中改行）。endnote式同型 |

## 傾向メモ

- **flowchart被害率が本冊で最高**: 4つのflowchartのうち4つすべてで複数箇所のラベル右端クリップが発生。ファイルパス識別子（`layout.t`/`dashboard/pa`/`AppLayo`等）のクリップが目立ち、写経者が対象ファイルを誤認する実害が大きい。sequenceDiagram（p26）はクリップなし。
- **コード折返し崩壊（className文字列の途中改行）が全冊を通じて最頻発**（note約30頁）。`className="grid gap-4 bg-secondary` → 次行冒頭 `px-8 py-6 md:grid-cols-3">` のような続きが行頭に戻るパターンが大量。読み取りは可能だが写経負荷が高い。filepathコメント分断（`{/* filepath: src/app/...(同 じファイルの続き) */}`）も常態化。
- ページ末尾の大きな白紙（5〜7割）は約12頁。改頁不可ブロックの次頁送り。
- **本冊固有の欠陥はなし。must4/suggest3 の全7件が既知の組版パイプライン共通問題の再現例。**
