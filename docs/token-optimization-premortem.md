# Token Optimization Pre-Mortem Analysis

**Date**: 2026-05-03
**Scope**: task-app project, all Claude Code sessions

## Executive Summary

Every session starts with ~287KB (~72,000 tokens) of always-loaded instructions before any work begins.
With a 1M context window this is ~7% startup cost; with 200K it is ~36%.
The two failure scenarios below identify where tokens are wasted (Scenario A) and where over-optimization degrades quality (Scenario B).

---

## Current Token Budget Breakdown

| Layer | Files | Bytes | Est. Tokens | % of 200K |
|-------|-------|-------|-------------|-----------|
| Global rules (`.claude/rules/`) | 10 | 60,011 | ~15,000 | 7.5% |
| CLAUDE.md chain (3 levels) | 3 | 19,464 | ~4,900 | 2.5% |
| Project instructions (`prompt/instructions/`) | 35 | 208,154 | ~52,000 | 26% |
| **Total always-loaded** | **48** | **287,629** | **~72,000** | **36%** |

### Top 5 Token Consumers

| File | Bytes | Issue |
|------|-------|-------|
| `codex-delegation.md` | 26,481 | 44% of all global rules |
| `workflow.instructions.md` | 22,794 | Overlaps with `autonomous-execution.instructions.md` |
| `quality.instructions.md` | 21,653 | Overlaps with `prohibitions.instructions.md` |
| `prohibitions.instructions.md` | 16,324 | Duplicates rules in `quality.instructions.md` |
| `edu-creator.instructions.md` | 14,979 | Conditional but loads broadly |

### Identified Duplication (recoverable ~25K tokens)

| Concept | File A | File B | Combined |
|---------|--------|--------|----------|
| Pre-mortem | `rules/pre-mortem.md` (4.5KB) | `instructions/pre-mortem.instructions.md` (7.3KB) | 11.8KB |
| Autonomous execution | `workflow.instructions.md` Phase 0-0.5 | `autonomous-execution.instructions.md` | ~26KB |
| Context-mode routing | `/Users/kouiso/CLAUDE.md` | `/Users/kouiso/ghq/kouiso/CLAUDE.md` | 7.4KB (near-duplicate) |
| Think English / Respond Japanese | `rules/communication-language.md` | `persona.instructions.md` sec 2.4 | ~3KB |
| Verification discipline | `rules/god-in-details.md` | `quality.instructions.md` sec 2.7 | ~5KB |

---

## Scenario A: Token Overconsumption

**Likelihood**: High | **Impact**: High

| # | Cause | Frequency |
|---|-------|-----------|
| A1 | Full-file `Read` for analysis instead of `ctx_execute_file` | High |
| A2 | Grep result floods (100+ matches in context) | Medium |
| A3 | Instruction duplication (~25K tokens every session) | Every session |
| A4 | Subagent for queries answerable by <=3 Grep/Read calls | Medium |
| A5 | `codex-delegation.md` 26KB always-loaded | Every session |
| A6 | Re-reading files already in context | Medium |
| A7 | 94 irrelevant skills (Django/Kotlin/Perl/etc.) | Every session |

### Preventive Actions

| # | Action | Savings |
|---|--------|---------|
| A1 | `ctx_execute_file` for analysis; `Read` only for edit targets | 5-20KB/file |
| A2 | Wrap Grep in `ctx_execute` when >20 results expected | 2-10KB/search |
| A3 | Deduplicate instructions (Priority 1 below) | ~25K tokens/session |
| A4 | Gate: "Can <=3 Grep/Read calls answer this?" -> no subagent | 2-5KB/avoided |
| A5 | Split codex-delegation: 3KB core + 23KB demand-loaded skill | ~20K tokens/session |
| A7 | Remove ~60 irrelevant skills from `.claude/skills/` | Skill list overhead |

---

## Scenario B: Quality Degradation from Over-Optimization

**Likelihood**: Medium | **Impact**: High

| # | Cause | Frequency |
|---|-------|-----------|
| B1 | Shallow `ctx_execute_file` read misses critical detail | Medium |
| B2 | Codex output accepted without diff audit | Medium-High |
| B3 | Verification skipped under token pressure | Low |
| B4 | Context compression loses earlier findings | Medium |
| B5 | Imprecise `ctx_search` returns wrong data | Low-Medium |

### Guardrails (never weaken for token savings)

| # | Guardrail |
|---|-----------|
| B1 | Files being MODIFIED: always `Read`, never `ctx_execute_file` |
| B2 | Codex audit non-negotiable: diff + suppression scan + build/test |
| B3 | `npm run lint && npm run test` before ANY "done" report |
| B4 | Write critical findings to memory/TODO before context gets long |
| B5 | Surprising `ctx_search` result -> verify with direct `Read` |

---

## Improvement Actions (Priority Order)

### P1: Deduplicate Instructions (~25K tokens/session saved)

1. Delete global `rules/pre-mortem.md` (project version is authoritative)
2. Merge `autonomous-execution.instructions.md` into `workflow.instructions.md`
3. Delete `/Users/kouiso/ghq/kouiso/CLAUDE.md` (duplicate context-mode rules)
4. Remove "Think English, Respond Japanese" duplication from `persona.instructions.md`
5. Remove verification duplication between `quality.instructions.md` and `rules/god-in-details.md`

### P2: Split `codex-delegation.md` (~20K tokens/session saved)

- `rules/codex-delegation.md` (3KB): triggers, hierarchy, "Codex is lazy", verification table
- `skills/codex-delegation-procedures/SKILL.md` (23KB): Cloud workflow, polling, templates, plugin commands, recovery

### P3: Remove ~60 Irrelevant Skills

Django, Kotlin, Perl, Rust, Go, Swift, C++, JPA, Spring Boot, Compose Multiplatform, etc.

### P4: Enforce Read vs ctx_execute_file Decision Rule

```
Edit target -> Read (required by Edit tool)
Analysis/explore/summarize -> ctx_execute_file
Verify specific lines (<20) -> Read with offset+limit
```

### P5: Subagent Gate

```
IF answerable with <=3 Grep/Read/Glob calls THEN direct tools, no subagent
```

---

## Non-Negotiable Verification (Never Skip)

1. `npm run lint` pass
2. `npm run test` pass
3. UI changes: Playwright screenshot
4. Codex output: diff + suppression scan
5. `git status`: only intended files changed
6. Educational content (`material/`): read actual content

IF token budget critically low AND verification would exceed budget
THEN report BLOCKED — NEVER skip verification and report "done"

---

## Confidence

| Finding | Confidence |
|---------|-----------|
| Duplication wastes ~25K tokens/session | High (measured) |
| codex-delegation.md oversized | High (26KB measured) |
| Context-mode CLAUDE.md duplicated | High (diff confirmed) |
| 94 skills mostly irrelevant | High (TS/Next.js project) |
| ctx_execute_file underused | Medium (inferred) |
| Scenario B quality risks | Medium (rules exist but pressure increases) |
