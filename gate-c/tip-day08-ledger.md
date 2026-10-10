# Gate C 目視台帳(tip再検証) — day08_サイドバーを完成させよう.pdf (85頁)

- 検査者: devin-8fcefb2b353645f4a4411adc9e263f8a
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day08_サイドバーを完成させよう.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド)
- SHA256照合: `581d4e00346e`(先頭12桁 = manifest値・実測一致。頁数85も一致。manifest の file 名はNFD記述だが同一ファイル)
- 方法: poppler(pdftoppm)で全85頁を100dpi PNG化し1頁ずつ目視(28+28+29頁の3チャンクで生成→目視)。トフ疑い箇所は200dpi再描画で確認。Mermaid判定は `material/30days-curriculum/day08_サイドバー付きのアプリレイアウトを作ろう.md` の原文ラベルと照合。
- 結果: **must 0件 / suggest 6件 / ok 79件**(全85/85頁検査済)
- 明細JSON: `gate-c/tip-day08-pages.json`

## 旧build(e39a1ce9)との関係

- 旧: must 4(p5,p9,p15,p38 = Mermaidノード/エッジ右端クリップ) / suggest 3 / ok 78
- **tip: must 0 — 旧must全4件解消。** font-measure fix の効果を全図で実機確認:
  - 図2「今日作る構造」(p5): `layout.tsx`・`Providers`・`dashboard/page.tsx`・`AppLayout`・`サイドバー`・`メインコンテンツ`・`ナビゲーション`・`ユーザー情報`・`ログアウトボタン`・`ページの中身(children)` 全ノード完読可能(旧: `layout.t`/`Provide`/`dashboard/pa`/`AppLayo` と切断)。
  - 図3 tRPC呼び出し経路(p9): `api.auth.login.mutate`・`HTTP POST /api/trpc`・`JSON`・`TRPCReactProvider`・`tRPC サーバー`・`data` 全エッジ/ノード完読可能(旧: `mutate`→`m`、`/api/trpc`→`/api` 等4箇所切断)。
  - 図4「AppLayout の判定フロー」(p15): `AppLayout マウント`・`セッション取得中?`・`Yes`×2・`No`×2・`ログイン済み?`・`/login にリダイレクト`・`ローディング表示` 全ラベル完読可能(旧: `マウン`/`Ye`/`Nc` と切断)。
  - 図6「Providers → 各ページの構成」(tip版はp37へ1頁前移動): `src/app/layout.tsx (Providers)`・`dashboard/page.tsx`・`login/page.tsx`・`register/page.tsx`・`AppLayout`・`Day 02 で作った dashboard の中身` 全ノード完読可能(旧p38: `(P`/`pa`/`pac` 等5箇所切断)。

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p6, p7, p8, p27, p58, p84
- **ok(note付き)**: p9-14, p20-22, p24, p28-31, p33, p34, p36, p38-40, p46-50, p54-57, p59-66, p69-78
- **ok**: 上記以外の全頁

## must(納品不可級)

なし。

## suggest(納品可だが修正推奨)

| ページ | 内容 |
|---|---|
| p6 | 概念表 `useMutatio/n` 語途中折返し(旧p7同型・頁ずれでp6へ移動) |
| p7 | ステップ表 `provide/rs.tsx`・`Provide/r が囲ん/でいるか読む` 語途中折返し(旧同型) |
| p8 | 同表続行 `AppLay/out`×3・`ダッシュ/ボードに`・`ログインし/て` 語途中折返し(旧同型) |
| p27 | **新規**: コードコメント `{/* ロゴ */}` が `{/* □ゴ */}` — カタカナ「ロ」のみ欠落トフ(200dpi確認)。同じブロックの `{/* サイドバー */}` は正常。コードフォントの「ロ」グリフ欠落。直前後の文脈から「ロゴ」と推測可能だが組版不良 |
| p58 | 同じ `{/* ロゴ */}` → `{/* □ゴ */}` トフ(完成版コード再掲箇所・p27と同型2箇所目) |
| p84 | 脚注1〜6が全て裸URLのみ(Google Drive・`vie`/`w?usp=drivesdk` 語途中改行)。endnote式同型(旧p84同型) |

## ok(note付き)の支配パターン

- **コード行 hard wrap**(className文字列・filepathコメント・`React.ReactNode`・`isPending` 等が継続行頭へ割れる): p10,12,13,20-22,24,29-31,33,34,36,39,47,48,50,54-57,60,62,64,65,69,70,72-75,77,78 — 旧台帳「note約30頁」と同規模の既知パイプライン問題。追読可能。
- **巨大余白**(下部50〜80%白紙・ブロック後送り): p9,11,12,14,19,28,32,38,40,49,59,61,63,71,76
- 図5 sequenceDiagram(p26)は全ラベル完全。図1/図7/図8/図9のスクショは完全描画。

## 傾向メモ

- **本冊の旧must4件(Mermaidクリップ)はtip版で全解消** — 4/4図とも全ラベル完読可能。クリップは font-measure 不具合由来だったことが確定。
- **新規所見「ロ」トフ**: コードブロック内コメント `{/* ロゴ */}` のカタカナ「ロ」のみが □ 化(p27・p58の2箇所)。他のカタカナ列(サイドバー/ユーザー情報/ナビゲーション等)は同一フォントで正常描画されるため、「ロ」単独のグリフ欠落と思われる。原稿側の文字コード異常(NFC/NFD等)の可能性もあり、パイプライン調査対象として記録。
- 表セルの語途中折返し・裸URL脚注・コード hardwrap は全て旧台帳と同型の組版共通問題。本冊固有の不良は「ロ」トフのみ。
