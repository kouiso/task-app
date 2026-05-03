# task-app ultrareview working notes (2026-04-29)

> Phase 0 baseline + Phase A self-read evidence。Phase B subagent 起動前にここを固定。Anchor bias 防止のため、subagent 結果受領後の更新は別セクションに追記。

## Phase 0: Baseline (commit 300d06b96adf15a96f6d28cbfb112bcfb3255836)

### Numerical baseline

| 項目 | 数値 | 04-26 verdict 主張 | 整合 |
|---|---|---|---|
| 30days curriculum 全 day*.md ファイル | 30 | 30 | OK |
| Critical files (35) | day01-30 + 00目次 + appendix×4 | — | — |
| Total lines (curriculum 35 ファイル) | 25,779 | — | — |
| PNG screenshots in screenshots/ | 80 | 80 | OK |
| mermaid blocks in day*.md | 34 occurrences in 26 files | 26 Days | OK |
| つまず in day*.md | 29 occurrences in 28 files | 28 Days | OK |
| 新しく学ぶ概念 in day*.md | 33 occurrences in 29 files | Day 01-04 必須 | OK |
| 理解度マーカー in day*.md | 12 occurrences in 8 files | Day 05/07/10/15 必須 | OK (+追加 Day) |

### Cross-section grep (mechanical safety)

| Pattern | Hits | Verdict |
|---|---|---|
| `as any` / `: any` / `<any>` / `as unknown` | 0 in curriculum | PASS |
| `git reset --hard` / `--no-verify` | 0 in curriculum | PASS |
| `--force` (any) | 1 hit (day01:264 `npm audit fix --force`) | PASS (npm flag, not git) |
| `git add .` | 3 hits in day03 (lines 689, 708, 982) | NEEDS REVIEW (KNOWN since 04-17) |
| password literal | 1 hit (day06:816 type="password" — input attribute, not literal) + `password123` test password (matches seed.ts) | PASS |
| `2025-` (old dates) | 42 occurrences in 13 files | NEEDS REVIEW (today 2026-04-30) |
| `TODO`/`FIXME`/`XXX` | 34 occurrences in 26 files | NEEDS REVIEW (likely "次のステップ" markers) |
| `localhost:30` | 42 occurrences in 18 day files | NEEDS REVIEW (Day 01=3000, Day 07+=3001 convention) |
| `3000|3001` | 67 occurrences in 29 files | NEEDS REVIEW |

### Background reviews summary (KNOWN issue inventory)

source files read in Phase 0:
- `docs/evidence/2026-04-26/final-verdict.md` (latest verdict, READY for React 初中級者)
- `docs/evidence/2026-04-18/final-verdict.md` (DO NOT LAUNCH for complete beginners → reclassified)
- `docs/evidence/2026-04-18/curriculum-beginner-audit.md` (top 10 stuck points)
- `docs/evidence/2026-04-17/curriculum-walkthrough-day01-10.md`
- `docs/evidence/2026-04-17/curriculum-walkthrough-day11-20.md`
- `docs/evidence/2026-04-17/curriculum-walkthrough-day21-30.md`
- `docs/evidence/2026-04-18/multi-review-day01-04.md` (10 BLOCKERs resolved Phase 1+2)

Known issue tags (to be re-verified vs current src/ in Phase A):

| ID | Day | Issue (per prior review) | Status to verify |
|---|---|---|---|
| KNOWN-D01-1 | day01 | Docker container_name conflict + Prisma .env expansion P1013 | Verify — was BLOCKING in 04-17 |
| KNOWN-D02-1 | day02 | welcome banner not in current target | Verify |
| KNOWN-D03-1 | day03 | `git add .` violates rules (CONFIRMED still present line 689/708/982) | STILL_PRESENT |
| KNOWN-D06-1 | day06 | password requirements mismatch (material says min(8), auth.ts requires complex regex) | Verify vs current `auth.ts` |
| KNOWN-D09-1 | day09 | simplified version teaching but src/ is more advanced | Verify |
| KNOWN-D10-1 | day10 | `useForm({values})` vs current `defaultValues + useEffect(reset)` | Verify |
| KNOWN-D12-1 | day12 | ロール表 says MEMBER can edit project, but `project.ts#update` uses `canManageMembers` (only OWNER/ADMIN) | Verify vs current `project.ts` |
| KNOWN-D11-D20-DATE | day11/14/15/17/20 | date helper update needed (`toISOString()` → `dateOnlyToUtcStartIso/EndIso`) | Verify |
| KNOWN-D25-1 | day25 | password requirements vs `user.ts#changePasswordSchema` | Verify |
| KNOWN-D27-1 | day27 | material teaches `ProjectDetailDialog` final form but current uses `ProjectDetailView` inline | Verify vs `src/app/project/page.tsx` |
| KNOWN-D30-1 | day30 | `.env.example` excerpts diverge from real (`${_DOCKER_COMPOSE_HOST_PORT_DB}`), `git add .` present, JWT_SECRET divergent | Verify |

