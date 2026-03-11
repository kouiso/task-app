# Performance & Context Management Rules
<!-- パフォーマンス・コンテキスト管理ルール -->

**Based on**: Anthropic Hackathon Winner Framework (everything-claude-code)

## 1. Context Window Management
<!-- コンテキストウィンドウ管理 -->

### Problem
<!-- 問題 -->

**Enabling too many MCP servers significantly compresses the context window.**
<!-- MCPサーバーを有効化しすぎると、コンテキストウィンドウが大幅に圧縮される。 -->

```
Base Context Window: 200,000 tokens
─────────────────────────────────────

Impact of MCP enablement:
<!-- MCP有効化の影響 -->
- Filesystem (+8,000)    → Remaining 192k
- GitHub (+15,000)       → Remaining 177k
- Browser (+10,000)      → Remaining 167k (17% reduction)

Danger zone:
<!-- 危険ゾーン -->
- 10+ enabled            → Remaining < 100k (50% reduction) ⚠️
```

### Rules
<!-- ルール -->

**Keep MCP enablement to 10 or fewer.**
<!-- MCPの有効化は10個以下に抑えること。 -->

Recommended:
<!-- 推奨 -->
- Enable **3-5** per project
<!-- プロジェクトごとに -->
- Total enabled tools ≤ 80
<!-- 有効ツール総数 -->

### MCP Priority
<!-- MCP優先度 -->

#### Always Enable
<!-- 常に有効化 -->
- ✅ **Filesystem** - File operations (mandatory)
<!-- ファイル操作（必須） -->
- ✅ **GitHub** - PR/Issue management (recommended)
<!-- PR/Issue管理（推奨） -->

#### Enable Per Project
<!-- プロジェクト別に有効化 -->
- ⚠️ **Browser** - Only when web automation needed
<!-- Web自動化が必要な場合のみ -->
- ⚠️ **Database** - Only when DB access is needed
<!-- DBアクセスが必要な場合のみ -->

#### Disable by Default
<!-- デフォルト無効化 -->
- ❌ **Unused MCPs** - Enable when needed
<!-- 未使用MCP：必要になってから有効化 -->

### Context Monitoring
<!-- コンテキスト監視 -->

Target: **Maintain 140k+ tokens** (allow up to 30% reduction)
<!-- 目標：140k tokens以上を維持（30%削減まで許容） -->

## 2. Agent Design Principles
<!-- エージェント設計原則 -->

### Minimize Tools
<!-- ツール最小化 -->

**Give each agent only the minimal necessary tools.**
<!-- 各エージェントには必要最小限のツールだけを与える。 -->

```yaml
# ❌ Bad: Agent with 50 tools
tools: [Read, Write, Replace, Grep, Glob, Bash, SemanticSearch, ...]

# ✅ Good: Only necessary 5 tools
tools: [Read, Grep, Glob, Bash, Replace]
```

**Reasons:**
<!-- 理由 -->
- Fewer tools = faster execution
<!-- ツール数が少ない = 実行が高速 -->
- Maintains focus
<!-- フォーカスが維持される -->
- Saves context window
<!-- コンテキストウィンドウ節約 -->

### Efficient Agent Delegation
<!-- エージェント委任の効率化 -->

```typescript
// ✅ Good: Delegate to specialized agent
runSubagent({
  agent: 'security-reviewer',
  tools: ['Read', 'Grep', 'Bash'],  // Minimal
  task: 'Review for OWASP Top 10 vulnerabilities'
});

// ❌ Bad: Main agent does everything (slow)
// Execute review yourself using all tools
```

## 3. Performance Optimization
<!-- パフォーマンス最適化 -->

### Agent Execution Time
<!-- エージェント実行時間 -->

**Targets:**
<!-- 目標 -->
- Agent startup: **< 2 seconds**
<!-- エージェント起動 -->
- Command execution: **< 30 seconds**
<!-- コマンド実行 -->
- Test execution: **< 10 seconds**
<!-- テスト実行 -->

### Parallel Execution
<!-- 並列実行 -->

**Execute independent tasks in parallel.**
<!-- 独立したタスクは並列実行すること。 -->

```typescript
// ✅ Good: Parallel execution
const [archReview, secReview, perfReview] = await Promise.all([
  runSubagent({ agent: 'architect', ... }),
  runSubagent({ agent: 'security-reviewer', ... }),
  runSubagent({ agent: 'performance-reviewer', ... }),
]);

// ❌ Bad: Sequential execution (3x slower)
const archReview = await runSubagent({ agent: 'architect', ... });
const secReview = await runSubagent({ agent: 'security-reviewer', ... });
const perfReview = await runSubagent({ agent: 'performance-reviewer', ... });
```

