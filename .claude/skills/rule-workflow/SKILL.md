---
name: rule-workflow
description: task-appでの実行手順（情報収集→自律実行→計画→実装→品質保証）とショートカットコマンド一覧。実装・調査・計画・PRレビュー系のタスクに着手する時に読む。
---

# 実行手順とショートカット

このファイルは task-app 内 `prompt/instructions/workflow.instructions.md` と
`prompt/instructions/autonomous-execution.instructions.md` を統合し、重複を除いたもの。
Copilot向けの原本は両ファイルとも変更していない。

## 0. エージェントファースト設計 (Agent-First Design)

### 複雑なタスクは専門エージェントに委任

**基本原則**: 複雑・多段階・専門知識が必要なタスクは、`runSubagent` で専門エージェントに委任する。

### Auto Agent Trigger Rules

**Automatically launch corresponding agents when the following keywords are detected:**
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

### Special Agent Activation Scenarios

#### Scenario 1: Multi-Perspective Courtroom Review
**Triggers:**
- User requests "review", "self-review", "check implementation"
- Any task involving verification or feedback

**Action:**
1. **Do not Assign by File**: Do not split responsibility by file path. All experts review the SAME content.
2. **Launch `multi-review` Agent with Courtroom Prompt**:
   - **Simulate Multiple Experts**: Security, Performance, UI/UX, Architecture, etc.
   - **Debate Protocol**: If experts disagree, initiate a "Courtroom Debate".
     - **Plaintiff**: Expert pointing out definitions/flaws
     - **Defendant**: Reviewer defending the implementation
     - **Judge**: Synthesizes arguments and issues final verdict
   - **Goal**: Detect self-contradictions and uncover blind spots through conflicting viewpoints.

#### Scenario 2: Issue Implementation Planning & Research
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

### MCP積極活用の絶対原則

**プロジェクトで利用可能なMCPは、全て積極的に活用すること。「使えるのに使わない」は怠惰である。**

#### 利用可能なMCP一覧（`.vscode/mcp.json`参照）と活用シーン

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

## Phase 0: 自律的情報収集の絶対原則 (Autonomous Information Gathering Protocol)

### 核心思想

**ユーザーに質問する前に、AI自身が調査可能な情報は必ず全て調査し尽くすこと。**

**質問の判断基準：**
- ✅ **質問してよい**: リポジトリ・履歴・外部ツールに存在しない情報（ユーザーの意図・判断・主観）
- ❌ **質問禁止**: AI自身が調査すれば取得可能な客観的事実

### 調査必須情報（質問前に必ず自己調査）

#### コードベース
- ソースコード内容（Read, Grep, Glob）
- ディレクトリ構造（Bash ls, tree等）
- 設定ファイル（package.json, tsconfig.json等）
- ドキュメント（README, doc/配下等）
- コメント・型定義

#### Git履歴
- コミット履歴（`git log`, `git show`）
- ブランチ情報（`git branch`, `git status`）
- 差分（`git diff`）
- 過去の変更理由（コミットメッセージ）
- **ファイル・ディレクトリの削除履歴**（`git log --all --full-history -- path/to/file`）

#### GitHub情報
- PR内容・コメント・レビュー（`gh pr view`, `gh pr list`）
- Issue内容・コメント（`gh issue view`, `gh issue list`）
- GitHub Actions結果（`gh run list`, `gh run view`）
- リポジトリ設定（`gh repo view`）

**重要**: Issue/PRのテキストは参考情報に過ぎない。真実はgit履歴とコードベースにある。

#### Issue関連ドキュメントの徹底調査

**Issueに取り組む際は、ワークスペース内の関連ドキュメントを必ず全て読むこと。**

- **Issueドキュメント**: `{issue番号}.md`、`docs/{issue番号}.md`等の形式でIssue分析・調査結果が残っている可能性
- **既存PR分析**: 同じIssueに対する過去のPR・コミットを調査し、何が試されて何が問題だったかを把握
- **問題の全体像**: Issueには複数の問題が含まれている場合がある。表面的な問題だけでなく、関連する問題（例：スクロール困難、ローディング未実装等）も見逃さない

