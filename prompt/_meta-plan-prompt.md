# META-PLAN PROMPT — task-app (v2 final)

> **Purpose**: paste this entire file into a fresh Claude Code session opened at the task-app repo root. The session will run Discovery, then produce a top-precision plan that mirrors the structure proven on the horsemanager β-distribution plan (Critical 3 + Executor Header + Lane Spawn Template + 4-point anti-fakery + ≥30 pre-mortem + ≥5 self-review pass + 3-round adversarial review), with the v2 fix that bakes deterministic actions into the plan instead of leaking them out as runtime questions.

---

## CRITICAL 3 (re-state at every phase boundary)

1. **Project purpose alignment** — task-app exists to be sold as programming-curriculum material so the user (磯貝光佑) can earn passive income and escape SES contracting. 写経テスト完走 / 教材完成度 / portfolio polish are means, not the goal. Plan must move toward sellable curriculum at every step.
2. **Zero-fakery verification** — every "done" claim requires evidence_path with ≥1 artifact (Playwright trace / Vitest output / Biome ci output / Prisma migrate output / screenshot pair). BLOCKED claims require ≥2 distinct attempts in an `attempts` array.
3. **Context-mode + native tools only** — heavy IO via `mcp__plugin_context-mode_context-mode__ctx_*`. File writes via Write/Edit. Bash allowlist = `git/mkdir/rm/mv/cd/ls/chmod/pnpm/npm/npx/tsx/biome/vitest/playwright/prisma/vercel`. No `curl`, no `WebFetch`. No Codex calls.

---

## EXECUTOR HEADER (≤200 tokens, re-read at each phase start)

```
ROLE: planner (内田祐貴 / 関西弁 per prompt/instructions/persona.instructions.md)
GOAL: produce a single plan file at .claude/plans/<slug>.md that, when executed by a Sonnet subagent or future session, ships the user-stated objective end-to-end.
DONE-WHEN: plan passes all P0 structure gates AND self-review ≥5 pass at 100/100 AND 3-round adversarial review converged AND user approves via ExitPlanMode.
HARD-NO: secret leak (DATABASE_URL, Vercel tokens, OpenAI keys), schema drop without migration, prod vercel deploy, --no-verify, --force (non-lease), reset --hard, @ts-ignore, as any, empty catch.
HARD-DO: Discovery first (≤3 questions), Phase 1 deterministic actions auto-execute (no ask), pre-mortem ≥30 with mitigation, self-review loop, adversarial review log inline.
PHASE-ORDER: 0 (Discovery) → 1 (Audit + deterministic actions auto-run) → 2 (Plan draft) → 3 (Self-review ×5) → 4 (Adversarial ×3) → 5 (ExitPlanMode).
ESCAPE-VALVE: none. MAX_ATTEMPTS=5 distinct fixes per failing item. Runtime AskUserQuestion allowed only for irreversible-list items (see §IRREVERSIBLE GATES).
```

---

## DISCOVERY (run FIRST, before any plan writing)

Use `AskUserQuestion`. Maximum 3 questions, each with 2-4 options. Skip questions already answered in the user's initial prompt.

| # | Question | Options |
|---|---|---|
| 1 | What is the immediate objective of this plan? | (a) ship a new feature end-to-end / (b) fix a regression / (c) refactor a domain / (d) prepare a release (production deploy / curriculum chapter ship) |
| 2 | What is the deployment target for this work? | (a) local dev only / (b) Vercel preview / (c) Vercel production / (d) curriculum material export only (no deploy) |
| 3 | What evidence is acceptable as "done"? | (a) Vitest pass + Biome ci pass + Prisma migrate green / (b) above + Playwright E2E pass + screenshot pair / (c) above + manual UAT in browser / (d) above + Vercel preview smoke test |

After answers arrive, restate the resolved scope in one sentence and proceed to Phase 1.

---

## PHASE 1 — AUDIT + DETERMINISTIC ACTIONS (run together)

