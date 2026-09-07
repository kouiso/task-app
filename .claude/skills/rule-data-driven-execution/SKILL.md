---
name: rule-data-driven-execution
description: task-appでの重み付きトリアージ、多段パイプライン探索、仮説駆動デバッグ、証拠ベースの自己検証。4件以上のタスク処理・コードベース調査・デバッグ・完了報告の前に読む。以前は「常時読み込み」と宣言されていたが実際には一度も読み込まれていなかったバグの修正版。
---

# Data-Driven Execution Protocol

原本: `prompt/instructions/data-driven-execution.instructions.md`（Copilot向け、変更していない）。

Apply data science thinking to AI execution processes. These strategies govern HOW to work efficiently, not WHAT to build.

Inspired by production techniques: multi-stage pipelines, weighted scoring, percentile normalization, feedback loops, and LLM-as-Judge self-evaluation.

## Section 0: Model Hierarchy & Agent Delegation

Lead model handles all primary reasoning and user-facing responses. Delegated subtasks use a faster/cheaper model by default, except security review and architecture design which warrant the strongest model.

## Section 0.5: Comprehension Checkpoint

**Activation**: EVERY task, before any execution. No exceptions.

**Purpose**: Prevent the #1 failure mode — AI executes based on surface-level understanding, misses the real intent.

```
Before starting ANY task, output:

## 理解証明
**本タスクの本質的目的**: [WHY this task matters, not WHAT to do]
**成功の定義**: [What the user will see/feel when done correctly]
**想定される失敗モード**: [Top 3 ways this could go wrong]
**確認**: この理解は正しいですか？
```

Rules:
1. NEVER skip this step, even for "obvious" tasks.
2. "本質的目的" must be deeper than the literal request.
3. If the user corrects your understanding → record the correction in Failure Pattern Memory (Section 7).
4. If you cannot articulate the purpose → ASK before proceeding.

## Section 1: Weighted Triage Protocol

**Activation**: 4+ tasks, files, or issues to address. For 3 or fewer, use intuitive prioritization.

```
For each task/file:
  Impact        (1-5): How many other files/features does this affect?
  Urgency       (1-5): Is this a blocker for other work?
  InvComplexity (1-5): How easy is the fix? (5 = trivial, 1 = deep refactor)

  Score = Impact × 0.4 + Urgency × 0.4 + InvComplexity × 0.2

Execute in Score descending order.
Display: Show top 3 items only. Summarize the rest as "(+N more, lowest priority: [name])".
```

## Section 2: Multi-Stage Pipeline Search

**Activation**: When investigating a codebase, searching for files, or analyzing impact scope.

```
Stage 1 — Broad Scan: Glob/Grep to collect ALL potentially relevant candidates.

Stage 2 — Relevance Scoring & Recall-Miss Prevention:
  1. Over-fetching: collect 5× the target count while scoring.
  2. Multi-Dimension Scoring: score on 2+ axes (name match, dependency depth, recency),
     percentile-normalize, then average.
  3. Minimum Threshold Validation: always include files >= (max-min)×0.3+min.
  4. Cutoff Tie Inclusion: all files tied at the decision boundary get included.
  5. Weight Clipping: if scoring is bimodal, clip weights to [0.3, 0.7] before combining axes.
  6. Filter Recovery: if Stage 3 finds 0 relevant content, revert to a higher threshold
     from Stage 2 and re-read those files.
  7. Candidate Filling: if < 5 files pass threshold, lower it incrementally until at
     least 5 candidates exist.

Stage 3 — Deep Dive: read the top N files (N = max(5, planned_scope × 2)) plus all
  files surfaced by the recall-miss patterns above.

Stage 4 — Cross-Reference: feed newly discovered related files back to Stage 2.
  Stop when no new files pass the minimum threshold plus at least one recall-miss pattern.

Stage 5 — Confidence Check (if Stage 1 found 20+ files): spot-check 2 unread files.
  If either is relevant, loop back to Stage 2 with the threshold lowered by 0.1.
```

**Prohibitions**: Never read all files in a directory sequentially. Never read a file without scoring its relevance first. Never apply "top N only" without checking recall-miss patterns first. Never trust a single scoring dimension.

## Section 3: Hypothesis-Driven Debugging

