# Claude 向けの instructions の置き場

## Instructions一覧

このドキュメントはGitHub CopilotとClaude両対応のAI指示システムです。全てのAI（Copilot, Claude）は
`prompt/instructions/`配下の同じinstructionsファイルを読みます。Claudeはそれに加えて、常時読み込みが
必要な部分だけを`.claude/rules/`に、手順・条件付きの部分を`.claude/skills/rule-*/`に持ちます
（`prompt/instructions/`の原本は変更していません）。

### 常時読み込み（`.claude/rules/`、思想・判断基準のみ）

| ファイル | 対応する詳細skill |
|---------|-------------------|
| core-mission.instructions.md | `rule-core-mission` |
| prohibitions.instructions.md | `rule-prohibitions` |
| intentional-execution.instructions.md | `rule-intentional-execution` |

### 手順・条件付き（`.claude/skills/rule-*/`、該当作業時にClaude自身が判断して読む）

| skill名 | 発火場面 |
|--------|---------|
| `rule-workflow` | 実装・調査・計画・エージェント委任 |
| `rule-quality` | コードの実装・修正・Biome・TDD |
| `rule-typescript` | `.ts`/`.tsx`編集 |
| `rule-prisma` | `.prisma`編集 |
| `rule-code-review` | PRレビュー |
| `rule-performance` | MCP設定・エージェント設計・実行効率 |
| `rule-data-driven-execution` | 4件以上のタスク処理・調査・デバッグ・完了報告 |
| `rule-session-resilience` | 長時間セッション・スクリーンショット確認 |
| `rule-planning-dual-proposal` | プランニング・設計フェーズ |
| `rule-pre-mortem` | 新機能実装・リファクタリング（task-app固有の補足。一般手順はglobal skill `pre-mortem`） |
| `rule-persona` | 人格の追加詳細を確認したい時（人格の核はglobal常時読み込み） |

人格（`persona.instructions.md`）はglobalの`~/.claude/rules/persona.md`が同じ役割を果たすため、
project側には常時読み込み分を置いていません。自明コメント禁止（`no-obvious-comments.md`）も
globalのskill `no-obvious-comments` が同内容を上位互換でカバーします。

### Copilot向けの条件付きinstructions（Claudeは該当作業時に`prompt/instructions/`を直接参照）

| ファイル | 対象 |
|---------|------|
| python.instructions.md | `**/*.py`（edu-creator専用） |
| edu-creator.instructions.md | `**/edu-creator/**` |
| curriculum-quality-gate.instructions.md | `material/**` |
| github-project.instructions.md | `**`（GitHub Projectフィールド設定） |
| ecc-*.md（12ファイル） | 言語別コーディング規約・パターン・セキュリティ・テスト |

## コマンド & ショートカット

基本コマンド一覧と詳細仕様は skill `rule-workflow` を参照（`/plan`, `/debug`, `/issue`, `/spec`,
`/ask`, `/cmt`, `/log`, `/research`, `/prompt`, `good`, `bad`, `/update-rules`, `/renew`, `/commit-fix`）。

**詳細なルールは各instructionsファイル・skillファイルを参照してください。**
**全てのAI（Copilot, Claude）は`prompt/instructions/`の同じプロンプトを読み、同じルールで動作します。**