### Files NOT yet read (Phase 0 deferred)

These are background docs from `material/`. Per Phase 0 plan they should be read but represent diminishing returns vs Phase A direct curriculum reading. Will be read as needed during Phase C verification:

- `material/REVIEW_INTEGRATED_REPORT_v2.md`
- `material/30days-curriculum/CURRICULUM_PLAN.md`
- `material/30days-curriculum/review_issues_prioritized.md` (already partially seen via grep)
- `material/30days-curriculum/round4_report.md`, `round4b_report.md`
- `docs/curriculum-plan/day-to-group-map.md`

## Phase A: Self-read findings

### KNOWN issue re-verification (5/5 resolved or reclassified)

| ID | Status (current curriculum) | Evidence |
|---|---|---|
| KNOWN-D03-1 | RECLASSIFIED | day03.md:689 heading "Pro パターンで書こう — `git add .` ではなく残したいファイルを選ぶ" / line 708 `git add .` is inside ❌ Before block (intentional anti-pattern teaching) / line 982 essence summary reinforces avoidance |
| KNOWN-D12-1 | RESOLVED | day12.md:84-91 ロール表 "プロジェクト更新 ✅✅❌❌" (OWNER/ADMIN only) / line 93 explicit "`canEdit` 定義はあるが `update` API は `canManageMembers` を使う → 編集も OWNER/ADMIN だけ" |
| KNOWN-D25-1 | RESOLVED | day25.md:540 "8文字以上 + 大文字 + 小文字 + 数字 + 特殊文字" matches src/server/api/routers/user.ts:34-40 changePasswordSchema regex (min(8) + [A-Z] + [a-z] + [0-9] + [^A-Za-z0-9]) exactly |
| KNOWN-D27-1 | RESOLVED | day27.md:20 explicit "現在の完成形は ProjectDetailDialog のモーダルではなく ProjectDetailView を使ったインライン詳細表示" / line 566-575 legacy file disclaimer / src/app/project/page.tsx confirms uses ProjectDetailView |
| KNOWN-D30-1 | RESOLVED | day30.md:129 `${_DOCKER_COMPOSE_HOST_PORT_DB}` matches .env.example:24 exactly / day30.md:269-270 git add uses individual file paths not `.` |

### Day 01 — Critical Read (env setup)

- Port: localhost:3000 (Next.js default), confirmed correct per 04-26 verdict
- 新しく学ぶ概念 table present (per 04-27 expansion)
- `.env.example` references match real file
- Friction for audience (A) HTML/CSS/JS + React 初めて: Docker setup, dotenv expansion `${_DOCKER_COMPOSE_HOST_PORT_DB}` may be heavy but is annotated

### Day 02 — Critical Read (dashboard custom message)

- Pedagogy clean: `getGreetingByHour` + `buildMainMessage` + `DashboardOwner` type — incremental introduction
- No tRPC `useQuery` premature investment (per 04-26 RECLASSIFIED)
- 新しく学ぶ概念 + マーカー present

### Day 03 — Critical Read (GitHub push)

- `git add .` confirmed as ANTI-PATTERN teaching (❌ Before / ✅ After), not instruction
- Day 03 stuck point: Pro パターンの導入 → 個別ファイル指定の習慣化
- Mermaid present

### Day 04 — Critical Read (Vercel deploy)

- Read deferred (lower risk, not in earlier KNOWN list)
- Standard public deploy chapter

### Day 12 — Critical Read (member add)

- 型ガード concept introduced: `is` keyword based narrowing — non-trivial for audience (A) but well-explained at lines 80-180
- ロール permission table fully aligned with src/ (`canManageMembers` predicate)
- ProjectDetailView pattern introduced earlier than expected (lines 122-152) — sets foundation for Day 27

### Day 25 — Critical Read (profile / password change)

- changePasswordSchema regex 5 conditions = src/ exactly (8 chars + A-Z + a-z + 0-9 + special)
- 14 steps structured, 3-5 min each — manageable
- ゴールラインマーカー at line 71

### Day 27 — Critical Read (project detail / archive)

- Curriculum migrated from ProjectDetailDialog (modal) to ProjectDetailView (inline)
- Explicit legacy disclaimer at lines 566-575
- inferRouterOutputs concept introduced
- src/app/project/page.tsx confirms ProjectDetailView import — alignment good

### Day 29 — Critical Read (1276 lines)

- Read deferred for Phase A-2 lock — to verify in Phase C
- User detail page pattern, link to Day 30

### Day 30 — Critical Read (publish / graduation)