#### 実行環境
- サーバー起動状態（`lsof`, `docker ps`）
- ログ出力（`docker logs`, アプリケーションログ）
- API動作（`curl`, `grpcurl`）
- テスト結果（`npm test`等）
- ビルド結果（`npm run build`等）

#### 外部情報
- 公式ドキュメント（WebSearch, WebFetch, Tavily）
- ライブラリ仕様（npm registry, GitHub）
- エラーメッセージの意味（WebSearch, Tavily）
- ベストプラクティス（WebSearch, Tavily）

**検索ツールの使い分け**:
- **Tavily優先**: 複雑な調査、深い技術情報、最新のベストプラクティス、業界標準、アーキテクチャ設計等
- **WebSearch**: 簡単なクエリ、単純な情報検索、公式ドキュメントの参照等
- **Tavilyの無料枠制限**: 無料枠を使い切った場合や枠を超えそうな場合はWebSearchを使用

**重要**: 技術的な課題・不明点が発生した際は、ユーザーに「どの方法で進めますか？」と選択肢を丸投げする前に、必ずTavily（複雑な調査）またはWebSearch（簡単な調査）で業界のベストプラクティス・公式ドキュメント・最新情報を調査し、根拠に基づいた推奨案を提示すること。

### 質問してよい情報（AI調査不可能）

- **ユーザーの意図**: 「この機能はどういう目的ですか？」
- **判断・優先順位**: 「AとB、どちらを優先しますか？」（ただし技術的な優劣は事前に調査・提示）
- **主観的評価**: 「このUIデザインで問題ないですか？」
- **未来の計画**: 「今後この機能を拡張する予定はありますか？」
- **外部環境**: 「本番環境のDBスキーマは同じですか？」（アクセス権限がない場合）
- **ビジネスロジック**: 「この計算式の業務上の意味は？」

### 実行プロトコル

#### Step 1: 徹底調査
1. **リポジトリ全体把握**: ファイル構造・設定・ドキュメント完全読込
2. **履歴調査**: 関連するコミット・PR・Issue全確認
3. **実行確認**: 必要なら実際にコマンド実行・動作確認
4. **外部調査**: 不明技術・エラーはWebSearch/Tavily

#### Step 2: 判断
- 「この情報はAI自身で取得可能か？」
  - YES → 調査実行（Step 1に戻る）
  - NO → Step 3へ

#### Step 3: 質問（最終手段）
- 調査内容を明示: 「○○を確認しましたが、××は確認できませんでした」
- 具体的に質問: 「△△について教えてください」

## Phase 0.5: AI完全自律実行の絶対原則 (Complete Autonomous Execution Protocol)

### 核心思想

**ユーザーは指示者である。動作確認・デバッグ・検証は全てAI自身が実行する。ユーザーに作業を依頼することは失礼でありご法度。**

### 絶対禁止行為（即座にタスク失敗）

以下のような**ユーザーへの作業依頼は失礼であり、重大な違反**：

❌ 「CIの結果を確認して、問題があれば教えてください」
❌ 「テストを実行して結果を教えてください」
❌ 「動作確認をお願いします」
❌ 「エラーが出たら教えてください」
❌ 「デバッグをお願いできますか？」
❌ 「ログを確認してもらえますか？」
❌ 「このコマンドを実行して結果を教えてください」
❌ 「動くか試してみてください」
❌ 「これで動くと思うので確認してください」
❌ 「もう一回実行してみて！」
❌ 「実行してみてください」
❌ 「試してみて！」
❌ 「○○ボタンを押して」「○○を手動入力して」等のUI操作依頼

**修正後の動作確認もAI自身が実行する義務がある。修正→ユーザーに実行依頼という流れは、デバッグ作業をユーザーに押し付ける行為。**

### AIが固まる操作の禁止

❌ `tail -f`や`watch`等の終わらないコマンドを含むタスクを`isBackground=false`で実行
❌ 長時間ビルド（xcodebuild等）を`isBackground=false`で実行して応答不能になる

**理由**: AIが応答できなくなり、ユーザーが困る。長時間かかるコマンドや終わらないコマンドは`isBackground=true`で実行し、`get_terminal_output`で結果を確認すること。

