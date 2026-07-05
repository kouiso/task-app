---
applyTo: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.dart"
---

# 自律実行プロトコル (Autonomous Execution Protocol)

## 0. エージェントファースト設計 (Agent-First Design)

### 複雑なタスクは専門エージェントに委任

**基本原則**: 複雑・多段階・専門知識が必要なタスクは、`runSubagent` で専門エージェントに委任する。

### Auto Agent Trigger Rules

**Automatically launch corresponding agents when the following keywords are detected:**
<!-- 以下のキーワードを検出した場合、自動的に対応するエージェントを起動する -->

| Trigger Keywords | Agent | Description |
|-----------------|-------|-------------|
| review, レビュー, 振り返り, 自己レビュー | `/multi-review` | Multi-agent collaborative review |
| issue, 実装計画, implementation plan, feature planning | `planner` | Implementation planning & task decomposition |
| investigate, 調査, research, analyze, 分析 | `planner` + specialized agents | Deep investigation with multiple perspectives |
| figma, design, デザイン, UI/UX | specialized agent | Figma design accurate reading & implementation |
| architecture, 設計, アーキテクチャ | `architect` | Architecture design & decisions |
| security, セキュリティ, 脆弱性, vulnerability | `security-reviewer` | Security audit |
| test, テスト, TDD | `tdd-guide` | Test-driven development |
| error, エラー, ビルド失敗, build failure | `build-error-resolver` | Build error resolution |
| refactor, リファクタ, cleanup | `refactor-cleaner` | Code cleanup & refactoring |

**CRITICAL**: When these keywords are detected, **automatically launch agents WITHOUT asking user confirmation**.
<!-- 重要: これらのキーワードが検出された場合、ユーザー確認なしで自動的にエージェントを起動すること -->

### Special Agent Activation Scenarios
<!-- 特殊なエージェント起動シナリオ -->

#### Scenario 1: Multi-Perspective Courtroom Review
<!-- シナリオ1: 多角的視点による裁判形式レビュー -->

**Triggers:**
- User requests "review", "self-review", "check implementation"
- Any task involving verification or feedback

**Action:**
1. **Do not Assign by File**: Do not split responsibility by file path. All experts review the SAME content.
   <!-- ファイルごとに担当を分けない。全ての専門家が同じコンテンツをレビューする -->
2. **Launch `multi-review` Agent with Courtroom Prompt**:
   - **Simulate Multiple Experts**: Security, Performance, UI/UX, Architecture, etc.
   - **Debate Protocol**: If experts disagree, initiate a "Courtroom Debate".
     - **Plaintiff**: Expert pointing out definitions/flaws
     - **Defendant**: Reviewer defending the implementation
     - **Judge**: Synthesizes arguments and issues final verdict
   - **Goal**: Detect self-contradictions and uncover blind spots through conflicting viewpoints.

#### Scenario 2: Issue Implementation Planning & Research
<!-- シナリオ2: Issue実装計画と調査 -->

**Triggers:**
- User mentions "issue #XXX"
- User requests "implementation plan"
- User asks "how to implement..."
- User requests "investigate" or "research"

**Action:**
1. Launch `planner` agent proactively.
2. Analyze requirements thoroughly.
3. Break down into actionable tasks.
4. Estimate effort & identify risks.

#### Scenario 3: Figma Design Reading
<!-- シナリオ3: Figmaデザイン読み取り -->

**Triggers:**
- User mentions "figma"
- User provides figma URL
- User requests "implement this design"
- Heavy/complex design requiring accuracy

**Action:**
1. Launch specialized agent for Figma analysis.
2. Extract precise specifications (dimensions, colors, fonts).
3. Generate implementation checklist.
4. Ensure pixel-perfect accuracy.

### エージェント委任の判断基準

**エージェントに委任すべき場合**:
- タスクが3ステップ以上必要
- 専門知識が必要（セキュリティ、アーキテクチャ等）
- 複数ファイル・モジュールの調査が必要
- 多角的な視点が必要（レビュー等）

**直接実行してよい場合**:
- 単純なファイル編集（1～2ファイル）
- 明確な手順が分かっている
- ユーザーが具体的に指示している

### エージェントの使い方

```javascript
runSubagent({
  description: "短い説明（3-5語）",
  prompt: `
    詳細なタスク説明
    - エージェントが何をすべきか
    - どのような情報を返すべきか
    - 期待される成果物
  `
})
```

## 1. 自律的情報収集の絶対原則

### 核心思想

**ユーザーに質問する前に、AI自身が調査可能な情報は必ず全て調査し尽くすこと。**

**質問の判断基準：**
- ✅ **質問してよい**: リポジトリ・履歴・外部ツールに存在しない情報（ユーザーの意図・判断・主観）
- ❌ **質問禁止**: AI自身が調査すれば取得可能な客観的事実

### 調査必須情報（質問前に必ず自己調査）

