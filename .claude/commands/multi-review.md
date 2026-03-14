# Multi-Agent Collaborative Review

## Pre-requisite

Before executing this command, read the full contents of `prompt/instructions/code-review-templates.md`.

**Trigger**: `/multi-review` command, or automatically when user requests "review", "振り返り", "自己レビュー"

Multiple specialized subagents conduct parallel reviews simultaneously. When there are divergences in opinions, they debate in courtroom style to prevent self-contradictions and produce higher-quality review results.

<!-- 複数の専門分野を持つsubagentが同時に並列レビューを行い、意見の相違がある場合は裁判形式で議論させることで、自己矛盾を防ぎ、より質の高いレビュー結果を生み出します。 -->

## Review Perspectives

<!-- レビュー観点 -->

All reviewers must follow:

<!-- 全reviewerは以下に必ず従う -->

- `prompt/instructions/code-review.md`
- `prompt/skills/review-perspectives.md`

## Execution Flow

<!-- 実行フロー -->

### Phase 1: Independent Reviews (Parallel Execution)

<!-- フェーズ1：独立レビュー（並列実行） -->

Launch the following 6 subagents **simultaneously**, each conducting an independent review:

<!-- 以下の6つのsubagentを**同時に**起動し、各々が独立してレビュー: -->

1. **Architecture Reviewer** (`prompt/agents/architect.md`)
   - System design and architecture consistency
   <!-- システム設計・アーキテクチャ整合性 -->

2. **Security Reviewer** (`prompt/agents/security-reviewer.md`)
   - Security vulnerabilities and OWASP Top 10 compliance
   <!-- セキュリティ脆弱性・OWASP Top 10準拠 -->

3. **Performance Reviewer** (use generic agent)
   <!-- 汎用agent使用 -->
   - Performance, optimization, memory efficiency
   <!-- パフォーマンス・最適化・メモリ効率 -->
   - Focus: Algorithm complexity, N+1 problems, caching
   <!-- アルゴリズム複雑度、N+1問題、キャッシング -->

4. **Code Quality Reviewer** (`prompt/agents/code-reviewer.md`)
   - Code quality, maintainability, SOLID principles
   <!-- コード品質・保守性・SOLID原則 -->

5. **Testing Reviewer** (`prompt/agents/tdd-guide.md`)
   - Test coverage, test quality, edge cases
   <!-- テストカバレッジ・テスト品質・エッジケース -->

6. **Business Logic Reviewer** (use generic agent)
   <!-- 汎用agent使用 -->
   - Business logic accuracy and requirement fulfillment
   <!-- ビジネスロジック正確性・要件充足 -->
   - Focus: Alignment with requirements, edge case handling, data integrity
   <!-- 要件との整合性、エッジケース処理、データ整合性 -->

### Phase 2: Divergence Detection

<!-- フェーズ2：相違検出 -->

Compare opinions from each reviewer and automatically extract divergence points:

<!-- 各reviewerの意見を比較し、相違点を自動抽出: -->

```markdown
## Divergences Detected

<!-- 検出された相違点 -->

### Divergence #1: Caching Strategy

<!-- キャッシング戦略 -->

- **Architecture Reviewer**: Against due to increased complexity
<!-- 複雑度が増すため反対 -->
- **Performance Reviewer**: Required for performance improvement
<!-- パフォーマンス向上のため必須 -->
- **Severity**: Medium
```

### Phase 3: Deliberation (Courtroom-Style Debate)

<!-- フェーズ3：議論（裁判形式議論） -->

For divergent points, relevant subagents debate:

<!-- 意見が分かれたポイントについて、該当するsubagent同士が議論: -->

