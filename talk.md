task-appの教材がまだ未完成です。
redmine-cloneよりもさらに完璧な教材を作るための計画を立てて下さい。

/home/kouiso/develop/intern/task-app/material/sample/Python基礎知識ガイド.pdf
/home/kouiso/develop/intern/task-app/material/sample/tkinter基礎知識ガイド.pdf

見本はこのPDFが正解です

しかしこのPDFが読み取りづらければ、マークダウン化するなどの工夫が必要です。

redmine-cloneの時の反省点。

- stepbystepなのに書き起こしをするAIが怠けて怠惰で工程をすっ飛ばしたりして、しょしんしゃにわかりずらいものとなってしまった。後解説の反映が一個一個でかい。

- 詳細な説明や分かりやすい説明をすべきなのにそれが満たされなかった。



- 文字ばかりで小説、大学の教科書、論文、文献かといわれてしまい、初心者が見てて頭が痛くなる。
Show more
まず、task-appの現状とredmine-cloneの教材、そしてサンプルPDFの内容を確認させてください。

Task:Explore task-app structure
IN
Explore the directory structure of /home/kouiso/develop/intern/task-app/ thoroughly. I need to understand:
1. The overall project structure
2. What's in the material/ directory (especially any existing educational content)
3. What's in the sample/ directory
4. Any existing markdown or documentation files
5. The source code structure (what the app actually does)

List all files and directories recursively, paying special attention to material/ and any docs.
良い情報が集まりました。次に、task-appの既存教材（day01〜03）と目次ファイルの内容を確認して、現状のクオリティと計画の詳細を把握します。

Read 00_カリキュラム目次.md
Read day01_環境構築基礎.md
既存教材の品質は確認できました。次に、PDFのスタイルとtask-appのカリキュラム全体構成をより深く理解するため、Plan agentで設計を行います。

Task:Design educational material plan
IN
You are designing an educational material creation plan for a "task-app" (Next.js full-stack task management application) that will be a 30-day curriculum for complete programming beginners.

## Context

### Current State
- A 30-day curriculum outline exists in `00_カリキュラム目次.md` with Days 1-30 mapped out
- Only Days 1-3 are currently written
- Days 4-30 need to be created

### Reference PDFs (The Gold Standard)
The sample PDFs (Python基礎知識ガイド.pdf and tkinter基礎知識ガイド.pdf) demonstrate the ideal format:
- **Heavy use of comparison tables** for presenting alternatives (2-3 columns)
- **Code examples with output** shown in separate boxes
- **Screenshots** of actual running applications
- **Progressive complexity**: simple examples → advanced patterns
- **Visual balance**: ~40% text, ~30% tables/visuals, ~30% code
- **Clear section numbering** with hierarchical structure
- **Definition boxes** for terminology
- **Professional but accessible** Japanese language

### Problems from Previous Project (redmine-clone) to AVOID
1. **Steps were skipped** - The AI was lazy and jumped over intermediate steps
2. **Explanations were too large/chunked** - Individual explanations were massive walls of text
3. **Text-heavy like a novel** - Too much prose, not enough visual aids
4. **Inconsistent step granularity** - Some steps take 3 min, others 20+ min
5. **Code blocks too large** - 150-200 line blocks without checkpoints
6. **Prerequisites assumed** - Setup steps came too late

### Existing Day 1-3 Format (Good Elements to Keep)
- Examples/analogies (料理のキッチン metaphor for dev environment)
- Step tables with time estimates
- OS-specific instructions (Windows/Mac)
- Verification checkpoints after each step
- Emoji usage for visual markers (🎯, 💡, ✅, etc.)

## Design Requirements

Create a detailed plan for producing Days 4-30 that:

1. **Format Specifications**:
   - Each day should be split into micro-steps (max 5-7 minutes each)
   - Every code block should be MAX 20-30 lines
   - After every code change, include a "確認ポイント" (verification checkpoint)
   - Use tables extensively (concept tables, comparison tables, option tables)
   - Include placeholder markers for screenshots [スクリーンショット: 〇〇の画面]
   - Balance: aim for 30% prose, 40% code/tables, 30% visual aids/checkpoints

2. **Anti-laziness Measures** (prevent AI from skipping steps):
   - Define explicit "atomic step" rules (1 file change per step, max)
   - Require intermediate compilation/run checks
   - No "以下のコードを書きます" followed by 100+ lines
   - Each step must have: Goal → Action → Verification → What You Learned