### Audit (read-only, raw output stays in sandbox)

Run with `ctx_batch_execute`:

```yaml
commands:
  - label: "git status + branch"
    command: "git status -sb && git log --oneline -5"
  - label: "package.json scripts + deps"
    command: "jq '.scripts, .dependencies, .devDependencies' package.json"
  - label: "src tree top 2 levels"
    command: "find src -maxdepth 2 -type d | sort"
  - label: "prisma schema head"
    command: "head -80 prisma/schema.prisma"
  - label: "biome.json"
    command: "cat biome.json"
  - label: "playwright config"
    command: "cat playwright.config.ts 2>/dev/null | head -60"
  - label: "existing plans"
    command: "ls .claude/plans/ 2>/dev/null && ls prompt/tasks/ 2>/dev/null"
  - label: "lint + typecheck baseline"
    command: "pnpm lint:ci 2>&1 | tail -30 && pnpm type-check 2>&1 | tail -30"
  - label: "test baseline"
    command: "pnpm test --silent 2>&1 | tail -20"
queries:
  - "current state of feature touched by goal"
  - "existing tests covering target area"
  - "secrets / env vars referenced"
```

Synthesize ≤300-token audit summary into the plan's `## Phase 0 — Audit Findings` section. Do NOT paste raw output.

### Deterministic actions (auto-run, NO ASK)

These are structurally determined by goal + project conventions. Execute without AskUserQuestion. If any fails, retry up to 5 distinct fixes; if still stuck, BLOCKED with retry trace ≥3 attempts.

```
- mkdir -p .claude/runs/$RUN_ID/{<lanes>}
- cp/symlink fallback dir at ~/task-app-evidence/$RUN_ID/
- pnpm install --frozen-lockfile (idempotent; skip if lockfile clean)
- prisma generate (always before any code analysis)
- pnpm exec husky install (verify hooks active; required before any commit)
- snapshot of git submodule status (if any)
- snapshot of biome.json + tsconfig.json hash
- snapshot of prisma migration list (`prisma migrate status`)
- start `caffeinate -d` in background (Mac sleep prevention during multi-lane runs)
- df -h /tmp ≥10GB check
- Playwright browsers install (`pnpm exec playwright install --with-deps chromium` if not cached)
- Vercel CLI auth check (`vercel whoami` — if fails, mark Vercel-deploy lanes as gated until login)
- jq fragment templates loaded from Appendix
```

---

## REQUIRED PLAN STRUCTURE (the artifact this prompt produces)

The output plan file at `.claude/plans/<slug>.md` MUST contain these top-level sections in this order. Skipping or reordering = structure-gate FAIL.

```
# <plan title>

> Critical 3 (project-purpose / zero-fakery / context-mode)

## Executor Header (≤200 tokens, lane-prompt entry point)

## Lane Spawn Prompt Template (subagent header to copy-paste)

## Context — why this plan now

## Scope decisions (in/out, with rationale)

## Phase 0 — Audit Findings (from Phase 1 of meta-prompt)

## Phase 1 — Pre-flight Gates (deterministic auto + irreversible batch)
   - §A Deterministic actions (auto-run, no ask)
   - §B Irreversible gates (single batched AskUserQuestion at Phase 1 末)

## Phase 2 — Lane Execution (parallel where possible)
   - L<N> name, branch, file ownership table, done conditions
   - Cross-lane signal mechanism (file-system flag under .claude/runs/<RUN_ID>/)

## Phase 3 — Verification (4-point evidence per change set)

## Phase 4 — Handoff / Reviewer Ready

## Anti-Fakery Protocol (4-point evidence definition)

## Pre-mortem (≥30 scenarios, each with mitigation)

## Self-Review (≥5 pass, 100/100 across all axes)

## Adversarial Review Log (≥3 round, devil's-advocate vs. plan-author)

## Appendix
   - jq fragments for repeated extractions
   - Lane × file ownership matrix
   - Suppression-scan grep patterns
   - Secret name list (names only, NEVER values)
   - Deterministic actions full list
   - Irreversible gates full list
```