```
[Round 1]
┌─ Question Clarification ─┐
│ Master: "How to evaluate trade-off between caching complexity vs performance improvement?" │
<!-- マスター：「キャッシングの複雑度 vs パフォーマンス向上のトレードオフをどう評価するか？」 -->
└───────────────────────────┘

┌─ Position Statements ─┐
│ Architecture Reviewer:
│ - Position: Cache logic increases complexity by 20%
<!-- 立場：キャッシュロジックが複雑度を20%増加させる -->
│ - Rationale: Decreased maintainability, bug contamination risk
<!-- 根拠：保守性低下、バグ混入リスク -->
│
│ Performance Reviewer:
│ - Position: Response time improves by 50%
<!-- 立場：レスポンス時間が50%改善 -->
│ - Rationale: Benchmark results, improved user experience
<!-- 根拠：ベンチマーク結果、ユーザー体験向上 -->
└───────────────────────┘

┌─ Counter-Arguments ─┐
│ Arch → Perf: "Is 50% improvement measured or estimated? Is maintenance cost considered?"
<!-- 「50%改善は実測か推定か？保守コストを考慮しているか？」 -->
│ Perf → Arch: "Isn't 20% complexity increase acceptable? Can it be covered by tests?"
<!-- 「複雑度20%増は許容範囲では？テストでカバー可能では？」 -->
└──────────────────────┘

┌─ Master Analysis ─┐
│ ・Performance improvement is reliable based on actual measurements
<!-- パフォーマンス改善は実測ベースで信頼性高い -->
│ ・Complexity increase can be mitigated with proper tests and documentation
<!-- 複雑度増加は適切なテストとドキュメントで緩和可能 -->
│ ・Significant impact on user experience
<!-- ユーザー体験への影響大 -->
└────────────────────┘

[Convergence Status]: In progress → Proceed to Round 2
<!-- 進行中 → Round 2へ -->
```

Debate ends under the following conditions:

<!-- 議論は以下の条件で終了: -->

- **Explicit Agreement**: Both sides support the same conclusion
<!-- 明示的合意：両者が同じ結論を支持 -->
- **Majority Agreement**: 3 or more reviewers support the same side
<!-- 多数派合意：3以上のレビュアーが同じ側を支持 -->
- **Compromise Agreement**: Solution that addresses both concerns
<!-- 折衷案合意：両者の懸念を両立させるソリューション -->
- **Business Priority Agreement**: Judgment based on project values
<!-- ビジネス優先合意：プロジェクト価値観に基づく判定 -->
- **Forced Termination**: Reached 5 rounds, same repetition 4 times, timeout
<!-- 強制終了：5ラウンド到達、同じ繰り返し4回、タイムアウト -->

### Phase 4: Final Report

<!-- フェーズ4：最終レポート -->

```markdown
# Multi-Agent Review Report

## Overall Assessment

🟢 **Pass with Recommendations**

## Consensus Items (Unanimous Agreement)

<!-- 全員同意 -->

✅ Sufficient test coverage

<!-- テストカバレッジが十分 -->

✅ Appropriate security measures

<!-- セキュリティ対策が適切 -->

✅ High code quality

<!-- コード品質が高い -->

## Resolved Divergences

<!-- 解決済み相違点 -->

### 1. Caching Strategy

<!-- キャッシング戦略 -->

**Initial Positions:**

- Architecture: Against (complexity concerns)
<!-- 反対（複雑度懸念） -->
- Performance: Recommend (performance improvement)
<!-- 推奨（パフォーマンス向上） -->

**Discussion Summary:**

<!-- 議論サマリー -->

- 3 rounds of debate
<!-- 3ラウンドの議論 -->
- Presented performance measurement results
<!-- パフォーマンス測定結果の提示 -->
- Proposed test coverage plan
<!-- テストカバレッジ計画の提案 -->

**Final Consensus:**
✅ **Adopt (with conditions)**

<!-- 採用（条件付き） -->

- Condition 1: Test coverage ≥ 80%
<!-- 80%以上のテストカバレッジ -->
- Condition 2: Create detailed documentation
<!-- 詳細なドキュメント作成 -->
- Condition 3: Implement performance monitoring
<!-- パフォーマンス監視の実装 -->

**Rationale:**
Significant impact on user experience, complexity risk can be mitigated with proper tests and documentation

<!-- ユーザー体験への影響が大きく、適切なテストとドキュメントで複雑度リスクを緩和可能 -->

## Recommendations by Priority

<!-- 優先度別推奨事項 -->

### 🔴 Critical

1. [Security] Move hardcoded API keys to environment variables
<!-- ハードコードされたAPIキーを環境変数化 -->

### 🟡 High

1. [Performance] Resolve N+1 query problem
<!-- N+1クエリ問題の解決 -->
2. [Testing] Add edge case tests
<!-- エッジケースのテスト追加 -->

### 🟢 Medium

1. [Code Quality] Reduce function complexity
<!-- 関数の複雑度削減 -->
2. [Architecture] Improve layer separation
<!-- レイヤー分離の改善 -->

## Metrics

- Reviewers Participated: 6
- Divergences Found: 3
- Divergences Resolved: 3
- Deliberation Rounds: Average 2.3
- Confidence Level: High (85%)
```

