# /mcp-optimize - MCP Context Management Command

## Pre-requisite

Before executing this command, read the full contents of `prompt/instructions/performance.md`.

## Purpose
MCPサーバー設定を最適化し、コンテキストウィンドウを効率的に管理する

## Trigger
ユーザーが `mcp-optimize` またはコマンドボタンから実行

## Background
- 200k コンテキストが 70k まで縮小する可能性あり
- MCP有効化は10個以下に抑える必要あり
- 有効なツールは80個以下に制限

## Workflow

### Step 1: Current MCP Analysis
- 現在有効なMCPサーバーを列挙
- 各MCPが提供するツール数を集計
- 実際に使用されているMCPを特定

### Step 2: Usage Audit
過去のセッションから：
- 最頻出のMCPを分析
- 未使用のMCPを特定
- プロジェクト毎の必要MCP一覧

### Step 3: Optimization Recommendations
- 優先度付けされたMCP一覧
- プロジェクト別有効化戦略
- ツール削減提案

### Step 4: Configuration Update
- .claude.json更新
- disabledMcpServers設定
- プロジェクト固有の設定

### Step 5: Verification
- コンテキストウィンドウサイズ確認
- パフォーマンス検証

## Output Format

```markdown
# MCP Optimization Report

## Current Configuration
- **Total MCPs**: [数]
- **Active MCPs**: [数]
- **Total Tools**: [数]
- **Context Window Impact**: [推定値]

## MCP Usage Analysis

### Most Used MCPs (実装1ヶ月分)
1. \`mcp_github\` - 45% usage
2. \`mcp_filesystem\` - 25% usage
3. \`mcp_playwright\` - 15% usage
4. Others - 15% usage

### Unused MCPs
- \`mcp_figma_*\` - Not used in past month
- \`mcp_example\` - Outdated

## Project-Specific Recommendations

### Mypappy Web Project
**Recommended Active MCPs** (8 total):
1. ✅ mcp_github (PR, issues, commits)
2. ✅ mcp_filesystem (file ops)
3. ✅ mcp_playwright (browser testing)
4. ✅ mcp_puppeteer (element interaction)
5. ✅ mcp_postgres (database queries)
6. ✅ mcp_tavily (web search)
7. ✅ mcp_serena (semantic search)
8. ✅ mcp_gdrive (design docs)

**Disabled MCPs**:
- mcp_figma (use figma-design-reader agent instead)
- mcp_slack (not needed for web team)

### Mypappy API Project
**Recommended Active MCPs** (7 total):
1. ✅ mcp_github
2. ✅ mcp_filesystem
3. ✅ mcp_postgres
4. ✅ mcp_tavily
5. ✅ mcp_serena
6. ✅ mcp_bash (docker, npm commands)
7. ✅ mcp_gdrive

### Mypappy Native Project
**Recommended Active MCPs** (8 total):
1. ✅ mcp_github
2. ✅ mcp_filesystem
3. ✅ mcp_playwright (E2E testing)
4. ✅ mcp_tavily
5. ✅ mcp_serena
6. ✅ mcp_bash (metro, gradle)
7. ✅ mcp_gdrive
8. ✅ mcp_puppeteer

## Optimization Results

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Active MCPs | 18 | 8-9 | -50% |
| Total Tools | 156 | 72 | -54% |
| Est. Context Available | ~70k | ~150k | +114% |

## Implementation

### Update .claude.json
\`\`\`json
{
  "mcpServers": {
    // Keep these enabled (per project)
    "github": { ... },
    "filesystem": { ... },
    // Disable others
  },
  "disabledMcpServers": [
    "mcp_figma_*",
    "mcp_slack",
    "mcp_jira"
  ]
}
\`\`\`

### Agent-Based Alternative
Instead of enabling all MCPs:
- Use \`figma-design-reader\` agent for Figma
- Use \`code-reviewer\` agent for code analysis
- Use \`security-reviewer\` agent for security audits

## Monitoring
- [ ] Config updated
- [ ] Context window verified
- [ ] Performance tested
- [ ] Team notified

## Guidelines for Future
- Review MCP usage monthly
- Keep active MCPs ≤ 10 per project
- Prefer agents for specialized tasks
- Monitor context usage in sessions
```

## Agent Used
No dedicated agent - uses system analysis

## Related Resources
- `.claude.json` - MCP configuration
- `prompt/skills/performance-management.md` - Performance guide
- Agent system (preferred over MCPs for specialized tasks)

## Context Optimization Best Practices

1. **MCPファースト vs エージェントファースト**
   - MCPs: 汎用ツール（GitHub, filesystem, bash）
   - Agents: 専門的タスク（Figmaデザイン読み、セキュリティ）

2. **プロジェクト毎の設定**
   - ローカルプロジェクト設定で上書き
   - 不要なMCPは無効化

3. **セッション最適化**
   - 開始時に必要MCPのみ有効化
   - 終了後に状態をリセット
