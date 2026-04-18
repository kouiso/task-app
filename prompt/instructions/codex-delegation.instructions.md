---
applyTo: "**"
---

# Codex Delegation Protocol

## Core Principle

**Claude is the thinking engine. Codex is the execution engine.**

IF a task can be executed by Codex via Codex MCP or Codex CLI
THEN Claude MUST delegate that task to Codex
BECAUSE Claude token budget should be reserved for reasoning, planning, review, and decision-making.

**Default stance**: Claude should think, design, critique, and judge. Codex should search, edit, run, verify, and iterate.

**Confidence**: High

## Role Separation

| Layer | Claude | Codex |
|---|---|---|
| Main agent | Understand intent, analyze, plan, decompose, review results | Execute concrete work |
| Subagent / parallel thinker | Analyze one bounded question and report back | N/A unless the environment explicitly exposes Codex to that layer |
| Execution worker | Write task instruction only | Perform file edits, commands, checks, retries |

Claude must not collapse these roles. "I can do this quickly myself" is not a valid exception.

## Mandatory Delegation Triggers

IF the task includes any of the following
THEN delegate to Codex first:

1. File creation, editing, deletion, rename, refactor
2. Shell commands, tests, builds, installs, lint, format, git operations
3. Searching many files or collecting execution-oriented context
4. Browser, Playwright, Appium, or other MCP-based UI actions
5. Repetitive fix loops such as failing tests, lint cleanup, type errors
6. Multi-file or multi-repo changes
7. Any action that changes state in the repo, environment, browser, or external system

## Tool Preference

Use the lightest execution path that preserves correctness.

| Situation | Required Path |
|---|---|
| Codex MCP is available | Use Codex MCP first |
| Codex MCP is unavailable but Codex CLI is available | Use Codex CLI |
| Both are available | Prefer Codex MCP for integrated task execution; use Codex CLI when the workflow is simpler or more token-efficient |
| Neither is available | Claude may execute directly, but must state why Codex delegation was impossible |

## Claude's Exclusive Responsibilities

Claude should spend tokens on:

1. Interpreting ambiguous intent
2. Root-cause analysis
3. Architectural decisions and tradeoff judgment
4. Breaking work into independent tasks for parallel Codex execution
5. Writing precise Codex instructions with paths, constraints, and done conditions
6. Reviewing Codex outputs and deciding whether they meet the bar
7. Escalating true ambiguities or conflicts to the user

## Required Workflow

1. Claude reads just enough context to understand the problem.
2. Claude decides what must be executed versus what must be reasoned about.
3. Claude writes a concrete Codex task:
   - exact paths
   - exact change goal
   - verification command or observable done condition
   - constraints to preserve
4. Claude delegates execution to Codex MCP or Codex CLI.
5. Claude inspects the result.
6. IF incomplete or incorrect, Claude re-delegates with a tighter instruction.
7. Claude reports only after the result is verified.

## Parallelism Rule

IF multiple execution tasks are independent
THEN split them and delegate in parallel
BECAUSE Claude should not waste tokens serializing work that Codex can perform concurrently.

Examples:
- Separate file groups
- Different repos
- Build, lint, and test
- Independent verification steps

## Prohibited Claude Behaviors

NEVER do the following when Codex could do it instead:

1. Edit files directly just because the change is small
2. Run tests or shell commands directly just because the command is short
3. Spend many tokens on rote repo exploration that Codex could perform
4. Enter iterative fix loops personally
5. Ask the user to execute something that Codex could execute

## Completion Standard

Claude must treat Codex output as untrusted until verified.

IF Codex claims work is complete
THEN Claude must verify the relevant artifact, command result, or changed file before reporting completion
BECAUSE "Codex said so" is not evidence.

## Decision Heuristic

When unsure, ask one question:

> "Does this step require judgment, or execution?"

- If judgment: Claude
- If execution: Codex

If a step contains both, Claude keeps the judgment and delegates the execution.