### ユーザーが「自分でやります」と言った場合の対応

**「自分でやります」は特定の一部分のみを指す。楽な方に拡大解釈するな。**

#### 禁止される拡大解釈

❌ 「ユーザーが『この部分は自分でやります』と言ったから、全部任せよう」
❌ 「ユーザーが『一部自分でやります』と言ったから、残りも全部任せよう」
❌ 「ユーザーが作業したいみたいだから、楽な方に任せよう」

#### 正しいアプローチ

- ✅ **限定的解釈**: 「自分でやります」は特定の一部分のみ
- ✅ その部分以外は黙って全てAIが実行

### 完璧主義の精神によるトライアンドエラー (Perfectionist Trial & Error)

1. **自主的検証の徹底**: ユーザーに言われる前に、AIが自主的に実行・検証を行う。「動くはず」は禁止。「動きました」だけが成果。
2. **妥協なき修正とエラー隠蔽の完全禁止**: エラーハンドリングの放棄（`|| true`等）は完全禁止。冪等性を担保する。
3. **完全な再検証**: エラーが出て修正したら、途中から端折らずクリーンな状態からの再実行で証明する。
4. **ユーザー負担の完全排除**: ユーザーの時間を節約し、精神的負荷をゼロにすることがAIの存在意義。

### 正しいアプローチ（MCP活用による完全自律）

✅ **CI/CD結果確認**: `gh run list` → `gh run view` → エラー発見 → 原因特定 → 修正 → 再実行
✅ **テスト実行・検証**: `npm test` / `task test` → 失敗 → ログ分析 → 修正 → 再実行
✅ **動作確認**: `curl`, `grpcurl`, `docker logs`, `docker ps`。認証が必要ならトークン取得の上で確認
✅ **デバッグ**: ログファイル読込 → Tavilyで調査 → 修正 → 動作確認 → 完全解決まで継続

## Step 1: Deep Analysis & Planning (徹底分析・計画)

1. **リポジトリ完全スキャン**: 全ファイル・ディレクトリ・ドキュメント（リンク先含む）の完全把握
2. **適用ルールの特定 (Rule Identification)**: 本タスクに関連する指示ファイルを特定し、その内容を再確認する。「やってはいけないこと」をリストアップし、作業計画の制約条件として組み込む。
3. **要件定義**: 指示内容のタスク分解、潜在リスク特定
4. **技術的課題の自律調査**: 不明点・技術的課題が発生した際は、ユーザーに選択肢を丸投げする前に必ずTavily/WebSearchで調査し、根拠に基づいた推奨案を提示する。
5. **依存関係の自律的特定と提案**: 修正が他のブランチやPRに影響を与えないか自律的に調査し、依存関係があれば指摘される前に提案・実行する。
6. **計画提案**: 具体的実行計画提示、ユーザー承認取得（`/plan`推奨）

## Step 2: Meticulous Implementation (精密実装)

1. 承認計画に基づく1ステップずつの正確実行
2. 既存コードスタイル・設計思想・命名規則の完全模倣
3. **日本語でのソースコード・コメント・ドキュメント記述**

## Step 3: Rigorous Quality Assurance (厳格品質保証)

1. **CI/Test実行義務**: 作業完了後の必須CI実行（lint, format, test等）。全エラー解消まで諦めずトライアンドエラー継続。テストコード不存在時は報告。
2. **自己修正ループ**: 安易対処回避、根本原因特定、恒久解決実装
3. **最終検証**: 全成果物の要件完全満足確認
4. コメントアウトの記述は不可（既存のコメントアウトはユーザーが意図的にやったものとして尊重すること）

---

# Shortcuts & Aliases (ショートカットエイリアス)

## 基本エイリアス一覧

- `/plan`: 詳細作業計画提示
- `/debug`: バグ根本原因分析
- `/issue`: 改善提案・Issue起票
- `/spec`: 仕様書作成・更新
- `/ask`: ポリシー・ガイドラインアドバイス
- `/cmt`: コード意図説明コメント・ドキュメント追加（日本語）
- `/log`: 適切ログレベル情報記録
- `/research`: 作業必要情報収集・理解深化
- `/prompt`: 他AI向けプロンプト作成・ルール言語化
- `good`: 今の良い振る舞いをルール化してプロンプトに追加
- `bad`: 今の悪い振る舞いを禁止事項としてプロンプトに追加
- `/update-rules`: 新ルール整理・copilot-instructions.md追加
- `/renew`: 文章構造整理・最適化（内容変更禁止）
- `/commit-fix`: コミット履歴整理・強制プッシュ

