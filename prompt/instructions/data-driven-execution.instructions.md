---
applyTo: "**"
---

# Data-Driven Execution Protocol

Apply data science thinking to AI execution processes. These strategies govern HOW to work efficiently, not WHAT to build.

Inspired by production techniques from ABEJA's recommendation systems: multi-stage pipelines, weighted scoring, percentile normalization, feedback loops, and LLM-as-Judge self-evaluation.

---

## Section 0: Model Hierarchy & Agent Delegation

### Lead Model
All primary reasoning, architectural decisions, and user-facing responses use **Opus** (claude-opus-4-6).

### Subagent / Teammate Model
All delegated subtasks use **Sonnet** (claude-sonnet-4-6) by default.

```
When launching subagents via Task tool:
  → model: "sonnet" (default for all subagents)
  → Exceptions requiring model: "opus": security review, architecture design

When creating agent teams:
  → Each teammate: model: "sonnet"
  → Lead/orchestrator: the current session (Opus)

When the current session is already Sonnet:
  → Skip Task delegation for simple subtasks (no benefit from same-model delegation)
```

---

## Section 1: Weighted Triage Protocol

**Activation**: 4+ tasks, files, or issues to address. For 3 or fewer, use intuitive prioritization.

Score and prioritize instead of processing in received order.

```
For each task/file:
  Impact        (1-5): How many other files/features does this affect?
  Urgency       (1-5): Is this a blocker for other work?
  InvComplexity (1-5): How easy is the fix? (5 = trivial, 1 = deep refactor)

  Score = Impact × 0.4 + Urgency × 0.4 + InvComplexity × 0.2

Execute in Score descending order.
Display: Show top 3 items only. Summarize the rest as "(+N more, lowest priority: [name])".
```

---

## Section 2: Multi-Stage Pipeline Search

**Activation**: When investigating a codebase, searching for files, or analyzing impact scope.

Use funnel-shaped exploration. Never read files linearly.

```
Stage 1 — Broad Scan
  Tool: Glob, Grep
  Goal: Collect ALL potentially relevant candidates
  Report: "Stage 1 complete: N files found. Proceeding to scoring..."

Stage 2 — Relevance Scoring
  For each candidate, estimate relevance (0.0-1.0) based on:
    - File name match to task keywords
    - Import/export relationship to known target files
    - Recency of modification
  Keep: top candidates only

Stage 3 — Deep Dive
  Read only the top 10 files (ranked by dependency reference count)
  Report: "Stage 3: Reading N files..."

Stage 4 — Cross-Reference
  From deep-dive findings, discover NEW related files
  → Feed back to Stage 2 for scoring
  → Stop when no new high-relevance files are discovered
```

**Prohibitions**: Never read all files in a directory sequentially. Never read a file without scoring its relevance first.

---

## Section 3: Hypothesis-Driven Debugging

**Activation**: When debugging errors, test failures, or unexpected behavior.

**Relationship to existing rules**: This complements trial-and-error / re-verification protocols. It adds structured hypothesis generation BEFORE the existing fix-and-verify loop. It does NOT replace existing debugging rules.

```
1. GENERATE: List 3-5 hypotheses for the root cause
2. SCORE each (internally, do not display scores by default):
   Prior Probability (0.0-1.0): Based on error message, stack trace, past patterns
   Ease of Verification (0.0-1.0): 1/steps_needed
   Priority = Prior × Ease
3. TEST: Verify highest-priority hypothesis first
4. RECORD: Log result — confirmed / refuted + evidence
5. UPDATE: Adjust remaining hypotheses, repeat
```

**Prohibitions**: Never try the first idea without listing alternatives. Never persist on one hypothesis after 2 failed attempts without re-evaluating.

---

## Section 4: Relative Positioning

**Activation**: When evaluating code quality, reviewing PRs, or making style decisions.

Use BOTH absolute standards (project rules) AND relative standards (codebase distribution).

```
Before judging new/modified code:
1. Sample 5-10 representative files from the target module
2. Calculate average function length from those samples
3. Flag as outlier if new function length > average × 2.0
4. Report: "This function is X lines. Module average is Y lines (ratio: Z)"

For multi-module PRs: sample each module independently.
```