3. **Content Structure Per Day**:
   - 今日のゴール (clear visual of what's achieved)
   - なぜこれを学ぶのか (motivation with analogy)
   - 実装ステップ一覧 (overview table)
   - Individual steps with micro-checkpoints
   - 今日のまとめ (summary with checklist)
   - つまずきポイント (common errors table)

4. **Visual Aid Strategy**:
   - Mermaid diagrams for architecture/flow
   - Tables for comparisons and options
   - Code diff format for changes (showing before/after)
   - Callout boxes for tips, warnings, definitions
   - Screenshot placeholders with exact descriptions

5. **Quality Control Rules**:
   - Max paragraph length: 3 sentences
   - Technical terms MUST have a parenthetical Japanese explanation on first use
   - Every new concept needs an analogy
   - Code comments in Japanese
   - No step should reference code that hasn't been shown yet

Please provide a comprehensive implementation plan including:
- Template structure for each day
- Specific content outline for Days 4-30
- Quality checklist for each day's content
- Anti-pattern list (things to explicitly avoid)
- Estimated word count / line count per day
非常に詳細な設計が得られました。最後に、quality ruleのファイルを確認してから最終計画を作成します。

Read SKILL.md
Read SKILL.md (lines 101-300)
全ての情報が揃いました。最終計画を書きます。

Write shiny-churning-hare.md
228 lines
# task-app 30日間教材 完全作成計画

## 現状把握

- **完成済み**: Day 1〜3（環境構築、Hello World、DB基礎）
- **未作成**: Day 4〜30（27日分）
- **目次**: `material/30days-curriculum/00_カリキュラム目次.md` に30日分の構成が定義済み
- **見本PDF**: Python基礎知識ガイド / tkinter基礎知識ガイド（表・コード・スクショのバランスが理想）

## redmine-clone の反省点と対策

| 問題 | 原因 | 対策 |
|------|------|------|
| ステップ飛ばし | AIが「同様に」で省略 | 1ステップ1ファイル変更、全コード明示 |
| 文字ばかり | 解説が長文 | 最大3文ルール、表・図で置き換え |
| 教科書的 | 説明→コードの一方通行 | コード先行型、解説は表形式に |
| 反映がデカい | 1回の変更量が巨大 | コードブロック上限25行 |
| 初心者にわかりづらい | 前提知識の暗黙要求 | 新概念は必ず例え話＋表で導入 |

## PDFスタイルの取り込み

見本PDFの特徴を教材に反映する:

1. **比較表の多用**: 概念の対比は必ず表形式（2〜3列）
2. **コード＋出力セット**: コードブロックの直後に実行結果を明示
3. **スクリーンショット位置指定**: `[スクリーンショット: 〇〇の画面]` を各ステップ末尾に
4. **段階的複雑化**: 簡単な例→実際のコード の2段構成
5. **定義ボックス**: 新用語は `> 🎯 **定義**:` で囲む
6. **視覚バランス目標**: テキスト30% / 表・図30% / コード40%

## 1日あたりのテンプレート構造

```markdown
# Day XX: [タイトル]

## 🎯 今日のゴール
[2文以内 + 完成イメージのスクリーンショット]

## 🤔 なぜこれを学ぶのか？
[1段落 + 例え話ブロック引用]

## 📊 実装ステップ一覧
[ステップ表: 番号/内容/所要時間]

---

### Step N: [タイトル]（X分）
🎯 ゴール: [1文]
🔰 解説: [最大3文]
💻 実装:
  - filepath付きコードブロック（上限25行）
🔍 コード解説表: [コード|意味|例え]
✅ 確認ポイント: [操作→期待結果]
📝 学んだこと: [1文]

---

## 📋 今日のまとめ
- 理解度チェックリスト
- 学んだ概念の表

## ⚠️ つまずきポイント
[エラー|原因|解決方法 の表]

## 🔜 次回の予告
```

## 品質ルール（絶対遵守）

### コード関連
- コードブロック上限: **25行**（超過時は分割）
- 全コードブロックに `// filepath:` コメント必須
- 全コードブロック直後に **確認ポイント** 必須
- 日本語コメント必須
- コピペで100%動作保証

### テキスト関連
- 段落上限: **3文**（超過時は表に変換）
- 新概念初出時: 必ず（日本語説明）を括弧書き
- 新概念: 必ず例え話付き
- 「同様に」「残りも」「以下略」→ **絶対禁止**
- 「簡単です」「すぐできます」→ **禁止**

### 構造関連
- 1ステップ = 1ファイル変更（最大）
- 1ステップ = 3〜7分
- 1日 = 7〜12ステップ
- 新概念 = 1日3つまで
- 新規ファイル = 1日5つまで
- 表 = 1日4つ以上
- スクショ位置 = 1日3箇所以上

## Day 4〜30 コンテンツアウトライン

### Phase 1: 土台完成（Day 4-5）

**Day 4: TypeScript基礎知識**（9ステップ）
- 基本型（string/number/boolean）→ interface → enum → 実コード読み

**Day 5: Next.js基礎構造**（8ステップ）
- App Router → page.tsx/layout.tsx → ルーティング → Server/Client Component

### Phase 2: ユーザー認証（Day 6-10）

**Day 6: 認証の仕組み理解**（7ステップ）
- セッション/クッキー → NextAuth.js → protectedProcedure

**Day 7: ユーザー登録前編（UI）**（9ステップ）
- MUI → TextField → react-hook-form → zod → Button

**Day 8: ユーザー登録後編（API）**（9ステップ）
- tRPCルーター → zodスキーマ → bcrypt → prisma.create

**Day 9: ログイン機能**（9ステップ）
- ログインフォーム → loginスキーマ → bcrypt.compare → セッション

**Day 10: 認証状態管理とログアウト**（7ステップ）
- getSession → protectedProcedure → ログアウト → ページ保護

### Phase 3: プロジェクト管理（Day 11-15）

**Day 11: データモデルの関係性**（7ステップ）
- リレーション → 1対多 → 多対多 → ER図

**Day 12: プロジェクト一覧画面**（8ステップ）
- AppLayout → AppBar → Drawer → 一覧API → カード表示

**Day 13: プロジェクト作成**（9ステップ）
- Dialog → フォーム → カラーピッカー → create API

**Day 14: プロジェクト編集・削除**（8ステップ）
- getById → 編集フォーム → update → 削除確認 → delete

**Day 15: メンバー管理**（7ステップ）
- addMember → ロール選択 → 一覧 → ロール変更 → 削除

### Phase 4: タスク管理（Day 16-20）

**Day 16: タスク一覧画面**（9ステップ）
- getAll API → フィルタ → ソート → テーブルUI → バッジ

**Day 17: タスク作成**（9ステップ）
- ダイアログ → フィールド群 → DatePicker → create API

**Day 18: タスク詳細・編集**（8ステップ）
- getById → カード表示 → 編集モード → update → 楽観的更新

**Day 19: ステータスとタイマー**（8ステップ）
- 状態遷移図 → ステータス変更 → startTimer → stopTimer → UI

**Day 20: マイタスクページ**（8ステップ）
- 担当フィルタ → 期限強調 → 今日/今週セクション → ソート

### Phase 5: コラボレーション（Day 21-23）

**Day 21: コメント機能前編**（8ステップ）
- getByTaskId → リスト表示 → 投稿フォーム → create API

**Day 22: コメント機能後編**（8ステップ）
- 編集UI → update → 削除確認 → delete → 権限チェック

**Day 23: 検索・フィルタリング**（9ステップ）
- searchAPI → 全文検索 → フィルタUI → URLパラメータ同期

### Phase 6: レポート（Day 24-26）

**Day 24: ダッシュボード**（8ステップ）
- 統計API → カード → Grid配置 → レスポンシブ

**Day 25: チャート機能**（8ステップ）
- Recharts → PieChart → BarChart → LineChart → カスタマイズ

**Day 26: 週次レポート**（7ステップ）
- 期間指定 → 集計API → サマリー → プロジェクト別集計

### Phase 7: ユーザー管理（Day 27-28）

**Day 27: ユーザー管理**（8ステップ）
- isAdmin → 一覧API → 一覧UI → 詳細 → 有効化/無効化

**Day 28: プロフィール管理**（8ステップ）
- プロフィール表示 → 編集 → 更新API → パスワード変更

### Phase 8: 仕上げ（Day 29-30）

**Day 29: セキュリティとエラーハンドリング**（8ステップ）
- XSS → SQLi対策 → CSRF → TRPCError → グローバルエラー

**Day 30: テストとデプロイ準備**（9ステップ）
- Vitest → ユニットテスト → APIテスト → ビルド → 振り返り

## 制作フロー

### バッチ制作（Phase単位）

1. **対象ソースコード読み込み**: 該当Dayで扱うファイルを全て読む
2. **ステップ分割設計**: コードを25行以下のブロックに分割計画
3. **テンプレート展開**: 上記テンプレートに沿って全ステップ記述
4. **表・図追加**: 比較表、コード解説表、Mermaid図を追加
5. **品質チェック**: 全品質ルール項目を確認
6. **反スキップ監査**: 「同様に」「残りも」がないか最終確認

### 品質チェックリスト（各Day完了時）

- [ ] コードブロック全て25行以下
- [ ] 全ブロックにfilepath付き
- [ ] 全ブロック後に確認ポイント
- [ ] 段落3文以下
- [ ] 表4つ以上
- [ ] スクショ位置3箇所以上
- [ ] 新概念に例え話あり
- [ ] 「同様に」「以下略」なし
- [ ] ステップ7〜12個
- [ ] 各ステップ3〜7分

## 修正対象ファイル

- 新規作成: `material/30days-curriculum/day04_typescript基礎.md` 〜 `day30_テストとデプロイ.md`（27ファイル）
- 参照: `00_カリキュラム目次.md`（目次リンクの整合性確認）

## 検証方法

各Day完成後:
1. コードブロックをコピペして実際にファイル作成
2. `task dev` で開発サーバー起動
3. ブラウザで該当機能が動作することを確認
4. 品質チェックリスト全項目パス確認
計画を作成しました。いくつか確認させてください。

AskUserQuestion
OUT
User has answered your questions: "SKILL.mdでは「21日間」と定義されていますが、実際のカリキュラム目次は「30日間」構成です。どちらに合わせますか？"="一旦30日間で組んで、多すぎたらきりの良い日数に調整する", "サンプルPDFは読み取れましたが、教材の最終形式はどうしますか？"="結論から言うとsample dirのなかのきょうざいのようにwordからPDF変換したような感じにできるようにしたい。そのために以前はmarpからPDFに変換できるとおしゃれで見やすい教材が出来ると思ったが、marpはスライドを吐き出すのがメインの使い方だが、縦長の資料でも使うことが出来るか？出来るならmarpがいいと思う。後こういうふうにしたいという案がこのPRにあるのでこれを見て取り入れてほしいhttps://github.com/ritmo-inc/redmine-clone/pull/107　　そして最終的な案を提案してほしい", "教材作成の進め方として、どのバッチから開始しますか？"="最終的には全部作るけど、先にという意味であれば全Dayの骨格を先に作成". You can now continue with the user's answers in mind.
PRの内容とMarpの縦長資料対応について確認します。

Bash Get PR 107 details from redmine-clone repo
IN
gh pr view 107 --repo ritmo-inc/redmine-clone --json title,body,files

Web SearchMarp markdown presentation vertical document portrait A4 PDF export long document 2025 2026
OUT
Web search results for query: "Marp markdown presentation vertical document portrait A4 PDF export long document 2025 2026"

Links: [{"title":"PDF Export 9:16 Size · marp-team · Discussion #474","url":"https://github.com/orgs/marp-team/discussions/474"},{"title":"Marp: Markdown Presentation Ecosystem","url":"https://marp.app/"},{"title":"Marp: Crafting Beautiful Presentations with Markdown | by Dr. Shouke Wei | Medium","url":"https://medium.com/@shouke.wei/marp-crafting-beautiful-presentations-with-markdown-4ef86f5281a6"},{"title":"Use Marp to build a resume ? or A4 Document ? · marp-team · Discussion #370","url":"https://github.com/orgs/marp-team/discussions/370"},{"title":"Marp: A Markdown Presentation App That Simplifies Your Tech Talks - DEV Community","url":"https://dev.to/rprabhu/marp-a-markdown-presentation-app-that-simplifies-your-tech-talks-37m4"},{"title":"Marp - The simplest markdown presentation writer","url":"https://yhatt.github.io/marp/"},{"title":"Markdown for Slides","url":"https://joshghent.com/marp/"},{"title":"Marp, the markdown presentation ecosystem | Nicola Iarocci","url":"https://nicolaiarocci.com/marp-the-markdown-presentation-ecosystem/"},{"title":"Tutorial: Marp for VS Code - DEV Community","url":"https://dev.to/sc0v0ne/tutorial-marp-for-vs-code-5d6k"},{"title":"Bye-bye PowerPoint. Hello Marp! | 01","url":"https://vocal.media/01/bye-bye-power-point-hello-marp"}]

Here are the search results for your query about using Marp for vertical/portrait A4 PDF export for long documents:

## Key Findings

### Creating A4 Documents with Marp

There is a GitHub discussion asking whether it's possible to extend Marp to build an A4 document, like a resume or a simple A4 PDF document.(no content)The answer from the Marp team is: yes, you can create a custom theme CSS according to your purpose. The custom slide size can also be defined in the theme via the Marpit theme CSS documentation (https://marpit.marp.app/theme-css?id=slide-size).(no content)Related issues include "Use Marpit framework to create documents of A4/US Letter page sizes" (marpit#248) and "I can't figure out how to create vertical slides" (#356).

### Custom Theme for Portrait/Vertical Slides (9:16 or A4)

When using non-standard aspect ratios, users have noted that the aspect ratio is observed in the previewer, but when exporting to PDF or PPTX, slides are "printed" on an A4 sheet with whitespace.

The solution involves creating a custom theme CSS file. The step-by-step approach is: create a file called `theme.css`, save it in the same folder as your markdown presentation, and add CSS rules. For a 9:16 aspect ratio, the CSS would define `section { width: 360px; height: 640px; }`. Then configure VS Code's `markdown.marp.themes` setting with `./theme.css`.

For a proper **A4 portrait** size, you would adjust the CSS dimensions to match A4 proportions (210mm × 297mm or approximately 794px × 1123px at 96dpi):

```css
/* @theme a4portrait */
@import 'default';
section {
  width: 794px;
  height: 1123px;
}
```

### General Marp Capabilities

Marp (the Markdown Presentation Ecosystem) provides an intuitive experience for creating beautiful slide decks — you only have to focus on writing your story in a Markdown document.(no content)Marp supports exporting presentations in multiple formats such as HTML, PDF, and SVG.(no content)Marp CLI is a "simple but powerful CLI converter from Marp Markdown into PDF, HTML, PPTX, and images."

### Export Commands (CLI)

To export to PDF: `npx @marp-team/marp-cli@latest slides.md -o slides.pdf`

### Important Limitation

Note that Marp treats each `---` separator as a new "slide" (page). For long documents, each section separated by `---` becomes a separate page in the PDF. Marp is fundamentally a **slide-based** tool, so content won't flow across pages like a traditional document — each slide/page is independent. If you need a true long-form flowing document, you might want to combine Marp's A4 portrait approach with careful content splitting across slides, or consider other Markdown-to-PDF tools like Pandoc.


REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.
PRの具体的なファイルを確認します。

Bash List files in PR 107
IN
gh api repos/ritmo-inc/redmine-clone/pulls/107/files --jq '.[].filename'

OUT
.claude/instructions.md
.markdownlint.json
.textlintrc
TUTORIAL_SYSTEM.md
material/sample/Python基礎知識ガイド.md
package.json
prompt/prompt.md
scripts/check_no_skip.py
scripts/check_quality.sh
scripts/check_step_length.py
scripts/check_visualization.py
scripts/generate_html.sh
scripts/generate_pdf.sh
Bash Get generate_pdf.sh content from PR
IN
gh api repos/ritmo-inc/redmine-clone/pulls/107/files --jq '.[] | select(.filename == "scripts/generate_pdf.sh") | .patch'

Bash Get TUTORIAL_SYSTEM.md content from PR
IN
gh api repos/ritmo-inc/redmine-clone/pulls/107/files --jq '.[] | select(.filename == "TUTORIAL_SYSTEM.md") | .patch'

Bash Get generate_html.sh content from PR
IN
gh api repos/ritmo-inc/redmine-clone/pulls/107/files --jq '.[] | select(.filename == "scripts/generate_html.sh") | .patch'

OUT
@@ -0,0 +1,153 @@
+#!/bin/bash
+#
+# マークダウンからHTMLを生成するスクリプト
+#
+# 必要なツール:
+# - pandoc: sudo apt-get install pandoc
+#
+
+set -e
+
+# 色の定義
+RED='\033[0;31m'
+GREEN='\033[0;32m'
+YELLOW='\033[1;33m'
+NC='\033[0m' # No Color
+
+# 使い方
+if [ $# -lt 1 ]; then
+    echo "使い方: $0 <markdown_file> [output_html]"
+    echo "例: $0 material/01_setup_environment.md output/01_setup_environment.html"
+    exit 1
+fi
+
+MARKDOWN_FILE="$1"
+OUTPUT_HTML="${2:-${MARKDOWN_FILE%.md}.html}"
+
+if [ ! -f "$MARKDOWN_FILE" ]; then
+    echo -e "${RED}エラー: ファイルが見つかりません: $MARKDOWN_FILE${NC}"
+    exit 1
+fi
+
+# 出力ディレクトリを作成
+OUTPUT_DIR=$(dirname "$OUTPUT_HTML")
+mkdir -p "$OUTPUT_DIR"
+
+echo "========================================="
+echo "HTML生成開始"
+echo "入力ファイル: $MARKDOWN_FILE"
+echo "出力ファイル: $OUTPUT_HTML"
+echo "========================================="
+echo ""
+
+# Pandocがインストールされているかチェック
+if ! command -v pandoc &> /dev/null; then
+    echo -e "${RED}エラー: pandocがインストールされていません${NC}"
+    echo "インストール方法:"
+    echo "  Ubuntu/Debian: sudo apt-get install pandoc"
+    echo "  macOS: brew install pandoc"
+    exit 1
+fi
+
+# CSSスタイル
+CSS_STYLE='
+<style>
+body {
+    font-family: "Noto Sans CJK JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
+    line-height: 1.8;
+    max-width: 900px;
+    margin: 40px auto;
+    padding: 0 20px;
+    font-size: 16px;
+    color: #333;
+    background-color: #f5f5f5;
+}
+article {
+    background-color: white;
+    padding: 40px;
+    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
+    border-radius: 8px;
+}
+h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
+h2 { color: #34495e; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; margin-top: 40px; }
+h3 { color: #7f8c8d; margin-top: 30px; }
+code {
+    background-color: #282c34;
+    color: #abb2bf;
+    padding: 2px 6px;
+    border-radius: 3px;
+    font-family: "Consolas", "Monaco", "Courier New", monospace;
+    font-size: 14px;
+}
+pre {
+    background-color: #282c34;
+    color: #abb2bf;
+    padding: 16px;
+    border-radius: 6px;
+    overflow-x: auto;
+    line-height: 1.5;
+}
+pre code {
+    background-color: transparent;
+    padding: 0;
+}
+table {
+    width: 100%;
+    border-collapse: collapse;
+    margin: 20px 0;
+}
+table th {
+    background-color: #1e4d7b;
+    color: white;
+    padding: 12px;
+    text-align: left;
+}
+table td {
+    border: 1px solid #ddd;
+    padding: 10px;
+}
+table tr:nth-child(even) {
+    background-color: #f9f9f9;
+}
+blockquote {
+    border-left: 4px solid #3498db;
+    padding-left: 20px;
+    margin-left: 0;
+    color: #555;
+    font-style: italic;
+}
+a { color: #3498db; text-decoration: none; }
+a:hover { text-decoration: underline; }
+.toc { background-color: #ecf0f1; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
+</style>
+'
+
+# Pandocで HTML変換
+echo -e "${YELLOW}Pandocで変換中...${NC}"
+pandoc "$MARKDOWN_FILE" \
+    -o "$OUTPUT_HTML" \
+    --standalone \
+    --toc \
+    --toc-depth=3 \
+    --number-sections \
+    --highlight-style=tango \
+    --metadata title="Flask教材" \
+    --metadata charset="UTF-8" \
+    --include-in-header=<(echo "$CSS_STYLE") \
+    2>&1
+
+if [ $? -eq 0 ]; then
+    echo ""
+    echo "========================================="
+    echo -e "${GREEN}✅ HTML生成が完了しました！${NC}"
+    echo "出力先: $OUTPUT_HTML"
+    echo "ブラウザで開く: file://$(realpath "$OUTPUT_HTML")"
+    echo "========================================="
+    exit 0
+else
+    echo ""
+    echo "========================================="
+    echo -e "${RED}❌ HTML生成に失敗しました${NC}"
+    echo "========================================="
+    exit 1
+fi
Bash Get Python guide markdown from PR
IN
gh api repos/ritmo-inc/redmine-clone/pulls/107/files --jq '.[] | select(.filename == "material/sample/Python基礎知識ガイド.md") | .patch' | head -200

OUT
@@ -0,0 +1,813 @@
+# Python基礎知識ガイド
+
+プログラミング言語Pythonにおいて、最低限の基礎知識を解説するドキュメントです。
+さらに詳しく知りたい・理解したいという方は「Python 3 公式ドキュメント」を参照してください。
+詳細な仕様とコーディング例を確認できます。
+Pythonは海外発祥のプログラミング言語になりますが、公式ドキュメントは日本語に翻訳されているため読みやすく設計されています。
+
+**▼Python 3公式ドキュメント▼**
+https://docs.python.org/ja/3/
+
+---
+
+## 目次
+
+1. [Pythonの実行方法](#1-pythonの実行方法)
+   1. [インタープリタの起動](#11-インタープリタの起動)
+   2. [pythonファイルの実行](#12-pythonファイルの実行)
+2. [Pythonプログラムの基本構造](#2-pythonプログラムの基本構造)
+3. [基本データ型](#3-基本データ型)
+   1. [文字列データ](#31-文字列データ)
+   2. [数値データ](#32-数値データ)
+4. [コレクション](#4-コレクション)
+   1. [リスト](#41-リスト)
+   2. [タプル](#42-タプル)
+   3. [辞書](#43-辞書)
+5. [条件分岐](#5-条件分岐)
+6. [ループ](#6-ループ)
+   1. [for文](#61-for文)
+   2. [while文](#62-while文)
+7. [関数](#7-関数)
+8. [クラス](#8-クラス)
+9. [モジュールとパッケージ](#9-モジュールとパッケージ)
+
+---
+
+## 1. Pythonの実行方法
+
+ここでは、2種類のPython実行方法を解説します。
+
+| 実行方法 | 概要 |
+|---------|------|
+| **インタープリタの起動** | 実行結果を1つずつ確認しながらプログラムを実行 |
+| **Pythonファイルの実行** | プログラムを書いたファイルを指定して実行 |
+
+### 1.1. インタープリタの起動
+
+簡易的なプログラムを試す場合は、インタープリタといった方法でPythonを実行するのが便利です。Pythonのプログラムの実行結果を1つずつ確認しながらプログラムを実行できるのが特徴になります。
+
+インタープリタを起動するには、VSCodeのターミナルで以下のようにコマンドを実行してください。Windowsなら`python`コマンド、macOSなら`python3`コマンドを実行してください。「`>>>`」が表示されればインタープリタが起動しています。
+
+**▼Windowsの場合**
+
+```bash
+> python
+>>>
+```
+
+**▼macOSの場合**
+
+```bash
+% python3
+>>>
+```
+
+インタープリタを終了するには、「`exit()`」とコマンドを入力してからEnterキーを押してください。
+
+### 1.2. Pythonファイルの実行
+
+一定の長さを持つプログラムや何度も実行するようなプログラムは、インタープリタによる実行は向いていません。そこでプログラムを書いたファイルを指定して実行する方法があります。
+
+Windowsの場合は、VSCodeのターミナル上で「`python <ファイル名>`」、macOSの場合は「`python3 <ファイル名>`」と入力してプログラムファイルを実行します。
+
+**▼Windowsの場合**
+
+```bash
+> python sample.py
+```
+
+**▼macOSの場合**
+
+```bash
+% python3 sample.py
+```
+
+ディレクトリ以外の場所で実行する場合は、パス付きでファイル名を指定してください。
+
+---
+
+## 2. Pythonプログラムの基本構造
+
+Pythonには、基本的な構文ルールが存在します。
+
+以下は、Pythonプログラムを記述する際に「必ず守るべき」構造上のルールです。
+
+| ルール | 説明 | ポイント |
+|--------|------|---------|
+| **インデント** | ブロックの内部は半角スペース4つで字下げ | スペースとタブを混ぜないこと |
+| **コロン（:）** | 制御構文の行末に付ける | コロンの後は必ずインデントが続く |
+| **文の終わり** | セミコロンは不要。1行に複数文書くときのみ使用可能 | 原則1行に1文が推奨 |
+| **コメント** | コメントは#から始める。文末にも書ける | 説明が必要な箇所には積極的に使うこと |
+| **関数定義** | `def 関数名(引数):` で始め内部をインデントで構成 | 定義と処理ブロックは一続きにする |
+| **クラス定義** | `class クラス名:` で始め内部に`__init__`などの関数を定義 | インデントの入れ子に注意 |
+| **空行** | 複数の関数やクラスの間には空行を1〜2行入れる | コードの可読性が大きく向上する |
+| **変数名/定数名** | 通常はスネークケース（`snake_case`）を使う | クラスはキャメルケース（`CamelCase`） |
+
+**▼実例**
+
+```python
+def greet(name):  # 関数定義とコメント
+    if name:  # 条件文とコロン
+        print(f"Hello, {name}")  # インデントされた処理
+    else:
+        print("Hello, stranger")
+```
+
+**▼Python構文のまとめ**
+
+- インデントは構文の一部である（4スペースが標準）
+- コロン（:）が付く行の後には必ずインデントされたブロックが続く
+- 波かっこは使わない（C言語系と違う点）
+- コメントや空行で可読性を高める
+- 関数・変数の命名規則も大事（snake_case vs CamelCase）
+
+さらに詳しく学びたい場合は、PEP 8（Pythonの公式スタイルガイド）もおすすめです。
+https://pep8-ja.readthedocs.io/ja/latest/
+
+---
+
+## 3. 基本データ型
+
+Pythonに限らず、プログラムを扱う際に以下の基本データ型を理解する必要があります。
+
+| 基本データ型 | 概要 |
+|------------|------|
+| **文字列データ** | `''`, `""`によって括られたデータは文字列型として認識される |
+| **数値データ** | 整数（int）, 小数（float）として認識される |
+
+### 3.1. 文字列データ
+
+ここでは、基本的な文字列データの扱い方を解説します。
+
+| 文字列データの扱い方 | 概要 |
+|-------------------|------|
+| **文字列の生成** | 文字列リテラル（例: "Hello"）を使って新しい文字列を作成 |
+| **文字列への型変換** | `str()` 関数を使って数値や他の型を文字列に変換 |
+| **文字列の連結と繰り返し** | `+` 演算子で文字列を結合し、`*` 演算子で指定回数だけ繰り返す |
+| **文字列の抽出** | インデックス（例: `s[0]`）やスライス（例: `s[1:4]`）で部分文字列を取得 |
+| **文字列の書式設定** | f文字列（例: `f"{name}さん"`）や`format()` メソッドを使用 |
+
+#### 3.1.1. 文字列の生成
+
+シングルクォーテーション「`'`」またはダブルクォーテーション「`"`」で括られた文字列は文字列型として認識されます。
+
+Python 3系はUnicodeを標準でサポートしているので日本語も使えます。
+
+**▼実例**
+
+```python
+moji = 'Python'
+kazu = "123"
+```
+
+数値に関しても、シングルあるいはダブルクォーテーションで括ることによって文字列データと認識されます。
+
+#### 3.1.2. 文字列の型変換
+
+`str`関数を使うことで他の型から文字列型に変換できます。
+
+次の例では数値を文字列型に変換しています。
+
+**▼実例**
+
+```python
+>>> str(10)
+'10'
+```
+
+#### 3.1.3. 文字列の連結と繰り返し
+
+「`+`」演算子を使うことで文字列を連結し1つの文字列にすることができます。
+
+**▼実例**
+
+```python
+>>> 'あいうえお' + 'かきくけこ'
+'あいうえおかきくけこ'
+```
+
+「`*`」演算子で文字列を繰り返すこともできます。
+
+**▼実例**
+
+```python
+>>> 'あいうえお' * 2
+'あいうえおあいうえお'
+```
+
+#### 3.1.4. 文字列の抽出
+
PR #107の内容を確認しました。Marpと他の選択肢について整理します。

Marpの縦長A4対応について:

カスタムCSSで section { width: 794px; height: 1123px; } とすればA4縦長は可能
ただし---ごとに独立ページ（テキストが次ページに流れない）
ステップごとに1ページ＝良いが、長い解説は不便
PR #107のアプローチ: Pandoc + XeLaTeX でMarkdown→PDF変換（長文ドキュメント向き）

AskUserQuestion
OUT
User has answered your questions: "PDF化の方法として、どのアプローチがいいですか？"="順を追っていけばスムーズに作れるようにしたいので、出来る限り別資料というやり方は視点の移動が増えるのでやりたくない。ということを踏まえたうえで、marlに限らず一番オススメの方法を提案してほしい。". You can now continue with the user's answers in mind.
ユーザーの要望を踏まえて、最適なPDF生成方法を検討します。以下の条件を満たす必要があります:

1つの連続したドキュメント（別資料への視点移動なし）
サンプルPDFのような見た目（ダークヘッダーの表、コードブロック、セクション番号）
Mermaid図のインライン表示
日本語フォント対応
Web Searchmd-to-pdf npm package markdown PDF custom CSS Japanese mermaid 2025
OUT
Web search results for query: "md-to-pdf npm package markdown PDF custom CSS Japanese mermaid 2025"

Links: [{"title":"md-to-pdf - npm","url":"https://www.npmjs.com/package/md-to-pdf"},{"title":"md-mermaid-to-pdf - npm Package Security Analysis - Socket","url":"https://socket.dev/npm/package/md-mermaid-to-pdf"},{"title":"md-mermaid-to-pdf - npm","url":"https://www.npmjs.com/package/md-mermaid-to-pdf"},{"title":"markdown-pdf - npm","url":"https://www.npmjs.com/package/markdown-pdf"},{"title":"GitHub - prycey/mermaid_md-to-pdf: Hackable CLI tool for converting Markdown files to PDF using Node.js and headless Chrome.","url":"https://github.com/prycey/mermaid_md-to-pdf"},{"title":"Markdown + Mermaid to PDF MCP Server | MCP Servers · LobeHub","url":"https://lobehub.com/mcp/aoprisan-mcp-md-mmd-pdf"},{"title":"md-mermaid-to-pdf 2.9.6 on npm - Libraries.io - security & maintenance data for open source software","url":"https://libraries.io/npm/md-mermaid-to-pdf"},{"title":"GitHub - mikewootc/md-to-pdf-ng: Hackable CLI tool for converting Markdown files to PDF using Node.js and headless Chrome.","url":"https://github.com/mikewootc/md-to-pdf-ng"},{"title":"Markdown + Mermaid to PDF MCP Server by aoprisan | Glama","url":"https://glama.ai/mcp/servers/@aoprisan/mcp-md-mmd-pdf"},{"title":"GitHub - skmprb/md-mermaid-to-pdf-mcp: A powerful Model Context Protocol (MCP) server that converts Markdown files and content to beautifully styled PDFs with Mermaid diagram support.","url":"https://github.com/skmprb/md-mermaid-to-pdf-mcp"}]

Here's what I found about **md-to-pdf** and related npm packages for converting Markdown to PDF with custom CSS and Mermaid diagram support:

## `md-to-pdf` (Main Package)

md-to-pdf is a simple and hackable CLI tool for converting markdown to PDF. It uses Marked to convert markdown to HTML and Puppeteer (headless Chromium) to further convert the HTML to PDF.(no content)It also uses highlight.js for code highlighting.

### Custom CSS Support
You can pass a path to a local or remote stylesheet (multiple times) via `--stylesheet`, or pass a string of styles via `--css`.

You can also configure it via front-matter or a config file, for example:
The config file supports options like `stylesheet`, `css` (inline styles like `body { color: tomato; }`), `body_class`, `pdf_options` with format/margin/printBackground, and `stylesheet_encoding: 'utf-8'`.

### Source Size
The whole source code is only ~500 lines of TypeScript and ~100 lines of CSS, so it is easy to clone and customize.

---

## `md-mermaid-to-pdf` (Mermaid Support Fork)

This package was forked from mikewootc/md-to-pdf-ng, with fixed mermaid support, since the original only generated very basic graphics due to obsolete dependencies.(no content)It's a CLI tool for converting Markdown files to PDF with support for Mermaid graphics, currently at version 2.9.6.(no content)The latest update was by Nicholas Anderson and Kirill Boychenko on December 23, 2025.

---

## MCP Server: `mcp-md-mmd-pdf` (Markdown + Mermaid to PDF)

There's also an MCP (Model Context Protocol) server that converts Markdown files containing Mermaid diagrams into PDF documents, and also converts standalone Mermaid diagrams to PNG or PDF.(no content)It converts Markdown documents into professional PDF files, supporting standard syntax along with embedded Mermaid diagrams and custom CSS styling.(no content)It supports a `custom_css` (optional) parameter for additional CSS styles to apply to the PDF.

The pipeline works as follows: Markdown Parsing reads and parses content using the marked library; HTML Generation converts Markdown to HTML while preserving Mermaid code blocks; Mermaid Rendering injects Mermaid.js library to render diagrams as SVG in the browser; and PDF Export uses Puppeteer (headless Chrome) to generate the final PDF.

---

## `md-mermaid-to-pdf-mcp`

A powerful Model Context Protocol (MCP) server that converts Markdown files and content to beautifully styled PDFs with Mermaid diagram support.(no content)Features include two conversion modes (File-to-PDF and content-to-PDF), Mermaid diagrams with automatic rendering, modern styling with Inter font, multiple formats (A4, A3, A5, Letter, Legal, Tabloid), configurable margins, and front matter support.

---

## Japanese Language Support

The search results didn't specifically mention Japanese language support. However, since all these tools use **Puppeteer (headless Chromium)** for rendering, Japanese text should render correctly as long as Japanese fonts (e.g., Noto Sans JP, IPAex Gothic) are installed on the system or included via CSS `@font-face` rules in your custom stylesheet. You can use the `--css` or `--stylesheet` options to specify Japanese-compatible fonts.


REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.
調査完了しました。最終的な推奨方法を整理し、計画を更新します。

推奨: md-mermaid-to-pdf (npm パッケージ)

理由:

Markdown → Puppeteer (Chrome) → PDF の流れで、サンプルPDFに近い仕上がり
カスタムCSS で表ヘッダーの色、コードブロックのスタイルを自由に設定
Mermaid図がインラインで自動レンダリング
日本語フォントはChromeが処理するので自然に表示
LaTeX不要（環境構築が楽）
PR #107の品質チェックスクリプトも併用可能
Write shiny-churning-hare.md
318 lines
# task-app 30日間教材 完全作成計画

## 概要

- **作成対象**: Day 4〜30（27日分）の教材マークダウン + 骨格ファイル全Day分
- **最終形式**: Markdown → `md-mermaid-to-pdf` でPDF化（カスタムCSS適用）
- **日数**: 30日間（多すぎれば後でキリの良い日数に調整）
- **進め方**: まず全Dayの骨格（テンプレート＋ステップ一覧）を作成し、その後中身を埋める

---

## Part 1: PDF化の仕組み構築

### ツール選定: `md-mermaid-to-pdf`

| 比較項目 | md-mermaid-to-pdf | Pandoc+XeLaTeX | Marp |
|---------|-------------------|----------------|------|
| セットアップ | npm install のみ | texlive必要 | npm install |
| テキスト流れ | 連続的 | 連続的 | ページ単位 |
| Mermaid対応 | 組み込み済み | 別途処理必要 | 組み込み |
| CSS制御 | 完全自由 | LaTeX制約あり | テーマベース |
| 日本語 | Chrome処理で自然 | XeLaTeX設定必要 | Chrome処理 |
| 推奨度 | **★★★** | ★★ | ★（長文不向き） |

### カスタムCSS（sample PDFに合わせる）

```css
/* 方針: サンプルPDFの見た目を再現 */
body { font-family: "Noto Sans CJK JP", sans-serif; line-height: 1.8; font-size: 11pt; }
h1 { color: #2c3e50; border-bottom: 3px solid #3498db; }
h2 { color: #34495e; border-bottom: 2px solid #ecf0f1; margin-top: 2em; }
table th { background-color: #1e4d7b; color: white; padding: 10px; }
table td { border: 1px solid #ddd; padding: 8px; }
pre { background-color: #282c34; color: #abb2bf; border-radius: 6px; padding: 16px; }
code { background-color: #282c34; color: #abb2bf; padding: 2px 6px; border-radius: 3px; }
blockquote { border-left: 4px solid #3498db; padding-left: 16px; color: #555; }
```

### 品質チェックスクリプト（PR #107から移植＋改良）

- `scripts/check_visualization.py` - 全ステップに視覚要素があるか
- `scripts/check_step_length.py` - コードブロック25行ルール
- `scripts/check_no_skip.py` - ステップ連続性チェック
- `scripts/generate_pdf.sh` - md-mermaid-to-pdf でPDF生成

---

## Part 2: redmine-clone の反省点と対策

| 問題 | 原因 | 今回の対策 |
|------|------|-----------|
| ステップ飛ばし | AIが「同様に」で省略 | 1ステップ1ファイル変更、全コード明示 |
| 文字ばかり | 解説が長文 | 最大3文ルール、表・Mermaid図で置き換え |
| 教科書的 | 説明→コードの一方通行 | コード先行 + 表形式解説 |
| 1回の反映がデカい | コード変更量が巨大 | コードブロック上限25行 |
| 初心者にわかりづらい | 前提知識の暗黙要求 | 新概念は必ず例え話＋比較表 |

---

## Part 3: テンプレート構造（全Day共通）

```markdown
# Day XX: [タイトル]

## 🎯 今日のゴール
[2文以内 + 完成イメージ説明]
[スクリーンショット: 〇〇の画面]

## 🤔 なぜこれを学ぶのか？
[1段落（3文以内）]
> 💡 **例え話**: [日常的な例え + 箇条書きの対応表]

## 📊 実装ステップ一覧
| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | ... | X分 |
**合計時間**: 約X時間

---

### Step N: [タイトル]（X分）

🎯 **ゴール**: [1文]

🔰 **初心者向け解説**: [最大3文]

💻 **実装**:
```typescript
// filepath: src/xxx/yyy.ts
[上限25行]
```

🔍 **コード解説**:
| コード | 意味 | 例え |
|--------|------|------|
| `keyword` | 説明 | 日常の例え |

✅ **確認ポイント**:
1. [操作]
2. [期待結果]

[スクリーンショット: 確認画面]

📝 **学んだこと**: [1文]

---

## 📋 今日のまとめ
### 理解度チェック
- [ ] [確認項目1〜5]

### 今日学んだ概念
| 概念 | 意味 | このアプリでの使われ方 |
|------|------|---------------------|

## ⚠️ つまずきポイント
| エラー/問題 | 原因 | 解決方法 |
|------------|------|---------|

## 🔜 次回の予告
```

---

## Part 4: 品質ルール一覧

### 絶対遵守ルール

| カテゴリ | ルール | 基準値 |
|---------|--------|--------|
| コード | ブロック行数上限 | **25行** |
| コード | filepath コメント | 全ブロック必須 |
| コード | 確認ポイント | 全ブロック直後に必須 |
| コード | 日本語コメント | 全ブロック必須 |
| テキスト | 段落上限 | **3文** |
| テキスト | 新概念初出 | （日本語説明）括弧書き必須 |
| テキスト | 例え話 | 新概念ごとに1つ必須 |
| テキスト | 禁止語 | 「同様に」「残りも」「以下略」「簡単です」 |
| 構造 | 1ステップの変更 | 1ファイルまで |
| 構造 | ステップ時間 | 3〜7分 |
| 構造 | 1日のステップ数 | 7〜12 |
| 構造 | 新概念/日 | 3つまで |
| 構造 | 新規ファイル/日 | 5つまで |
| 視覚 | 表の数/日 | 4つ以上 |
| 視覚 | スクショ位置/日 | 3箇所以上 |
| 視覚 | Mermaid図 | アーキテクチャ日は必須 |
| 視覚 | 200文字超の説明 | 図解必須 |

---

## Part 5: Day 4〜30 コンテンツアウトライン

### Phase 1: 土台完成（Day 4-5）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 4 | TypeScript基礎知識 | 9 | 基本型→interface→enum→実コード読み |
| 5 | Next.js基礎構造 | 8 | App Router→page/layout→ルーティング→SC/CC |

### Phase 2: ユーザー認証（Day 6-10）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 6 | 認証の仕組み理解 | 7 | セッション/クッキー→NextAuth→protectedProcedure |
| 7 | ユーザー登録前編（UI） | 9 | MUI→TextField→react-hook-form→zod |
| 8 | ユーザー登録後編（API） | 9 | tRPCルーター→zodスキーマ→bcrypt→prisma.create |
| 9 | ログイン機能 | 9 | ログインフォーム→bcrypt.compare→セッション |
| 10 | 認証状態管理とログアウト | 7 | getSession→protectedProcedure→ページ保護 |

### Phase 3: プロジェクト管理（Day 11-15）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 11 | データモデルの関係性 | 7 | リレーション→1対多→多対多→ER図 |
| 12 | プロジェクト一覧画面 | 8 | AppLayout→AppBar→Drawer→一覧API→カード |
| 13 | プロジェクト作成 | 9 | Dialog→フォーム→カラーピッカー→create API |
| 14 | プロジェクト編集・削除 | 8 | getById→編集→update→削除確認→delete |
| 15 | メンバー管理 | 7 | addMember→ロール→一覧→変更→削除 |

### Phase 4: タスク管理（Day 16-20）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 16 | タスク一覧画面 | 9 | getAll API→フィルタ→ソート→テーブルUI |
| 17 | タスク作成 | 9 | ダイアログ→フィールド群→DatePicker→create |
| 18 | タスク詳細・編集 | 8 | getById→カード→編集モード→楽観的更新 |
| 19 | ステータスとタイマー | 8 | 状態遷移図→ステータス変更→タイマーUI |
| 20 | マイタスクページ | 8 | 担当フィルタ→期限強調→セクション分割 |

### Phase 5: コラボレーション（Day 21-23）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 21 | コメント機能前編 | 8 | getByTaskId→リスト→投稿フォーム→create |
| 22 | コメント機能後編 | 8 | 編集→update→削除→権限チェック |
| 23 | 検索・フィルタリング | 9 | searchAPI→全文検索→フィルタUI→URL同期 |

### Phase 6: レポート（Day 24-26）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 24 | ダッシュボード | 8 | 統計API→カード→Grid→レスポンシブ |
| 25 | チャート機能 | 8 | Recharts→Pie→Bar→Line→カスタマイズ |
| 26 | 週次レポート | 7 | 期間指定→集計API→サマリー表示 |

### Phase 7: ユーザー管理（Day 27-28）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 27 | ユーザー管理 | 8 | isAdmin→一覧API→一覧UI→有効化/無効化 |
| 28 | プロフィール管理 | 8 | 表示→編集→更新API→パスワード変更 |

### Phase 8: 仕上げ（Day 29-30）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 29 | セキュリティ | 8 | XSS→SQLi→CSRF→TRPCError→エラーハンドリング |
| 30 | テストとデプロイ準備 | 9 | Vitest→ユニットテスト→ビルド→振り返り |

---

## Part 6: 必須Mermaid図一覧

| Day | 図の種類 | 内容 |
|-----|---------|------|
| 5 | flowchart | App Routerのルーティング構造 |
| 6 | sequence | 認証フロー（ブラウザ→サーバー→DB） |
| 11 | erDiagram | User-Project-Task-Comment関係 |
| 12 | flowchart | コンポーネント階層 |
| 19 | stateDiagram | タスクステータス遷移 |
| 24 | flowchart | ダッシュボードデータフロー |
| 29 | flowchart | セキュリティレイヤー |

---

## Part 7: 実行手順

### Step 1: 環境構築（PDF生成基盤）

```bash
# task-app/に追加
npm install --save-dev md-mermaid-to-pdf
# カスタムCSS作成
# scripts/ に品質チェックスクリプト配置
```

作成ファイル:
- `material/30days-curriculum/styles/tutorial.css` - カスタムCSS
- `scripts/check_visualization.py` - 視覚化チェック
- `scripts/check_step_length.py` - 25行ルールチェック
- `scripts/check_no_skip.py` - ステップ連続性チェック
- `scripts/generate_pdf.sh` - PDF一括生成

### Step 2: 全Day骨格ファイル作成（27ファイル）

Day 4〜30の全ファイルをテンプレート骨格で作成:
- ファイル名: `day04_typescript基礎.md` 〜 `day30_テストとデプロイ.md`
- 内容: テンプレートのセクション見出し + ステップ一覧表（中身は空）

### Step 3: Phase単位で中身を埋める

各Phaseを順番に作成:
1. 対象ソースコード読み込み
2. コードを25行以下ブロックに分割計画
3. テンプレートに沿って全ステップ記述
4. 表・Mermaid図追加
5. 品質チェックスクリプト実行
6. 反スキップ監査

### Step 4: PDF生成・確認

```bash
./scripts/generate_pdf.sh material/30days-curriculum/dayXX_xxx.md
```

---

## Part 8: 修正対象ファイル一覧

### 新規作成

| パス | 内容 |
|------|------|
| `material/30days-curriculum/day04_typescript基礎.md` | Day 4教材 |
| `material/30days-curriculum/day05_nextjs基礎構造.md` | Day 5教材 |
| `material/30days-curriculum/day06_認証の仕組み.md` | Day 6教材 |
| ... | Day 7〜30（同様に27ファイル） |
| `material/30days-curriculum/styles/tutorial.css` | PDF用カスタムCSS |
| `scripts/check_visualization.py` | 視覚化チェック |
| `scripts/check_step_length.py` | 行数チェック |
| `scripts/check_no_skip.py` | ステップ連続性チェック |
| `scripts/generate_pdf.sh` | PDF生成スクリプト |

### 既存ファイル確認

| パス | 確認内容 |
|------|---------|
| `material/30days-curriculum/00_カリキュラム目次.md` | リンク整合性 |
| `package.json` | devDependencies追加 |

---

## Part 9: 検証方法

### 各Day完成後のチェック

1. **品質チェック**: `python3 scripts/check_visualization.py dayXX.md`
2. **行数チェック**: `python3 scripts/check_step_length.py dayXX.md`
3. **連続性チェック**: `python3 scripts/check_no_skip.py dayXX.md`
4. **PDF生成**: `./scripts/generate_pdf.sh dayXX.md` → PDF確認
5. **コード動作**: コードブロックをコピペ → `task dev` で動作確認

### 全体完成後のチェック

1. Day 1から30まで通しで確認（コードが積み上げ式で矛盾なし）
2. 全PDFのスタイル統一確認
3. 目次ファイルのリンク全て有効確認
計画が完成しました。要点をまとめます:

PDF化方法: md-mermaid-to-pdf を推奨

Marpは長文ドキュメントには不向き（ページ単位でテキストが流れない）
md-mermaid-to-pdf はMarkdown→Chrome→PDFで、カスタムCSSで見た目を完全制御可能
Mermaid図もインラインで自動レンダリング
LaTeX不要で環境構築が簡単
PR #107からの取り入れ:

品質チェックスクリプト（視覚化、行数、ステップ連続性）
視覚化必須ルール（全ステップに最低1つの視覚要素）
200文字以上の説明は図解必須
構成:

PDF基盤構築（CSS + スクリプト）
全27ファイルの骨格作成
Phase単位で中身を埋める
品質チェック + PDF生成確認
Claude’s Plan
task-app 30日間教材 完全作成計画
概要
作成対象: Day 4〜30（27日分）の教材マークダウン + 骨格ファイル全Day分
最終形式: Markdown → md-mermaid-to-pdf でPDF化（カスタムCSS適用）
日数: 30日間（多すぎれば後でキリの良い日数に調整）
進め方: まず全Dayの骨格（テンプレート＋ステップ一覧）を作成し、その後中身を埋める
Part 1: PDF化の仕組み構築
ツール選定: md-mermaid-to-pdf
比較項目	md-mermaid-to-pdf	Pandoc+XeLaTeX	Marp
セットアップ	npm install のみ	texlive必要	npm install
テキスト流れ	連続的	連続的	ページ単位
Mermaid対応	組み込み済み	別途処理必要	組み込み
CSS制御	完全自由	LaTeX制約あり	テーマベース
日本語	Chrome処理で自然	XeLaTeX設定必要	Chrome処理
推奨度	★★★	★★	★（長文不向き）
カスタムCSS（sample PDFに合わせる）

/* 方針: サンプルPDFの見た目を再現 */
body { font-family: "Noto Sans CJK JP", sans-serif; line-height: 1.8; font-size: 11pt; }
h1 { color: #2c3e50; border-bottom: 3px solid #3498db; }
h2 { color: #34495e; border-bottom: 2px solid #ecf0f1; margin-top: 2em; }
table th { background-color: #1e4d7b; color: white; padding: 10px; }
table td { border: 1px solid #ddd; padding: 8px; }
pre { background-color: #282c34; color: #abb2bf; border-radius: 6px; padding: 16px; }
code { background-color: #282c34; color: #abb2bf; padding: 2px 6px; border-radius: 3px; }
blockquote { border-left: 4px solid #3498db; padding-left: 16px; color: #555; }
品質チェックスクリプト（PR #107から移植＋改良）
scripts/check_visualization.py - 全ステップに視覚要素があるか
scripts/check_step_length.py - コードブロック25行ルール
scripts/check_no_skip.py - ステップ連続性チェック
scripts/generate_pdf.sh - md-mermaid-to-pdf でPDF生成
Part 2: redmine-clone の反省点と対策
問題	原因	今回の対策
ステップ飛ばし	AIが「同様に」で省略	1ステップ1ファイル変更、全コード明示
文字ばかり	解説が長文	最大3文ルール、表・Mermaid図で置き換え
教科書的	説明→コードの一方通行	コード先行 + 表形式解説
1回の反映がデカい	コード変更量が巨大	コードブロック上限25行
初心者にわかりづらい	前提知識の暗黙要求	新概念は必ず例え話＋比較表
Part 3: テンプレート構造（全Day共通）

# Day XX: [タイトル]

## 🎯 今日のゴール
[2文以内 + 完成イメージ説明]
[スクリーンショット: 〇〇の画面]

## 🤔 なぜこれを学ぶのか？
[1段落（3文以内）]
> 💡 **例え話**: [日常的な例え + 箇条書きの対応表]

## 📊 実装ステップ一覧
| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | ... | X分 |
**合計時間**: 約X時間

---

### Step N: [タイトル]（X分）

🎯 **ゴール**: [1文]

🔰 **初心者向け解説**: [最大3文]

💻 **実装**:
```typescript
// filepath: src/xxx/yyy.ts
[上限25行]
🔍 コード解説:

コード	意味	例え
keyword	説明	日常の例え
✅ 確認ポイント:

[操作]
[期待結果]
[スクリーンショット: 確認画面]

📝 学んだこと: [1文]

📋 今日のまとめ
理解度チェック
 [確認項目1〜5]
今日学んだ概念
概念	意味	このアプリでの使われ方
⚠️ つまずきポイント
エラー/問題	原因	解決方法
🔜 次回の予告


---

## Part 4: 品質ルール一覧

### 絶対遵守ルール

| カテゴリ | ルール | 基準値 |
|---------|--------|--------|
| コード | ブロック行数上限 | **25行** |
| コード | filepath コメント | 全ブロック必須 |
| コード | 確認ポイント | 全ブロック直後に必須 |
| コード | 日本語コメント | 全ブロック必須 |
| テキスト | 段落上限 | **3文** |
| テキスト | 新概念初出 | （日本語説明）括弧書き必須 |
| テキスト | 例え話 | 新概念ごとに1つ必須 |
| テキスト | 禁止語 | 「同様に」「残りも」「以下略」「簡単です」 |
| 構造 | 1ステップの変更 | 1ファイルまで |
| 構造 | ステップ時間 | 3〜7分 |
| 構造 | 1日のステップ数 | 7〜12 |
| 構造 | 新概念/日 | 3つまで |
| 構造 | 新規ファイル/日 | 5つまで |
| 視覚 | 表の数/日 | 4つ以上 |
| 視覚 | スクショ位置/日 | 3箇所以上 |
| 視覚 | Mermaid図 | アーキテクチャ日は必須 |
| 視覚 | 200文字超の説明 | 図解必須 |

---

## Part 5: Day 4〜30 コンテンツアウトライン

### Phase 1: 土台完成（Day 4-5）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 4 | TypeScript基礎知識 | 9 | 基本型→interface→enum→実コード読み |
| 5 | Next.js基礎構造 | 8 | App Router→page/layout→ルーティング→SC/CC |

### Phase 2: ユーザー認証（Day 6-10）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 6 | 認証の仕組み理解 | 7 | セッション/クッキー→NextAuth→protectedProcedure |
| 7 | ユーザー登録前編（UI） | 9 | MUI→TextField→react-hook-form→zod |
| 8 | ユーザー登録後編（API） | 9 | tRPCルーター→zodスキーマ→bcrypt→prisma.create |
| 9 | ログイン機能 | 9 | ログインフォーム→bcrypt.compare→セッション |
| 10 | 認証状態管理とログアウト | 7 | getSession→protectedProcedure→ページ保護 |

### Phase 3: プロジェクト管理（Day 11-15）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 11 | データモデルの関係性 | 7 | リレーション→1対多→多対多→ER図 |
| 12 | プロジェクト一覧画面 | 8 | AppLayout→AppBar→Drawer→一覧API→カード |
| 13 | プロジェクト作成 | 9 | Dialog→フォーム→カラーピッカー→create API |
| 14 | プロジェクト編集・削除 | 8 | getById→編集→update→削除確認→delete |
| 15 | メンバー管理 | 7 | addMember→ロール→一覧→変更→削除 |

### Phase 4: タスク管理（Day 16-20）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 16 | タスク一覧画面 | 9 | getAll API→フィルタ→ソート→テーブルUI |
| 17 | タスク作成 | 9 | ダイアログ→フィールド群→DatePicker→create |
| 18 | タスク詳細・編集 | 8 | getById→カード→編集モード→楽観的更新 |
| 19 | ステータスとタイマー | 8 | 状態遷移図→ステータス変更→タイマーUI |
| 20 | マイタスクページ | 8 | 担当フィルタ→期限強調→セクション分割 |

### Phase 5: コラボレーション（Day 21-23）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 21 | コメント機能前編 | 8 | getByTaskId→リスト→投稿フォーム→create |
| 22 | コメント機能後編 | 8 | 編集→update→削除→権限チェック |
| 23 | 検索・フィルタリング | 9 | searchAPI→全文検索→フィルタUI→URL同期 |

### Phase 6: レポート（Day 24-26）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 24 | ダッシュボード | 8 | 統計API→カード→Grid→レスポンシブ |
| 25 | チャート機能 | 8 | Recharts→Pie→Bar→Line→カスタマイズ |
| 26 | 週次レポート | 7 | 期間指定→集計API→サマリー表示 |

### Phase 7: ユーザー管理（Day 27-28）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 27 | ユーザー管理 | 8 | isAdmin→一覧API→一覧UI→有効化/無効化 |
| 28 | プロフィール管理 | 8 | 表示→編集→更新API→パスワード変更 |

### Phase 8: 仕上げ（Day 29-30）

| Day | タイトル | ステップ数 | 主な内容 |
|-----|---------|-----------|---------|
| 29 | セキュリティ | 8 | XSS→SQLi→CSRF→TRPCError→エラーハンドリング |
| 30 | テストとデプロイ準備 | 9 | Vitest→ユニットテスト→ビルド→振り返り |

---

## Part 6: 必須Mermaid図一覧

| Day | 図の種類 | 内容 |
|-----|---------|------|
| 5 | flowchart | App Routerのルーティング構造 |
| 6 | sequence | 認証フロー（ブラウザ→サーバー→DB） |
| 11 | erDiagram | User-Project-Task-Comment関係 |
| 12 | flowchart | コンポーネント階層 |
| 19 | stateDiagram | タスクステータス遷移 |
| 24 | flowchart | ダッシュボードデータフロー |
| 29 | flowchart | セキュリティレイヤー |

---

## Part 7: 実行手順

### Step 1: 環境構築（PDF生成基盤）

```bash
# task-app/に追加
npm install --save-dev md-mermaid-to-pdf
# カスタムCSS作成
# scripts/ に品質チェックスクリプト配置
作成ファイル:

material/30days-curriculum/styles/tutorial.css - カスタムCSS
scripts/check_visualization.py - 視覚化チェック
scripts/check_step_length.py - 25行ルールチェック
scripts/check_no_skip.py - ステップ連続性チェック
scripts/generate_pdf.sh - PDF一括生成
Step 2: 全Day骨格ファイル作成（27ファイル）
Day 4〜30の全ファイルをテンプレート骨格で作成:

ファイル名: day04_typescript基礎.md 〜 day30_テストとデプロイ.md
内容: テンプレートのセクション見出し + ステップ一覧表（中身は空）
Step 3: Phase単位で中身を埋める
各Phaseを順番に作成:

対象ソースコード読み込み
コードを25行以下ブロックに分割計画
テンプレートに沿って全ステップ記述
表・Mermaid図追加
品質チェックスクリプト実行
反スキップ監査
Step 4: PDF生成・確認

./scripts/generate_pdf.sh material/30days-curriculum/dayXX_xxx.md
Part 8: 修正対象ファイル一覧
新規作成
パス	内容
material/30days-curriculum/day04_typescript基礎.md	Day 4教材
material/30days-curriculum/day05_nextjs基礎構造.md	Day 5教材
material/30days-curriculum/day06_認証の仕組み.md	Day 6教材
...	Day 7〜30（同様に27ファイル）
material/30days-curriculum/styles/tutorial.css	PDF用カスタムCSS
scripts/check_visualization.py	視覚化チェック
scripts/check_step_length.py	行数チェック
scripts/check_no_skip.py	ステップ連続性チェック
scripts/generate_pdf.sh	PDF生成スクリプト
既存ファイル確認
パス	確認内容
material/30days-curriculum/00_カリキュラム目次.md	リンク整合性
package.json	devDependencies追加
Part 9: 検証方法
各Day完成後のチェック
品質チェック: python3 scripts/check_visualization.py dayXX.md
行数チェック: python3 scripts/check_step_length.py dayXX.md
連続性チェック: python3 scripts/check_no_skip.py dayXX.md
PDF生成: ./scripts/generate_pdf.sh dayXX.md → PDF確認
コード動作: コードブロックをコピペ → task dev で動作確認
全体完成後のチェック
Day 1から30まで通しで確認（コードが積み上げ式で矛盾なし）
全PDFのスタイル統一確認
目次ファイルのリンク全て有効確認
Stayed in plan mode
その計画を要約してわかりやすく教えて下さい
計画の要約
やること（3ステップ）
① PDF生成の仕組みを作る

md-mermaid-to-pdf (npm) でMarkdown→PDFに変換
カスタムCSSでサンプルPDFと同じ見た目（青いテーブルヘッダー、ダークなコードブロック）
品質チェックスクリプト3つ導入（ステップ飛ばし検知、行数チェック、視覚要素チェック）
② 全Day（4〜30）の骨格ファイルを先に作る

27ファイル分のテンプレート（見出し＋ステップ一覧表だけ入った状態）
③ Phase単位で中身を埋める

ソースコードを読む → 25行以下に分割 → テンプレートに書く → チェック
redmine-cloneの失敗を防ぐルール
前回の問題	今回のルール
ステップ飛ばし	「同様に」「残りも」禁止。全コード明示
文字ばかり	段落3文まで。超えたら表か図に変換
コード変更がデカい	1ブロック25行まで。超えたら分割
初心者に分かりづらい	新概念は必ず例え話＋比較表つき
各Dayの構成（統一フォーマット）

ゴール → なぜ学ぶか（例え話） → ステップ一覧表
 ↓
各ステップ: ゴール → 解説(3文) → コード(25行以内) → 解説表 → 確認ポイント
 ↓
まとめ → つまずきポイント表 → 次回予告
PDF化の方法
md-mermaid-to-pdf を選んだ理由:

Marp → ❌ スライドベースで長文に不向き（テキストが次ページに流れない）
Pandoc+LaTeX → △ 環境構築が重い
md-mermaid-to-pdf → ⭕ npm一発、CSS自由、Mermaid対応、日本語OK
全30日の流れ（8Phase）
Phase	日数	内容
1	Day 4-5	TypeScript / Next.js基礎
2	Day 6-10	ユーザー認証（登録・ログイン）
3	Day 11-15	プロジェクト管理（CRUD＋メンバー）
4	Day 16-20	タスク管理（一覧・作成・タイマー）
5	Day 21-23	コメント・検索
6	Day 24-26	ダッシュボード・チャート・レポート
7	Day 27-28	ユーザー管理・プロフィール
8	Day 29-30	セキュリティ・テスト・デプロイ
これマークダウン編集中にホットリロードとかで反映されるのは無理？
いい質問です。ホットリロードで編集しながらプレビューする方法はいくつかあります。

選択肢
① VS Code「Markdown Preview Enhanced」拡張（最も手軽）
カスタムCSS読み込み可能
Mermaid図もリアルタイム描画
エディタ横にプレビュー表示
設定でPDF用と同じCSSを指定すれば見た目もほぼ一致
② HTML生成 + Live Server（PDF出力と完全一致）

# ファイル保存を監視 → HTML自動生成 → ブラウザ自動リロード
npx chokidar-cli "material/**/*.md" -c "./scripts/generate_html.sh {path} output/preview.html" &
npx live-server output/
これならPDFと全く同じCSSで描画された結果がブラウザでホットリロードされる。

③ MkDocs Material（リッチだが別ツール）

mkdocs serve  # localhost:8000 でホットリロード
Mermaid対応、テーマが美しい、PDF export pluginあり。ただしCSSの仕組みが独自。

推奨
方法	手軽さ	PDF一致度	Mermaid
VS Code拡張	★★★	△（近いが完全一致ではない）	⭕
HTML + Live Server	★★	⭕（同じCSS）	⭕
MkDocs	★	△（独自テーマ）	⭕
おすすめ: ②のHTML + Live Server を開発時に使い、最終確認でmd-mermaid-to-pdfでPDF出力。

理由: 同じCSSを使うのでPDFとの見た目の差異がゼロ。保存するたびにブラウザが自動更新されるので、編集→確認のサイクルが速い。

この方向でよければ計画に組み込みますか？それとも他に気になる点がありますか？