- `.env.example` excerpts match real file exactly
- `git add` uses individual files (not `.`)
- DATABASE_URL / JWT_SECRET / Vercel env vars guidance correct
- Friction for audience (A): production secrets management is heavy but appropriate for finale

## Phase A-2: Tentative verdict (locked 2026-04-30 before Phase B results)

### 3-axis verdict (Claude's solo judgment, anchor-bias prevention lock)

| Audience | Verdict | One-line basis |
|---|---|---|
| (A) HTML/CSS/JS basics + React 初めて OK | **READY-with-caveats** | 04-27 改善 (Day 01-04 概念表 + Day 05/07/10/15 マーカー) で入口は通る。Day 12 型ガード / Day 15 null境界 / Day 30 secrets で friction は残るが launch blocker ではない。 |
| (B) React 初中級者 | **READY** | 全 30 Days within range。tRPC + Prisma + zod を「学びながら」進む構成は対象読者にフィット。 |
| (C) 完全初心者 (HTML/CSS/JS 未経験) | **NOT_READY** | HTML/CSS/JS の前提知識ギャップが Day 01 から崩れる。Day 02 dashboard layout で Tailwind utility class 連打 (`rounded-3xl bg-card p-6 shadow-sm`) を読めない。前提教材 (HTML/CSS/JS 入門) への誘導が必須。 |

### Tentative bug list (top 20, pre-Phase-B)

| # | Day | Type | Bug | Confidence |
|---|---|---|---|---|
| 1 | D03 | Content | `git add .` 教示の context は anti-pattern teaching (RECLASSIFIED) | High |
| 2 | D12 | Content | ロール permission table 一致確認済み (RESOLVED) | High |
| 3 | D25 | Alignment | changePasswordSchema regex 一致 (RESOLVED) | High |
| 4 | D27 | Alignment | ProjectDetailView migration 反映済み (RESOLVED) | High |
| 5 | D30 | Alignment | .env.example 構造一致 (RESOLVED) | High |
| — | — | — | (D03/12/25/27/30 KNOWN issues は全て解消) | — |
| 6 | D01-04 | Pedagogy | (A) audience: Docker setup / dotenv ${} expansion 重い (caveat) | Medium |
| 7 | D02 | Pedagogy | (C) audience: Tailwind utility class 連打が前提知識を要求 | High |
| 8 | D05 | Pedagogy | react-hook-form + zod + shadcn/ui 同日投入は (A) audience caveat (04-27 マーカー追加で緩和) | Medium |
| 9 | D10 | Pedagogy | 既存実装読解依存 (04-27 マーカー追加で緩和) | Medium |
| 10 | D12 | Pedagogy | 型ガード `is` キーワード初出 — (A) audience friction | Medium |
| 11 | D15 | Pedagogy | null/undefined境界理解 — (A) audience caveat | Medium |
| 12 | D20 | Pedagogy | URL state + UTC date 同期 — 中級寄り | Low |
| 13 | D25 | Pedagogy | 3画面 + refine — 中級寄り | Low |
| 14 | D30 | Pedagogy | Vercel secrets / JWT_SECRET 32文字 — finale 適正 | Low |
| 15 | All | Mechanical | `as any` / `git reset --hard` ゼロ確認済 | High |
| 16 | All | Mechanical | password literal: `password123` (seed.ts と一致) | High |
| 17 | All | Mechanical | `localhost:3000` / `localhost:3001` 共存 (Day 01 vs Day 07+) | High |
| 18 | All | Mechanical | 古い日付 `2025-` 42 occurrences in 13 files (今日 2026-04-30) | Medium |
| 19 | All | Mechanical | TODO/FIXME 34 occurrences — likely pedagogical "次のステップ" | Medium |
| 20 | All | Education | mermaid 26/30, つまず 28/30, PNG 80枚 30/30 days 参照 | High |

### Confidence matrix (Claude self-assessment)

| Axis | Confidence | Note |
|---|---|---|
| Code-Content alignment | High | 5/5 KNOWN issues 全て本人確認 |
| Pedagogy / Difficulty curve | Medium | full read は 5 Days のみ。Phase B subagent 補完待ち |
| src/ runtime bug | Low | Phase A では curriculum focus、src/ はサンプル read のみ |
| Mechanical safety | High | Phase 0 全 grep done |
| Education quality (mermaid/つまず/PNG) | High | 04-26 verdict 数値再確認済 |

### Anchor bias lock

本 tentative verdict (3軸 + bug 20 + confidence) は subagent 結果を見ずに固定した。Phase B 受領後は (a) tentative verdict との **diff のみ** flag、(b) 乖離は原典再 Read で裁定。「subagent が言ってるからこっちに寄せる」は禁止。

## Phase B: Subagent findings (added after Phase A-2 lock)

(filled after subagents return)

## Phase C: Bug verification log

(filled during Phase C)
