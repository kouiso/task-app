# Gate C 目視台帳 — day05_ログイン画面のUI.pdf (81頁)

- 検査者: devin-5e46fa7b625f4154a5eff435b71fda1d
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day05_ログイン画面のUI.pdf` @ `devin/source40-pdf-artifacts` `e39a1ce9b7e3ea8dd7d922902f77af4c98741f07`
- SHA256照合: `944b9a74fa53`（先頭12桁 = 指定値・実測一致。pdf-manifest の頁数81・原稿sha256 `b1e169627e56…` も一致）
- 方法: poppler(pdftoppm) で全81頁を100dpi PNG化し1頁ずつ目視（27頁×3チャンクで生成→目視→削除を繰返し）。must判定箇所は `material/30days-curriculum/day05_ログイン画面のUI.md` のMermaid原文とラベル照合。抽出テキスト確認は不使用。
- 結果: **must 2件 / suggest 2件 / ok 77件**（全81/81頁検査済）
- 明細JSON: `gate-c/day05-pages.json`

## verdict 別ページ一覧

- **must**: p6, p39
- **suggest**: p80, p81
- **ok（note付き）**: p5, p8, p10, p16, p20, p22, p29, p33, p52, p53, p55, p56, p57, p60, p62, p63, p64, p65, p67, p69, p73, p74, p78
- **ok**: 上記以外の全頁

## must（納品不可級）

全てday01 p13/p67・day03 p30・day04 p4/p5/p23と同型の「Mermaid flowchart ノード/エッジラベル右端クリップ」（SVG overflow系・組版パイプライン共通問題）。冊固有ではない。

### p6 図2 — 4ノードのラベル途中切断

`フォーム管理の仕組み`(flowchart TD)で、主フロー上のノードが軒並み途中切断:

| 表示 | あるべき表示 |
|---|---|
| `react-hook-formが値を` | `react-hook-formが値を管理` |
| `zodスキーマでバリデーショ ン` | `zodスキーマでバリデーション`（ンが分断折返し） |
| `onSubmit関数が実` | `onSubmit関数が実行` |
| `tRPC APIにデータ送イ` | `tRPC APIにデータ送信`（信が「イ」に化けて欠落） |

起点A『ユーザーが入力』と分岐C『送信ボタンを押す』・分岐先F『エラーメッセージを表示』のみ完全。バリデーション→API送信という本図の主目的経路が判読不能。

### p39 図6 — 識別子ノードのラベル右端クリップ

`flowchart LR`(エラー2系統の比較図)で:

| 表示 | あるべき表示 |
|---|---|
| `errors.en` | `errors.email` |
| `error st` | `error state` |

コード識別子（`errors.email`は教材コードの実プロパティ名）が別名に化けるため納品不可級。day04 p23の`DATABASE_UR`欠落と同型。

## suggest（納品可だが修正推奨）

### p80/p81 — 脚注1〜6が全て裸URLのみ

「次に読むもの」の参照先脚注1〜6が説明文なしのGoogle Drive裸URLのみで、全て `/vie / w?usp=drivesdk` や `p-6ry4RDlxBSyz` など語途中改行。day03 p59・day04 p15/p24/p34/p49同型のendnote式（組版共通問題）。p81は版権頁で末尾約6割白紙だが書籍末の自然な構成。

## 傾向メモ（冊横断の確認用）

- **白紙**: 改頁不可ブロック（コード/図）の次頁送りによる下部4〜6割白紙がp5/p10/p16/p20/p22/p29/p33/p52/p60/p62-p67/p74に頻発。本冊は「コードブロックを分割しない」方針が強く、ページ送りの空白コストが大きい。day04基準ではnote級。
- **コード折返し**: code_wrap.pyの長行折返しで、継続行が式の途中で行頭に来る箇所あり（p53/p55/p56/p57）。`{/* filepath: …(同じファ / イルの続き) */}`コメントの語途中折返しもp69以降繰返し。判読は可能。
- **表セル語途中折返し**: `zodResolve/r`(p8)、`@hookform/resolve/rs`(p10)、`バリデーショ/ン`(p78)。day04 p12同型。
- **本冊固有の欠陥はなし**（全て既知の組版共通問題の派生）。
