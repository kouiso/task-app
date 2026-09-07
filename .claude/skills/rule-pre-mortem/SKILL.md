---
name: rule-pre-mortem
description: task-app固有のプレモーテム分析（プロジェクト目的からの逆算）。グローバルskill「pre-mortem」の一般的な手順に、task-appのプロジェクト目的（教材の学習効果）と過去の失敗パターンを重ねて適用する時に読む。新機能実装・リファクタリング・設定変更の前に読む。
---

# Pre-Mortem Analysis (プレモーテム分析) — プロジェクトの目的から逆算する思考

原本: `prompt/instructions/pre-mortem.instructions.md`（Copilot向け、変更していない）。
一般的なプレモーテム手順はグローバルskill `pre-mortem` を参照。ここには task-app 固有の
「プロジェクト目的からの逆算」と過去の失敗パターンだけを残す。

## Core Principle

IF a task is assigned (implementation, bug fix, refactoring, review, or any multi-step work)
THEN before writing any code, evaluate the task against the project's purpose and execute a pre-mortem analysis
BECAUSE individual tasks succeed or fail in the context of the project's overall goals. A task that "works" but moves the project away from its purpose is a failure.

## The Two Pre-Mortem Questions

### Question 1: Project-Level (Strategic)

> "This project has failed to achieve its purpose. What went wrong?"

Read the project's CLAUDE.md and understand its mission. Then ask: if the project's ultimate goal was never achieved, what were the most likely causes?

Example for task-app: "The educational app failed to serve learners." → Curriculum quality was poor, UX confused users, features were built but didn't support the learning goal.

This question is asked ONCE per session (or when switching projects) and stays in the background as a filter for all decisions.

### Question 2: Task-Level (Tactical)

> "This task was completed but made things worse. What happened?"

For the specific task at hand, identify concrete failure modes. This is asked before every non-trivial task.

## Mandatory Pre-Mortem Workflow

### Step 0: Understand the Project's Purpose

IF this is the first task in a session THEN read the project's CLAUDE.md and identify: (1) the project's ultimate goal, (2) known critical success factors, (3) past failures or near-misses documented.

### Step 1: Project-Purpose Alignment Check

> "If I complete this task perfectly, does it move the project toward its purpose?"

IF unclear THEN ask the user for clarification before proceeding.
IF the answer is no THEN flag it: "This task appears misaligned with the project goal of X. Should I proceed?"

### Step 2: Identify Failure Modes (before writing code)

List 3-5 concrete ways this task could fail, considering BOTH task-level and project-level failures.

| Bad (task-only) | Good (project-aware) |
|----------------|---------------------|
| "The header component might break" | "Changing the header breaks sticky scroll on SP, causing Figma diff to exceed 5% — the project's #1 success criterion is pixel-perfect Figma match" |
| "Tests might fail" | "The E2E test passes but the contact form UX diverges from spec — users will experience a different flow than intended" |
| "The refactoring might introduce bugs" | "This refactoring improves code quality but delays the launch date — the project's purpose is a working site by deadline, not perfect code" |

### Step 3: Categorize by Likelihood and Impact

Likelihood (High/Medium/Low) × Impact on project purpose (High/Medium/Low). Prioritize by impact on project purpose, not just task completion.

### Step 4: Define Preventive Actions

For each High-likelihood or High-impact failure mode, define ONE concrete preventive action.

### Step 5: Embed Checkpoints

Convert preventive actions into verification checkpoints within the task, executed at the appropriate point — not all at the end.

## When to Apply

| Task Type | Pre-Mortem Depth |
|-----------|-----------------|
| New feature / page implementation | Full (Step 0-5, written report) |
| Bug fix | Focused (Steps 1-4, 2-3 failure modes) |
| Refactoring | Full (Step 0-5, focus on project-purpose alignment) |
| Style/CSS change | Focused (Steps 1-4, focus on design fidelity) |
| Config/infra change | Full (Step 0-5, focus on environment and rollback) |
| Single-file minor edit | Mental only (Step 1 alignment check, no written report) |

## Common Project-Level Failure Patterns

1. **Task completion without project progress**: Every task was "done" but the project never shipped. Individual tasks were not aligned with the critical path.
2. **"Done" without verification**: Declared complete but never ran tests, never checked design, never validated against specs.
3. **Specification drift**: Built what the AI assumed, not what the user intended. The gap between implementation and spec grew silently over many tasks.
4. **Cascading breakage**: Changed one component, broke five others. Did not check the blast radius against the project's working state.
5. **Premature optimization**: Spent time on code quality, performance, or architecture when the project needed basic functionality first.
6. **Scope creep**: "While I'm here, let me also..." introduced unrelated changes that created new bugs and delayed the critical path.

## Prohibited Patterns

NEVER skip pre-mortem because "this task is simple."
BECAUSE the tasks perceived as simple are where the most avoidable failures occur — simplicity breeds overconfidence.

NEVER evaluate a task in isolation without considering its impact on the project's purpose.
BECAUSE a task that "works" but doesn't serve the project goal is wasted effort.

NEVER list failure modes without preventive actions.
BECAUSE identifying risks without mitigations is worry, not analysis.

NEVER perform pre-mortem only mentally for multi-step tasks.
BECAUSE unwritten analysis evaporates. Include a brief pre-mortem summary when the task involves 3+ files or multi-step implementation.

## Pre-Mortem Report Format (for multi-step tasks)

```
## Pre-Mortem Analysis
**Project purpose**: {one-line project goal from CLAUDE.md}
**Task alignment**: {how this task serves the project purpose}

| Failure Mode | Likelihood | Project Impact | Preventive Action |
|-------------|-----------|----------------|-------------------|
| ... | High/Med/Low | High/Med/Low | ... |
```

For single-file minor changes, a mental alignment check (Step 1) is sufficient — no written report required.

## Relationship to Other Thinking Protocols

- **Essential Thinking** asks: "Is this the real problem?" (before choosing what to solve)
- **Pre-Mortem** asks: "If the project fails, was this task a cause?" (before choosing how to solve)
- **Intentional Execution** asks: "What is the user's true intent?" (before choosing what to build)

Intent → Essence → Pre-Mortem → Execute.