### Cache Utilization
<!-- キャッシング活用 -->

**Avoid re-reading the same information.**
<!-- 同じ情報の再読み込みを避ける。 -->

```typescript
// ✅ Good: Read once and cache
const code = await read('src/user.ts');
// Use same code for multiple analyses

// ❌ Bad: Read multiple times
const code1 = await read('src/user.ts');  // Analysis 1
const code2 = await read('src/user.ts');  // Analysis 2 (wasteful)
```

## 4. Resource Efficiency
<!-- リソース効率化 -->

### File Reading
<!-- ファイル読み込み -->

```typescript
// ✅ Good: Only necessary range
read('file.ts', { startLine: 10, endLine: 50 });

// ❌ Bad: Entire file (inefficient for large files)
read('file.ts');
```

### Efficient Searching
<!-- 検索効率化 -->

```typescript
// ✅ Good: Specific pattern
grep('function calculateTotal', { includePattern: 'src/**/*.ts' });

// ❌ Bad: Ambiguous search (too many results)
grep('calculate');
```

### Bash Execution
<!-- Bash実行 -->

```typescript
// ✅ Good: Narrow down results
bash('npm test -- --testNamePattern="UserService" --silent');

// ❌ Bad: Full output (context pressure)
bash('npm test');
```

## 5. Model Selection Strategy
<!-- モデル選択戦略 -->

### Model Selection by Task
<!-- タスク別モデル選択 -->

| Task | Model | Reason |
|--------|--------|------|
| Architecture design | opus | Complex decisions required |
| Security review | opus | Strict analysis required |
| Code review | sonnet | Good balance |
| Test implementation | sonnet | Fast, sufficient quality |
| Build error resolution | sonnet | Fast, sufficient quality |
| Code cleanup | sonnet | Fast, sufficient quality |

### Cost Optimization
<!-- コスト最適化 -->

```
Low complexity  → sonnet (fast, low cost)
High complexity → opus   (high quality, slightly slower)

Basic policy: Use sonnet when sufficient
```

## 6. Performance Metrics
<!-- パフォーマンスメトリクス -->

### Metrics to Measure
<!-- 測定項目 -->

| Metric | Target | Measurement Method |
|-----------|--------|---------|
| Context efficiency | ≥ 140k tokens | MCP log |
| Agent startup time | < 2 sec | Tool execution log |
| Command execution time | < 30 sec | Session log |
| Test execution time | < 10 sec | `npm test` output |
| Build time | < 30 sec | `npm run build` output |

### Regular Monitoring
<!-- 定期監視 -->

```bash
# Weekly check
- [ ] Context window usage
- [ ] Agent execution time
- [ ] Test execution speed
- [ ] Build time
```

When improvement is needed:
<!-- 改善が必要な場合 -->
1. Reduce number of enabled MCPs
<!-- MCP有効化数を削減 -->
2. Optimize agent tool sets
<!-- エージェントツールセットを最適化 -->
3. Enable parallel test execution
<!-- テスト並列実行を有効化 -->
4. Utilize build cache
<!-- ビルドキャッシュを活用 -->

## Best Practices
<!-- ベストプラクティス -->

- **Measure First**: Measure current state before optimization
<!-- 最適化前に現状を測定 -->
- **Optimize Bottlenecks**: Improve bottlenecks first
<!-- ボトルネックから優先的に改善 -->
- **Keep It Simple**: Avoid excessive optimization
<!-- 過度な最適化は避ける -->
- **Monitor Continuously**: Regularly check metrics
<!-- 定期的にメトリクスを確認 -->
- **Balance Quality & Speed**: Optimize within limits that don't sacrifice quality
<!-- 品質を犠牲にしない範囲で高速化 -->

## 7. Tool Loading Strategy

### Tool Search Tool (MCP Lazy Loading)

When Tool Search Tool is available in the environment:

- **Do NOT assume all MCP tools are loaded at startup**
- Use `ToolSearch` to find and load tools on demand
- Token savings: 50+ tool environments reduce from ~77,000 to ~8,700 initial tokens (85% reduction)

### CLI + Skills vs MCP Decision Matrix

| Need | Use | Reason |
|------|-----|--------|
| Single command, one-shot | CLI + Skill | ~225 tokens vs MCP thousands |
| Stateful multi-step workflow | MCP | Session management |
| Debug transparency needed | CLI + Skill | Local, inspectable |
| Auth / secure access | MCP | Robust access layer |

**Approach**: Start with CLI. Escalate to MCP when complexity requires it.

See also: `data-driven-execution.md` Section 8 for full protocol.

## Related
<!-- 関連 -->

- `prompt/instructions/autonomous-execution.md` - Agent delegation rules
<!-- エージェント委任ルール -->