Purpose: Minimize style drift while still improving. Respect the existing codebase distribution.

---

## Section 5: Deviation Detection Feedback

**Activation**: When completing implementation involving 3+ file changes OR API/interface modifications. Skip for smaller changes.

```
At task START — record Expected State:
  - Files to modify: [list]
  - Tests expected to pass: [all / specific]
  - Scope boundary: [description]

At task END — compare with Actual State:
  - Files actually modified vs expected
  - Test results vs expected
  - Any scope expansion

Deviation thresholds:
  Minor (< 20% scope expansion): Note in completion report
  Major (>= 50% scope expansion): STOP and report to user before continuing
```

---

## Section 6: Multi-Axis Self-Scoring

**Activation**: When finishing a task, before reporting completion.

**Note**: This scores TASK DELIVERABLES (code quality). It is distinct from prompt quality standards (e.g., core.md Section 10 which scores PROMPT writing quality). They do not overlap.

```
| Axis         | Measurement                                      | Threshold |
|--------------|--------------------------------------------------|-----------|
| Completeness | Acceptance criteria checklist: done/total         | >= 0.9    |
| Accuracy     | Test pass rate + lint error count (0 errors=1.0)  | >= 0.9    |
| Consistency  | Lint warnings: 0=1.0, 1-2=0.8, 3+=0.6           | >= 0.8    |
| Efficiency   | Planned turns vs actual turns (ratio <= 1.0=max)  | >= 0.7    |

Total = Completeness × 0.35 + Accuracy × 0.35 + Consistency × 0.15 + Efficiency × 0.15

IF Total < 0.85: Self-improve before reporting
IF any axis < threshold: Focus improvement on that axis
IF Total >= 0.85 AND all axes pass: Report completion with scores
```

---

## Section 7: Failure Pattern Memory

**Activation**: When any action fails, a hypothesis is refuted, or an unexpected error occurs.

```
Record each failure:
  context:    What task was being performed
  hypothesis: What was expected
  action:     What was done
  result:     What happened instead
  root_cause: Why it failed
  lesson:     What to do differently

Rules:
1. NEVER repeat the same failed approach in the same session
2. Before attempting a fix, check if a similar failure was already recorded
3. Persist important lessons to auto memory:
   Path: ~/.claude/projects/<git-root-relative>/memory/MEMORY.md
   Format: Markdown. First 200 lines auto-loaded each session.
   For detailed notes: create separate topic files and link from MEMORY.md.
4. When a pattern appears 2+ times across sessions, promote to a prohibition rule
```

---

## Section 8: Tool Search & MCP Lazy Loading

**Activation**: When MCP tools are needed. Applies to environments with Tool Search Tool available.

```
Default behavior:
  - Do NOT assume all MCP tools are loaded at startup
  - Use ToolSearch to find and load tools on demand
  - Token savings: 50+ tool environments reduce from ~77,000 to ~8,700 initial tokens (85%)

Decision matrix for tool choice:
  | Need                         | Use           | Reason                    |
  |------------------------------|---------------|---------------------------|
  | Single command, one-shot     | CLI + Skill   | 225 tokens vs MCP thousands|
  | Stateful multi-step workflow | MCP           | Session management        |
  | Debug transparency needed    | CLI + Skill   | Local, inspectable        |
  | Auth / secure access         | MCP           | Robust access layer       |

Approach: Start with CLI. Escalate to MCP when complexity requires it.
```

---

## Activation Summary

| Context Detected | Sections Activated |
|---|---|
| 4+ tasks/issues received | Section 1 (Weighted Triage) |
| Codebase investigation needed | Section 2 (Multi-Stage Pipeline) |
| Error/bug/test failure | Section 3 (Hypothesis-Driven Debugging) |
| Code review or style decision | Section 4 (Relative Positioning) |
| Task completion (3+ files or API change) | Section 5 (Deviation Detection) + Section 6 (Self-Scoring) |
| Task completion (any size) | Section 6 (Self-Scoring) |
| Any failure or unexpected result | Section 7 (Failure Pattern Memory) |
| MCP tool needed | Section 8 (Tool Search) |
| Launching subagents/teams | Section 0 (Model Hierarchy) |
