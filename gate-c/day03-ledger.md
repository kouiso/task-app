# Gate C 目視台帳 — day03_GitHubに保存する.pdf (60頁)

- 検査者: devin-3d804a549fae479a866996cc2f39affa
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day03_GitHubに保存する.pdf` @ `devin/source40-pdf-artifacts` `e39a1ce9b7e3ea8dd7d922902f77af4c98741f07`
- SHA256照合: `d4ffcaec4b1746b4e04994992e440bf1dd8abc7493c9fdd0a1c8ba7e29e0ca57`（先頭12桁 `d4ffcaec4b17` = 指定値・実測一致。pdf-manifest の頁数60・原稿sha256 `f083816f377f…` も一致）
- 方法: PyMuPDF で全60頁を120dpi PNG化し1頁ずつ目視。要所(p30図2・p45図4・p58末尾)は240/200dpiで再描画して拡大確認。抽出テキスト確認は不使用。
- 結果: **must 1件 / suggest 12件 / ok 47件**（全60/60頁検査済）
- 明細JSON: `gate-c/day03-pages.json`

## verdict 別ページ一覧

- **must**: p30
- **suggest**: p11, p17, p24, p25, p28, p37, p39, p43, p45, p50, p58, p59
- **ok（note付き）**: p3, p29, p33, p35, p41
- **ok**: 上記以外の全頁

## must（納品不可級）

### p30 図2 — Mermaid流れ図の全ラベルが右端クリップ（既知Mermaid共通問題）

「作業ツリー → ステージ → ローカルの履歴 → GitHub」の流れ図で、**エッジラベル3つと終端ノードが全て右端で切れている**:

| 表示 | あるべき表示 |
|---|---|
| `git ad` | `git add` |
| `git comr` | `git commit` |
| `git pu` | `git push` |
| `GitHu`（ノード） | `GitHub` |

ノード自体の日本語ラベル（作業ツリー/ステージ/ローカルの履歴）は完全に描画されているが、**この図の主目的である「コマンドの流れ」を示すラベルが全て読めない**。Day01 p13/p67で既出のMermaid右端クリップ（エッジラベル背景ボックス内でテキストが途切れるSVG overflow系）と同型。冊固有ではなく組版パイプライン共通問題と判断。

## suggest（改善余地）

| 頁 | 指摘 |
|---|---|
| p11 | 脚注1が裸URLのみ `https://git-scm.com/install/`（説明文なし） |
| p17 | 「編集アンカー」見出し+1段落のみで下部約7割が白紙（READMEコードブロックが改ページで後送り） |
| p24 | 脚注2が裸URLのみ `https://brew.sh` |
| p25 | 脚注3・4が裸URLのみ（docs.brew.sh / github.com/cli/cli） |
| p28 | 期待する表示コードブロックで `task-app.git (` / `fetch)` `push)` と括弧途中で折返し（端末出力1行が2行に割れる） |
| p37 | 脚注5が裸URLのみでパス途中改行（`.../email-preferences/` + `setting-your-commit-email-address`） |
| p39 | コードブロック+1段落で下部約5割強が白紙（図3が次頁送り） |
| p43 | push出力ブロックで `Writing objects: 100% (18/18), 3.10 KiB | 3.10 MiB/s,` が `done.` で折返し（p28と同型のコードブロック折返し） |
| p45 | 図4(GitHubファイル一覧スクショ)右端でコミットメッセージ列がグリフ途中クリップ: `feat: add AI assistant config (Gemini, De` / `refactor: add useRef hook to ImageUplo` / README見出しも語途中。**この冊固有**（画像はみ出し系。ファイル名列は読める） |
| p50 | 脚注6が裸URLのみで語途中改行（`data-s`/`ecure`） |
| p58 | ページ末尾に孤立hr（「次に読むもの」見出し前の区切り線が単独で最下部に残る） |
| p59 | 脚注7〜12が全て裸URL(Google Drive)のみ、各URLが `view?`/`usp=drivesdk` で折返し |

## note（備考・verdict=ok）

- p3: 目次末尾で残り約6割白紙（章末の自然な空白）
- p29: 下部約4割白紙（図2が次頁送り）
- p33: 下部約4割白紙
- p35: 下部約3〜4割白紙
- p41: 下部約3割白紙

## 良好描画の確認例（実目視の証跡）

- **p14 図1**（`git status -sb` の読み方）: `## main`/` M package.json`/` M src/`/`?? prisma/`/`?? doc/` 各出力行と右側6個の色付き注釈ボックスが全て完全に描画。クリップなし
- **p40 図3**（コミット後の3つの確認）: 「ローカルの履歴」「ステージ」「作業ツリー」3列カードレイアウト+緑チェックマーク帯が完全に描画。クリップなし
- **p9-10 工程表**: Step 1〜10の表が頁またぎでヘッダー繰返し付き完全描画。はみ出しなし
- **p56 用語表**: 8行の表が右端まで完全描画
- **p45 図4**: ファイル名列(.vscode/public/src/.coderabbit.yaml/README.md等)は全行判読可能

## 区分まとめ

- **既知Mermaid共通問題（組版パイプライン起因）**: p30 図2（Day01既出と同型）
- **この冊固有**: p45 図4の右端グリフ切れ、p28/p43のコードブロック折返し、p58孤立hr、各裸URL脚注（p11,24,25,37,50,59は全冊共通仕様の可能性あり）