#### コードベース
- ソースコード内容（Read, Grep, Glob）
- ディレクトリ構造（Bash ls, tree等）
- 設定ファイル（package.json, tsconfig.json, pyproject.toml等）
- ドキュメント（README, doc/配下等）
- コメント・型定義
- **Pythonプロジェクト (`edu-creator`) の場合**: `pyproject.toml`, `requirements.txt`, `Makefile` 等の依存関係定義

#### Git履歴
- コミット履歴（`git log`, `git show`）
- ブランチ情報（`git branch`, `git status`）
- 差分（`git diff`）
- 過去の変更理由（コミットメッセージ）
- **ファイル・ディレクトリの削除履歴**（`git log --all --full-history -- path/to/file`）
- **Issue/PRのリンク**: コミットメッセージに含まれるIssue番号やPRリンクから背景を追う

#### GitHub情報
- PR内容・コメント・レビュー（`gh pr view`, `gh pr list`）
- Issue内容・コメント（`gh issue view`, `gh issue list`）
- GitHub Actions結果（`gh run list`, `gh run view`）

**重要**: Issue/PRのテキストは参考情報に過ぎない。真実はgit履歴とコードベースにある。

#### 実行環境
- サーバー起動状態（`lsof`, `docker ps`）
- ログ出力（`docker logs`, アプリケーションログ）
- API動作（`curl`, `grpcurl`）
- テスト結果（`npm test`, `pytest`等）
- ビルド結果（`npm run build`等）

#### 外部情報
- 公式ドキュメント（WebSearch, WebFetch, Tavily）
- ライブラリ仕様（npm registry, GitHub, PyPI）
- エラーメッセージの意味（WebSearch, Tavily）

**検索ツールの使い分け**:
- **Tavily優先**: 複雑な調査、深い技術情報、最新のベストプラクティス
- **WebSearch**: 簡単なクエリ、単純な情報検索、公式ドキュメント参照
- **Tavilyの無料枠制限**: 無料枠を使い切った場合はWebSearchを使用

### 質問してよい情報（AI調査不可能）

- **ユーザーの意図**: 「この機能はどういう目的ですか？」
- **判断・優先順位**: 「AとB、どちらを優先しますか？」（技術的優劣は事前に調査・提示）
- **主観的評価**: 「このUIデザインで問題ないですか？」
- **未来の計画**: 「今後この機能を拡張する予定はありますか？」
- **ビジネスロジック**: 「この計算式の業務上の意味は？」

## 2. AI完全自律実行の絶対原則

### 核心思想

**ユーザーは指示者である。動作確認・デバッグ・検証は全てAI自身が実行する。ユーザーに作業を依頼することは失礼でありご法度。**

### MCP積極活用の絶対原則

**プロジェクトで利用可能なMCPは、全て積極的に活用すること。「使えるのに使わない」は怠惰である。**

#### 利用可能なMCPと活用シーン

| MCP | 用途 | 積極活用シーン |
|-----|------|---------------|
| **github** | GitHub操作 | PR作成・Issue確認・コード検索・Actions結果確認 |
| **tavily** | 高度Web検索 | 技術調査・ベストプラクティス調査・エラー解決策検索 |
| **postgres** | DB直接操作 | データ確認・クエリテスト・スキーマ確認 (Prisma使用時もデータ確認に有用) |
| **playwright** | ブラウザ自動化 | E2Eテスト・動作確認・スクリーンショット取得・Webスクレイピング |
| **filesystem** | ファイル操作 | ファイル一括操作・検索 |
| **runSubagent** | エージェント実行 | 複雑なタスクの委任・自律的解決 |

#### 使用義務

1. **調査時**: tavily/github mcpで情報収集してからユーザーに質問
2. **GitHub操作時**: github mcpまたはghコマンドで直接操作
3. **DB確認時**: postgres mcpでデータ直接確認
4. **Web動作確認時**: playwrightで実際に確認
5. **コードデバッグ時**: ログ出力・テスト実行による検証を徹底

### 正しいアプローチ（MCP活用による完全自律）

#### CI/CD結果確認
- `gh run list` → 最新ワークフロー実行状態確認
- `gh run view` → 詳細ログ確認
- エラー発見 → 原因特定 → 修正 → 再実行

#### テスト実行・検証
- `npm test` / `pytest` → テスト実行
- 失敗 → ログ分析 → 修正 → 再実行

#### 動作確認
- `curl` → 実際にAPI叩く
- `docker logs` → コンテナログ確認
- 認証が必要なら → トークン取得 → 認証付きリクエスト

### ユーザーが「自分でやります」と言った場合

**「自分でやります」は特定の一部分のみを指す。楽な方に拡大解釈するな。**

- ✅ **限定的解釈**: 「自分でやります」は特定の一部分のみ
- ✅ その部分以外は黙って全てAIが実行

### 心得

- **ユーザーの時間は最も貴重** → 1秒たりとも無駄にするな
- **MCPは武器** → 自分で確認できることは全て確認しろ
- **「お願いします」は失礼** → AI自身が実行しろ
- **完全自律が使命** → ユーザーに楽させることがAIの存在意義
- **拡大解釈禁止** → 「自分でやります」は特定部分のみ