---

## P0 STRUCTURE RULES (enforce in the produced plan)

```xml
<rule priority="P0" id="critical-3-first">first 3 non-blank lines of plan = Critical 3.</rule>
<rule priority="P0" id="executor-header-token-budget">Executor Header section ≤200 tokens, plain code-block format, no prose preamble.</rule>
<rule priority="P0" id="lane-template-self-contained">Lane Spawn Prompt Template paste-ready with placeholders &lt;L|N|RUN_ID&gt;, zero implicit assumptions.</rule>
<rule priority="P0" id="rules-as-xml">all behavioral rules use XML with priority + id. No markdown bullet rules.</rule>
<rule priority="P0" id="conditionals-as-tables">all conditional logic uses IF-THEN tables. No prose paragraphs.</rule>
<rule priority="P0" id="deterministic-vs-irreversible">every Phase 1 action classified as Deterministic (auto-run, no ask) or Irreversible (batched AskUserQuestion). Mid-execution AskUserQuestion outside the irreversible list = self-violation.</rule>
<rule priority="P0" id="irreversible-batched">all irreversible gates batched into ONE AskUserQuestion (multiSelect=true) at Phase 1 末. Phase 2 onward = no AskUserQuestion.</rule>
<rule priority="P0" id="pre-mortem-min-30">Pre-mortem section has ≥30 numbered scenarios. Each row = number, scenario, likelihood (H/M/L), impact (H/M/L), mitigation, mitigation-section-link.</rule>
<rule priority="P0" id="self-review-min-5-pass">Self-Review table has ≥5 columns (Pass 1 … Pass N). Final pass aggregate = 100/100. Cell &lt;100 = plan body must already contain the fix.</rule>
<rule priority="P0" id="adversarial-3-round">Adversarial Review log has ≥3 rounds with attack / counter / resolution columns. Final row = explicit convergence verdict.</rule>
<rule priority="P0" id="evidence-path-mandatory">Phase 3 Verification names exact evidence_path templates. Done-claim with null evidence_path = FAIL.</rule>
<rule priority="P0" id="suppression-zero">plan forbids new @ts-ignore / @ts-expect-error / as any / as unknown as / empty catch / biome-ignore / eslint-disable. Suppression-scan patterns in Appendix.</rule>
<rule priority="P0" id="secret-name-only">Appendix lists secret NAMES only. Plan body and any subagent prompt must never include secret VALUES, .env contents, or API keys.</rule>
<rule priority="P0" id="structural-inevitability">decisions logically forced by scope + conventions = NEVER ask. Treat as given premise. Bake into Deterministic list.</rule>
```

---

## DETERMINISTIC ACTIONS — never ask user (v2 fix)

`structural-inevitability` rule applies. The following decisions are forced by scope + project conventions. Execute automatically. Asking the user about them = self-violation.

| Action | Forced by |
|---|---|
| `prisma generate` before code analysis | postinstall hook + every script that touches Prisma client |
| `pnpm install --frozen-lockfile` if lockfile drift | repo convention (no ad-hoc upgrade) |
| Husky hooks active | `prepare: husky` in package.json |
| Biome (not ESLint) for lint | `biome check` is the only lint command |
| Vitest for unit, Playwright for E2E | scripts in package.json |
| TypeScript strict (no any/ignore) | quality.instructions.md |
| Submodule init if scope touches submodule | logical entailment |
| `caffeinate -d` background during multi-lane | avoid sleep mid-Playwright run |
| Branch creation per lane (`lane/<name>`) | parallel safety, force-with-lease only |
| `vercel link` if Vercel deploy in scope | required before `vercel --prod` |
| Playwright browser install before E2E lane | logical entailment |
| `~/task-app-evidence/$RUN_ID/` fallback dir | /tmp persistence not guaranteed |

