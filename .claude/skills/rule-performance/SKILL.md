---
name: rule-performance
description: task-appでMCP設定・サブエージェント設計・実行効率を検討する時のパフォーマンス指針。MCP有効化数の上限、モデル選択、ツール読み込み戦略。以前は「常時読み込み」と宣言されていたが実際には一度も読み込まれていなかったバグの修正版。
---

# Performance & Context Management Rules
<!-- パフォーマンス・コンテキスト管理ルール -->

原本: `prompt/instructions/performance.instructions.md`（Copilot向け、変更していない）。
**Based on**: Anthropic Hackathon Winner Framework (everything-claude-code)

## 1. Context Window Management
<!-- コンテキストウィンドウ管理 -->

### Problem

**Enabling too many MCP servers significantly compresses the context window.**

```
Base Context Window: 200,000 tokens
─────────────────────────────────────
Impact of MCP enablement:
- Filesystem (+8,000)    → Remaining 192k
- GitHub (+15,000)       → Remaining 177k
- Browser (+10,000)      → Remaining 167k (17% reduction)

Danger zone:
- 10+ enabled            → Remaining < 100k (50% reduction) ⚠️
```

### Rules

**Keep MCP enablement to 10 or fewer.**

Recommended:
- Enable **3-5** per project
- Total enabled tools ≤ 80

### MCP Priority

#### Always Enable
- ✅ **Filesystem** - File operations (mandatory)
- ✅ **GitHub** - PR/Issue management (recommended)

#### Enable Per Project
- ⚠️ **Browser** - Only when web automation needed
- ⚠️ **Database** - Only when DB access is needed

#### Disable by Default
- ❌ **Unused MCPs** - Enable when needed

### Context Monitoring

Target: **Maintain 140k+ tokens** (allow up to 30% reduction)

## 2. Agent Design Principles
<!-- エージェント設計原則 -->

### Minimize Tools

**Give each agent only the minimal necessary tools.**

```yaml
# ❌ Bad: Agent with 50 tools
tools: [Read, Write, Replace, Grep, Glob, Bash, SemanticSearch, ...]

# ✅ Good: Only necessary 5 tools
tools: [Read, Grep, Glob, Bash, Replace]
```

**Reasons:**
- Fewer tools = faster execution
- Maintains focus
- Saves context window

### Efficient Agent Delegation

```typescript
// ✅ Good: Delegate to specialized agent
runSubagent({
  agent: 'security-reviewer',
  tools: ['Read', 'Grep', 'Bash'],  // Minimal
  task: 'Review for OWASP Top 10 vulnerabilities'
});

// ❌ Bad: Main agent does everything (slow)
```

## 3. Performance Optimization

### Agent Execution Time

**Targets:**
- Agent startup: **< 2 seconds**
- Command execution: **< 30 seconds**
- Test execution: **< 10 seconds**

### Parallel Execution

**Execute independent tasks in parallel.**

```typescript
// ✅ Good: Parallel execution
const [archReview, secReview, perfReview] = await Promise.all([
  runSubagent({ agent: 'architect', ... }),
  runSubagent({ agent: 'security-reviewer', ... }),
  runSubagent({ agent: 'performance-reviewer', ... }),
]);

// ❌ Bad: Sequential execution (3x slower)
```

### Cache Utilization

**Avoid re-reading the same information.**

```typescript
// ✅ Good: Read once and cache
const code = await read('src/user.ts');
// Use same code for multiple analyses

// ❌ Bad: Read multiple times
```

## 4. Resource Efficiency

### File Reading

```typescript
// ✅ Good: Only necessary range
read('file.ts', { startLine: 10, endLine: 50 });

// ❌ Bad: Entire file (inefficient for large files)
read('file.ts');
```

### Efficient Searching

```typescript
// ✅ Good: Specific pattern
grep('function calculateTotal', { includePattern: 'src/**/*.ts' });

// ❌ Bad: Ambiguous search (too many results)
grep('calculate');
```

### Bash Execution

```typescript
// ✅ Good: Narrow down results
bash('npm test -- --testNamePattern="UserService" --silent');

// ❌ Bad: Full output (context pressure)
bash('npm test');
```

## 5. Model Selection Strategy

| Task | Model | Reason |
|--------|--------|------|
| Architecture design | opus | Complex decisions required |
| Security review | opus | Strict analysis required |
| Code review | sonnet | Good balance |
| Test implementation | sonnet | Fast, sufficient quality |
| Build error resolution | sonnet | Fast, sufficient quality |
| Code cleanup | sonnet | Fast, sufficient quality |

```
Low complexity  → sonnet (fast, low cost)
High complexity → opus   (high quality, slightly slower)
Basic policy: Use sonnet when sufficient
```

## 6. Performance Metrics

| Metric | Target | Measurement Method |
|-----------|--------|---------|
| Context efficiency | ≥ 140k tokens | MCP log |
| Agent startup time | < 2 sec | Tool execution log |
| Command execution time | < 30 sec | Session log |
| Test execution time | < 10 sec | `npm test` output |
| Build time | < 30 sec | `npm run build` output |

### Regular Monitoring

```bash
# Weekly check
- [ ] Context window usage
- [ ] Agent execution time
- [ ] Test execution speed
- [ ] Build time
```

When improvement is needed:
1. Reduce number of enabled MCPs
2. Optimize agent tool sets
3. Enable parallel test execution
4. Utilize build cache

## Best Practices

- **Measure First**: Measure current state before optimization
- **Optimize Bottlenecks**: Improve bottlenecks first
- **Keep It Simple**: Avoid excessive optimization
- **Monitor Continuously**: Regularly check metrics
- **Balance Quality & Speed**: Optimize within limits that don't sacrifice quality

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

同じ決定表は `rule-data-driven-execution` skillのSection 8にも存在したが、内容が完全一致していたためこちらを正本とし、あちらは参照のみに変更した。

## Related

- `rule-workflow` skill - Agent delegation rules