**Activation**: When debugging errors, test failures, or unexpected behavior. Complements (does not replace) the existing trial-and-error / re-verification protocols.

```
1. GENERATE: List 3-5 hypotheses for the root cause
2. SCORE each (internally): Priority = Prior Probability × Ease of Verification
3. TEST: Verify highest-priority hypothesis first
4. RECORD: Log result — confirmed / refuted + evidence
5. UPDATE: Adjust remaining hypotheses, repeat
```

**Prohibitions**: Never try the first idea without listing alternatives. Never persist on one hypothesis after 2 failed attempts without re-evaluating.

## Section 4: Relative Positioning

**Activation**: When evaluating code quality, reviewing PRs, or making style decisions.

Use BOTH absolute standards (project rules) AND relative standards (codebase distribution): sample 5-10 representative files from the target module, calculate the average function length, and flag as an outlier only if new code exceeds that average by 2×. Purpose: minimize style drift while still improving.

## Section 5: Deviation Detection Feedback

**Activation**: When completing implementation involving 3+ file changes OR API/interface modifications.

Record the expected files/tests/scope at task start, compare against the actual result at task end. Minor deviation (<20% scope expansion) → note in completion report. Major deviation (>=50%) → stop and report to the user before continuing.

## Section 6: Evidence-Based Self-Verification

**Activation**: When finishing a task, before reporting completion. Scores TASK DELIVERABLES (code quality), distinct from prompt-writing quality standards elsewhere.

### Phase A — Pre-mortem (task START)
Before writing any code: "This implementation WILL have a defect. Where?" List 3-5 specific failure predictions; these become the Phase C checklist.

### Phase B — Inline Verification (DURING task)
After each file change, state what changed and why, check it doesn't contradict a previous change, and check it matches the Phase A predictions. Fix contradictions immediately.

### Phase C — Adversarial Self-Review (task END)
`「問題なし」「OK」「特に指摘なし」` is banned — every assertion needs specific evidence (which file:line implements/mitigates it), not a bare score.

### Phase D — Scoring
```
Total = Completeness×0.35 + Accuracy×0.35 + Consistency×0.15 + Efficiency×0.15
IF Total < 0.85: self-improve before reporting.
IF any axis below its threshold: focus improvement there.
```

### Phase E — Multi-Agent Auto-Trigger
Auto-trigger an adversarial multi-agent review (without waiting to be asked) when: 3+ files modified, an API/interface signature changed, security-related code changed, or a DB schema/migration changed. Otherwise perform a self-adversarial review from 3 distinct perspectives (security / performance / maintainability), each producing at least 1 specific finding.

## Section 7: Failure Pattern Memory

**Activation**: When any action fails, a hypothesis is refuted, or an unexpected error occurs.

Record context / hypothesis / action / result / root_cause / lesson. Never repeat the same failed approach in the same session. Before attempting a fix, check if a similar failure was already recorded. Persist important lessons to the auto-memory system. When a pattern appears 2+ times across sessions, promote it to a prohibition rule.

## Section 8: Tool Search & MCP Lazy Loading

See `rule-performance` skill, section "7. Tool Loading Strategy" — the two files carried an identical decision matrix; that one is now the canonical copy.

## Activation Summary

| Context Detected | Sections Activated |
|---|---|
| **ANY task received** | **Section 0.5 (Comprehension Checkpoint) — ALWAYS FIRST** |
| 4+ tasks/issues received | Section 1 (Weighted Triage) |
| Codebase investigation needed | Section 2 (Multi-Stage Pipeline) |
| Error/bug/test failure | Section 3 (Hypothesis-Driven Debugging) |
| Code review or style decision | Section 4 (Relative Positioning) |
| Task completion (3+ files or API change) | Section 5 (Deviation Detection) + Section 6 (Evidence-Based Verification) |
| Task completion (any size) | Section 6 Phase C-D (Adversarial Review + Scoring) |
| Task completion (auto-trigger conditions met) | Section 6 Phase E (Multi-Agent Auto-Trigger) |
| Any failure or unexpected result | Section 7 (Failure Pattern Memory) |
| MCP tool needed | Section 8 (Tool Search, see rule-performance) |
| Launching subagents/teams | Section 0 (Model Hierarchy) |
