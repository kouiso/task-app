# Gate C 目視台帳 — day04_ネットに公開.pdf (50頁)

- 検査者: devin-71307ed510084c57ba42511370fd4760
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day04_ネットに公開.pdf` @ `devin/source40-pdf-artifacts` `e39a1ce9b7e3ea8dd7d922902f77af4c98741f07`
- SHA256照合: `57e06cdc379c`（先頭12桁 = 指定値・実測一致。pdf-manifest の頁数50・原稿sha256 `1df5d1504706…` も一致）
- 方法: poppler(pdftoppm) で全50頁を120dpi PNG化し1頁ずつ目視。p4/p5/p6は200dpiで再描画し拡大確認、`material/30days-curriculum/day04_ネットに公開.md` のMermaid原文とラベル照合。抽出テキスト確認は不使用。
- 結果: **must 3件 / suggest 6件 / ok 41件**（全50/50頁検査済）
- 明細JSON: `gate-c/day04-pages.json`

## verdict 別ページ一覧

- **must**: p4, p5, p23
- **suggest**: p6, p12, p15, p24, p34, p49
- **ok（note付き）**: p3, p22, p29, p50
- **ok**: 上記以外の全頁

## must（納品不可級）

全てday01 p13/p67・day03 p30と同型の「Mermaid flowchart ラベル右端クリップ」（SVG overflow系・組版パイプライン共通問題）。冊固有ではない。

### p4 図1 — 全ノードラベル途中切断

`ローカルの task-app → GitHub → Vercel → 公開URL` の流れ図で:

| 表示 | あるべき表示 |
|---|---|
| `ローカルの task-a` | `ローカルの task-app` |
| `GitHu` | `GitHub` |
| `Verc` | `Vercel` |
| `公開URL` | （正常） |

図の主目的である遷移先名3つが判読不能。

### p5 図2 — Deploy条件ノードのラベル切断

| 表示 | あるべき表示 |
|---|---|
| `GitHub に push :` | `GitHub に push 済み` |
| `npm run buil` | `npm run build が` |
| `Vercel が Deρ` | `Vercel が Deploy` |

`Day 03 で完了`・`手元で通る`・`環境変数 2本 DATABASE_URL と JWT_SECRET`・`公開 URL が発行される` は完全。

### p23 図4 — .env流れ図のラベル切断

| 表示 | あるべき表示 |
|---|---|
| `GitHub へは送らな` | `GitHub へは送らない` |
| `DATABASE_UR`（エッジラベル） | `DATABASE_URL` |
| `Neon の Postgre` | `Neon の PostgreSQL` |

本図の核心情報（接続先 `DATABASE_URL`→`Neon の PostgreSQL`）が判読不能。

## suggest（改善余地）

| 頁 | 指摘 |
|---|---|
| p6 | 図3の語尾1字クリップ: `Step 5 で自分が決め`(原文 決める)/`Vercel が付け`(原文 付ける)。同型だが語義は判読可能 |
| p12 | 頁末尾に孤立hr(Step1見出しが次頁送りで区切り線のみ残置)。表Step10セル `Pro/パターン` 語途中折返し(note併記) |
| p15 | 脚注1が裸URLのみで語途中改行(`data-s`/`ecure`) |
| p24 | 脚注2・3が裸URLのみ(https://neon.tech / https://supabase.com) |
| p34 | 脚注4が裸URLのみ(vercel.com managing-projects) |
| p49 | 脚注5〜10が全て裸URL(Google Drive)のみ、各URLが `view?`/`usp=drivesdk` で折返し |

## note（備考・verdict=ok）

- p3: 目次末尾で残り約6割白紙（章末の自然な空白）
- p22: 下部約4割強白紙（図4が次頁送りの改頁不可ブロック）
- p29: 下部約5割白紙（次セクションが次頁）
- p50: 版権頁・残り約8割白紙（書籍末の自然な構成）

## 良好描画の確認例（実目視の証跡）

- **p30 図5**（Day 02ダッシュボードのスクショ図）: ブラウザ枠付きの `localhost:3000/dashboard` 画面、「こんにちは、磯貝さん」のメッセージカードまで完全に描画。クリップなし
- **p46 今日学んだ用語表**: Vercel/デプロイ/ビルド/Production Deploy/環境変数/接続文字列/Neon/シークレットウィンドウの8行が全て枠内に収まり、表のはみ出しなし
- **p11-12 ステップ一覧表**: Step 1-12 の2列×12行が欠落なく描画
