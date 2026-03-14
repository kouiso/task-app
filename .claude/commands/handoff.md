# /handoff - Session Handoff Prompt Generator
<!-- セッション引き継ぎプロンプト生成 -->

## Purpose
<!-- 目的 -->

Generate a self-contained prompt that enables another Claude session to continue the current work without any prior context.
<!-- 現在の作業を、事前コンテキストなしで別のClaudeセッションが継続できる自己完結プロンプトを生成する。 -->

## Execution Protocol
<!-- 実行プロトコル -->

### Step 1: Analyze Conversation Context
<!-- 会話コンテキストの分析 -->

Read the entire conversation history and extract:
<!-- 会話履歴全体を読み、以下を抽出する -->

1. **What was done**: Completed work in this session (review results, code changes, investigation findings, etc.)
<!-- 何をしたか: このセッションで完了した作業 -->
2. **What remains**: Outstanding tasks, SUGGEST items, TODO items, unresolved issues
<!-- 何が残っているか: 未完了タスク、SUGGEST項目、TODO、未解決の問題 -->
3. **Key context**: Repository, PR/Issue URLs, branch names, file paths, architectural decisions
<!-- 重要なコンテキスト: リポジトリ、PR/Issue URL、ブランチ名、ファイルパス、設計判断 -->

### Step 2: Gather Precise References
<!-- 正確な参照情報の収集 -->

Before generating the prompt, verify all references with actual commands:
<!-- プロンプト生成前に、実際のコマンドで全ての参照を検証する -->

- `gh pr view` / `gh issue view` for URLs and branch names
<!-- PR/IssueのURLとブランチ名 -->
- `grep -n` for exact line numbers in files to be modified
<!-- 修正対象ファイルの正確な行番号 -->
- `git log --oneline -5` for recent commit context
<!-- 直近のコミットコンテキスト -->
- Confirm file paths exist with `ls` or `find`
<!-- ファイルパスの存在確認 -->

### Step 3: Generate Self-Contained Prompt
<!-- 自己完結プロンプトの生成 -->

Output a prompt in a single fenced code block (```). The prompt MUST include ALL of the following:
<!-- フェンスコードブロック内にプロンプトを出力する。以下を全て含めること -->

#### Required sections:
<!-- 必須セクション -->

1. **Context header**: PR/Issue URL, repository, branch name (`base` → `head`)
<!-- コンテキストヘッダー: PR/Issue URL、リポジトリ、ブランチ名 -->

2. **Background**: Brief summary of what was already done and why these tasks remain
<!-- 背景: 既に完了した作業と、なぜこれらのタスクが残っているかの要約 -->

3. **Tasks**: Numbered list of specific tasks with:
<!-- タスク: 以下を含む番号付きリスト -->
   - Exact file path
   <!-- 正確なファイルパス -->
   - What to change (before/after code blocks when applicable)
   <!-- 何を変更するか（該当する場合はbefore/afterコードブロック） -->
   - Why the change is needed (1 sentence)
   <!-- なぜ変更が必要か（1文） -->

4. **Verification**: What to run after changes (`npm run lint`, `npm run test`, etc.)
<!-- 検証: 変更後に実行すべきコマンド -->

5. **Commit instruction**: Commit message and push instructions
<!-- コミット指示: コミットメッセージとプッシュ指示 -->

## Output Rules
<!-- 出力ルール -->

- The prompt MUST be copy-pasteable as-is into a new session
<!-- プロンプトはそのまま新しいセッションにコピペできること -->
- NEVER assume the next session has any prior context
<!-- 次のセッションが事前コンテキストを持つと仮定しないこと -->
- NEVER use ambiguous references like "the file we discussed" or "the previous change"
<!-- 「前に話したファイル」「先ほどの変更」等の曖昧な参照を使わないこと -->
- Include concrete code snippets, not just descriptions
<!-- 説明だけでなく具体的なコードスニペットを含めること -->
- All URLs must be full URLs (no short references like `#283`)
<!-- 全てのURLは完全なURL（`#283`のような短縮参照は不可） -->
- File paths must be relative from repository root
<!-- ファイルパスはリポジトリルートからの相対パス -->
- Line numbers must be verified, not guessed
<!-- 行番号は推測ではなく検証済みであること -->