## User Interaction

<!-- ユーザーインタラクション -->

### Re-Debate When Dissatisfied

<!-- 不納得時の再議論 -->

```
User: "Isn't the security judgment too strict?"
<!-- 「セキュリティの判定が厳しすぎないか？」 -->
↓
Copilot: "Starting re-debate with Security Reviewer"
<!-- 「Security Reviewerとの再議論を開始します」 -->
↓
[Re-debate relevant divergence point]
<!-- 該当する相違点の再議論 -->
↓
[Present revised report]
<!-- 改訂されたレポート提示 -->
```

### Detailed Drill-Down

<!-- 詳細掘り下げ -->

```
User: "More details on Business Logic perspective"
<!-- 「Business Logicの観点をもっと詳しく」 -->
↓
Copilot: "Executing detailed analysis by Business Logic Reviewer"
<!-- 「Business Logic Reviewerの詳細分析を実行します」 -->
↓
[Present detailed report]
<!-- 詳細レポート提示 -->
```

## Implementation Notes

<!-- 実装ノート -->

### Subagent Invocation

<!-- Subagent起動 -->

```typescript
// Pseudo code
<!-- 疑似コード -->
async function multiAgentReview(target: ReviewTarget) {
  // Phase 1: Parallel Reviews
  const reviews = await Promise.all([
    runSubagent({
      agent: 'prompt/agents/architect.md',
      task: `Review ${target} from architecture perspective`,
    }),
    runSubagent({
      agent: 'prompt/agents/security-reviewer.md',
      task: `Review ${target} for security vulnerabilities`,
    }),
    // ... other reviewers
  ]);

  // Phase 2: Detect Divergences
  const divergences = detectDivergences(reviews);

  // Phase 3: Deliberate if needed
  if (divergences.length > 0) {
    for (const div of divergences) {
      const resolution = await deliberate(div);
      div.resolution = resolution;
    }
  }

  // Phase 4: Generate Report
  return generateFinalReport(reviews, divergences);
}
```

### Deliberation Mechanism

<!-- 議論メカニズム -->

Execute the following in each round:

<!-- 各ラウンドで以下を実行: -->

1. Master presents question
<!-- Masterが質問を提示 -->
2. Both agents present positions and rationale
<!-- 両側のAgentが立場・根拠を提示 -->
3. Mutual rebuttal
<!-- 相互に反論 -->
4. Master analyzes and evaluates
<!-- Masterが分析・評価 -->
5. Convergence judgment
<!-- 収束判定 -->

## Best Practices

<!-- ベストプラクティス -->

- **View-Based Not File-Based**: Each expert views the whole picture
<!-- ファイル単位ではなく視点単位：各専門家が全体を見る -->
- **Independent Review**: Each agent reviews without seeing others' opinions
<!-- 独立レビュー：各agentは他のagentの意見を見ずにレビュー -->
- **Record Debate**: Preserve all debate processes
<!-- 議論の記録：すべての議論プロセスを保持 -->
- **Transparency**: User can track debate process
<!-- 透明性：ユーザーは議論過程を追跡可能 -->
- **Escalation**: Re-debate if user is not satisfied
<!-- エスカレーション：ユーザーが納得できない場合は再議論 -->

---

## Agent Teams Interface Contract

<!-- マルチエージェント並列作業時のインターフェース不整合防止 -->

When multiple agents work in parallel (Agent Teams), interface mismatches are the #1 failure mode. Prevent with:

<!-- 複数エージェントが並列で作業する場合、インターフェースの不整合が最大の失敗要因。以下で防止: -->

1. **Single Owner for Shared Types**: Only ONE agent may modify shared type definition files (types.ts, interfaces/, schemas/)
   <!-- 共有型定義ファイルの変更は1エージェントのみが担当 -->
2. **Pre-Work Interface Check**: Each agent MUST read current shared interface definitions before starting work
   <!-- 各エージェントは作業開始前に共有インターフェースの現在の型定義を確認 -->
3. **Interface Change Notification**: If an interface change is needed, notify all other agents before executing
   <!-- インターフェース変更が必要な場合、他エージェントに通知してから実行 -->
4. **Contract Testing**: After parallel work completes, run integration tests across all agent boundaries before merging
   <!-- 並列作業完了後、マージ前に全エージェント境界の結合テストを実行 -->