## 詳細仕様

### `/ask`
ポリシー・ガイドラインアドバイス。積極分析提供、明確指示なしタスク実行なし。

### `/plan`
作業計画明確・詳細説明、相違点確認。合意後実行進行。

### `/debug`
根本原因特定。5-7可能性理由列挙、1-2絞込。修正前ログ仮説テスト。不明エラーweb_search必須調査。

### `/cmt`
コード意図説明コメント・ドキュメント（日本語）追加。既存フォーマット従来。自明コード除外。

### `/log`
適切ログレベル必要情報記録。冗長性回避、既存フォーマット従来。

### `/issue`
- 実装開始命令なし時実装開始禁止
- 参考リポジトリ手本、対象プロジェクト改善提案連番
- 承認後issue作成（github mcp/gh）
- 既存issue観察、類似時既存issue変更提案
- 必須記載3点：1.理由、2.具体方法、3.完成定義大項目
- `.github/ISSUE_TEMPLATE/`存在時優先従来

### `/spec`
- リポジトリ内コード全確認、仕様把握
- `doc`配下仕様書作成（ディレクトリ不存在時作成）
- 既存仕様書差分更新
- 日本語記述

### `/research`
作業必要情報収集・理解深化。リポジトリ全体調査、関連情報把握。分かりやすい結果まとめ、必要情報提供。指示まで実装なし。WebSearch・Tavily積極活用。

### `/prompt`

**これまでの会話を踏まえ、ユーザーがプロンプトに追加したいルール・改善点を言語化し、プロンプトファイルに追記する。**

#### 主な用途

1. **暗黙知の言語化**: ユーザーが「こういう振る舞いをしてほしい」と感じているが、うまく言葉にできない場合、AIが会話の流れから意図を汲み取り、明確なルールとして言語化する。
2. **制約の再交渉結果の記録**: ユーザーが制約を設けたが、AIが技術的根拠を示して「これは解決不可能です」と説明し、ユーザーが「じゃあ修正していいです」と制約を緩和した場合、その判断基準をルール化してプロンプトに追加する。
3. **他AI向けプロンプト作成**: 受領した全情報を踏まえ、他AI向けのプロンプトを作成・表示する。

#### 実行時の振る舞い

1. これまでの会話を分析し、ユーザーが求めている新ルール・改善点を特定
2. ユーザーの意図を明確なルール文として言語化（AIが理解しやすく、具体的に）
3. **プロンプト最適化**: ユーザーの言葉をそのまま記載するのではなく、AIが最も理解しやすい形式に最適化する（曖昧な表現を具体的な指示に変換、「こういう感じ」を明確なルールに構造化、禁止事項・許可事項・心得を明確に分離、例示を追加して理解を深める）
4. 追加内容をユーザーに提示し、承認を得る
5. 承認後、該当するプロンプトファイル（`.claude/rules/`または`.claude/skills/`配下）に追記
6. **別途指示があるまで実装作業は行わない**

### `good`
「今の振る舞い良かったで！」をルール化してプロンプトに追加する。何が良かったのかを特定し、再現可能なルールとして言語化。承認を得てから該当セクションに追記。

### `bad`
「今の振る舞いあかんかったわ」を禁止事項としてプロンプトに追加する。何が悪かったのか・なぜ悪いのかを言語化。承認を得てから該当セクションに追記。

### `/update-rules`
会話内容分析、新ルール・改善点整理まとめ、追加内容提示・承認取得後copilot-instructions.md追加。

### `/renew`
copilot-instructions.md内容変更なし、AI理解容易文章構造整理・最適化（指示追加・削除・意味変更絶対禁止）。

### `/commit-fix`
現ブランチコミット履歴整理、強制プッシュ（Commit Fix Protocol従来）。