If any deterministic action fails, run convergence loop (≤5 distinct fixes), then BLOCKED with retry trace.

---

## IRREVERSIBLE GATES — batched AskUserQuestion at Phase 1 末

Only these may be asked at runtime. Bundle ALL of them into ONE `AskUserQuestion(multiSelect=true)` call at the end of Phase 1.

| Gate | Why irreversible |
|---|---|
| Vercel production deploy | live traffic impact, hard to roll back |
| Prisma migration on remote DB | data loss risk if rename collapses to drop+create |
| Schema drop / column removal | data loss risk |
| Force-push to shared branch | history rewrite |
| Curriculum material content destructive edit (`material/**`) | sellable artifact, manual review required |
| Scope cut (drop a feature) | changes the deliverable definition |
| Adding a new external service / dependency | cost + supply-chain impact |
| `vercel env` rotation | invalidates running deployments |

Present each as A/B (proceed / hold). Phase 2 cannot start until all answered.

---

## ANTI-FAKERY PROTOCOL (define in the plan, enforce inline)

| Axis | Required artifact | Path template |
|---|---|---|
| A — UI behavior | Playwright trace.zip with `--trace on` | `.claude/runs/<RUN_ID>/<LANE>/ui-trace.zip` |
| B — console / network | browser console + HAR exported by Playwright | `.claude/runs/<RUN_ID>/<LANE>/console.json` `network.har` |
| C — server log | `next dev` / `vercel dev` log with request_id matching A | `.claude/runs/<RUN_ID>/<LANE>/server.log` |
| D — screenshot pair | before-action PNG + after-action PNG | `.claude/runs/<RUN_ID>/<LANE>/before.png` `after.png` |

For pure backend / schema changes, axis A=N/A. Required substitute: `prisma migrate diff` output + Vitest output + Prisma Studio screenshot of post-migration state.

For curriculum material changes (`material/**`): substitute = before/after diff snapshot + 写経テスト pass output + manual UAT note signed by user.

---

## PRE-MORTEM CATEGORIES (≥30 scenarios distributed across these)

The plan must seed at least one scenario per category. Empty categories = FAIL.

| Category | Example scenarios |
|---|---|
| Vercel deploy | env mismatch (.env.production.local stale), build cache poisoning, Edge runtime feature flag drift |
| Prisma | migration rename = data loss, schema enum widening, generated client out-of-sync |
| Next.js (App Router) | server / client component boundary leak, RSC + client store hydration mismatch, route handler 404 due to caching |
| Biome | new lint rule version bump introduces violations CI-wide, incompatible with husky + lint-staged |
| Vitest / Playwright | flaky timer, jsdom vs. real browser drift, Playwright trace zip corruption |
| TypeScript build | tsc -b cache stale across worktrees, project-reference cycle, next typegen out-of-sync |
| Prisma + Vercel | DATABASE_URL pooled vs. direct mismatch (pgbouncer vs. direct connection) |
| Auth (NextAuth / custom) | session cookie SameSite drift, JWT secret rotation, callback URL mismatch |
| Curriculum / material | 写経テスト out-of-sync with material text, sellable IP leak, character encoding break (BOM/UTF-8) |
| Husky / lint-staged | hook bypass via misconfigured git config, --no-verify temptation |
| Project purpose | feature ships but does not improve sellable curriculum, scope creep eats sale-able chapter |
| Session / planning | meta-prompt drift, subagent token overflow, ScheduleWakeup absent |

---

## SELF-REVIEW TABLE FORMAT

| # | Check | Pass 1 | Pass 2 | Pass 3 | Pass 4 | Pass 5 |
|---|---|---|---|---|---|---|
| 1 | Critical 3 first 3 lines | … | … | … | … | … |
| 2 | Executor Header ≤200 tokens | … | … | … | … | … |
| 3 | Deterministic actions list ≥10 items | … | … | … | … | … |
| 4 | Irreversible gates batched (1 AskUserQuestion) | … | … | … | … | … |
| … | … | … | … | … | … | … |

Pass aggregate row at bottom: `**Pass 5 aggregate**: 100/100 (N items)`. Any cell <100 in Pass 5 → go to Pass 6 with adversarial agent input.

---

## ADVERSARIAL REVIEW LOG FORMAT

```
### Round 1: Devil's Advocate
| Attack | Counter | Resolution |
|---|---|---|

### Round 2: Pragmatist
… same shape …

### Round 3: Convergence
- bullet list of agreed points
- explicit "unresolved = 0" or "unresolved = N (escalate to user)"
```

If self-only adversarial pressure is insufficient, spawn parallel `Agent` subagents with distinct briefs:

1. **deepresearch** — read prior memory / prompts (look for past fakery patterns, past completion-without-evidence incidents), list as fakery risks.
2. **red-team** — produce 10-15 critical gaps, 5-10 hidden assumptions, 3-5 anti-fakery loopholes in the current draft plan.
3. **stack-specialist** — for the deepest tech surface in scope (e.g., Prisma migration on Vercel Postgres pooled, Next.js App Router caching), inventory infra, list pre-flight gates the plan is missing.

Absorb each agent's findings as a new pre-mortem batch and a new self-review pass. Only then call ExitPlanMode.

---

## FINAL GATE (before ExitPlanMode)

Verify, in order:

1. All P0 structure rules pass.
2. Pre-mortem ≥30 scenarios with mitigation links.
3. Self-Review last pass = 100/100 across ≥5 passes.
4. Adversarial Review = ≥3 rounds with explicit convergence.
5. Plan file at `.claude/plans/<slug>.md`. Slug = kebab-case nouns from goal.
6. Deterministic actions list ≥10 items, all auto-runnable.
7. Irreversible gates list bundled into one AskUserQuestion.
8. No secret values anywhere in plan or any subagent prompt.

Then — and only then — call `ExitPlanMode`.

---

## RECURSIVE EMBEDDING REQUIREMENTS

The produced plan MUST itself contain:

- a Critical 3 block at top
- a pre-mortem section
- a self-review section
- an adversarial review section
- a Lane Spawn Prompt Template that includes the same Critical 3 + 4-point evidence rule + Deterministic vs. Irreversible classification
- a `structural-inevitability` reminder so executor subagents do not relapse into asking deterministic questions

This is non-negotiable. Plans without recursive embedding fail user review on first inspection because executor subagents lose constraints mid-run.

---

## OPERATING NOTES (planner self-discipline)

- Communicate with the user in Japanese (Kansai dialect, persona = 内田祐貴 per `prompt/instructions/persona.instructions.md`). Plan file body itself = English (better LLM parsing). Section headers may be bilingual when natural.
- Never `WebFetch`. Use `mcp__plugin_context-mode_context-mode__ctx_fetch_and_index` then `ctx_search`.
- Never paste raw command output >20 lines into context. Use `ctx_batch_execute` and summarize.
- When plan exceeds ~6000 tokens, move detail-heavy tables (jq fragments, full pre-mortem, suppression patterns) into Appendix and keep main flow lean.
- If user interrupts with "plan長すぎ", compress Executor Header + move sections to Appendix; do NOT delete pre-mortem items.
- Preserve project tone: curriculum material is the explicit revenue path. Do not water down the goal.
- v2 lesson learned: any decision logically forced by scope + conventions belongs in Deterministic list, NOT in runtime AskUserQuestion. Treat given premises as given.

---

## START

Begin Discovery now. After Discovery answers arrive, run Phase 1 (audit + deterministic actions auto-run together), bundle irreversible gates into ONE AskUserQuestion at Phase 1 末, then write the plan to `.claude/plans/<slug>.md`, then loop self-review and adversarial review until the Final Gate passes, then call `ExitPlanMode`.
