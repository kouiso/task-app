# Codex Review: Phase A-0 Procedure Map

## 1) Detection Logic Critique

### Procedure definition parsing

- The script parses procedure definitions with a single line-oriented regex:
  `^\s*([a-zA-Z][a-zA-Z0-9]*)\s*:\s*(publicProcedure|protectedProcedure)` (`scripts/curriculum-qa/gen_procedure_map.py:34-36`), applied line-by-line in `extract_procedures()` (`scripts/curriculum-qa/gen_procedure_map.py:46-54`). This is not AST-based and is fragile to formatting variance.
- It only recognizes object properties where the procedure name, colon, and `publicProcedure` / `protectedProcedure` appear on the same line (`scripts/curriculum-qa/gen_procedure_map.py:34-36`, `scripts/curriculum-qa/gen_procedure_map.py:50-53`). A procedure formatted as:
  ```ts
  getByTaskId:
    protectedProcedure
  ```
  would be missed even though it is valid TypeScript object syntax.
- It only accepts names matching `[a-zA-Z][a-zA-Z0-9]*` (`scripts/curriculum-qa/gen_procedure_map.py:35`). Quoted keys, computed keys, underscore-containing keys, or keys beginning with `$` would be missed. That may be acceptable for this codebase convention, but the script does not validate that convention.
- Router names are inferred from `router_file.stem` (`scripts/curriculum-qa/gen_procedure_map.py:102-108`), so the script assumes the public tRPC router name equals the file name in `scripts/_server-routers/*.ts`. If `root.ts` aliases or nests routers differently, the map can be wrong without any warning.
- The script explicitly skips router files whose stem starts with `_` (`scripts/curriculum-qa/gen_procedure_map.py:102-105`). That is appropriate for `_helpers`, but it is another filename convention baked into the detector.

### Curriculum and scaffold usage detection

- Curriculum usage is detected only by the regex `api\.([a-zA-Z][a-zA-Z0-9]*)\.([a-zA-Z][a-zA-Z0-9]*)` (`scripts/curriculum-qa/gen_procedure_map.py:37`), scanned over `material/30days-curriculum/day*.md` (`scripts/curriculum-qa/gen_procedure_map.py:57-68`). This misses curriculum references that use prose or partial names, such as `comment.getByTaskId`, `getByTaskId`, or `quickSearch`.
- The day number is taken only from filenames matching `^day(\d+)_` (`scripts/curriculum-qa/gen_procedure_map.py:38`, `scripts/curriculum-qa/gen_procedure_map.py:41-43`). Files like `day20.md` or nested day files would be ignored even if they are part of the curriculum.
- The script records only the earliest curriculum day per `(router, procedure)` (`scripts/curriculum-qa/gen_procedure_map.py:64-67`). That is useful for a first-use map, but it hides later repeated uses and cannot prove a procedure is covered adequately after first mention.
- Scaffold usage is scanned only in `scripts/_app-components` and `scripts/_app-base` (`scripts/curriculum-qa/gen_procedure_map.py:71-80`), and only for `*.tsx` files (`scripts/curriculum-qa/gen_procedure_map.py:76`). It will miss scaffold calls in `.ts`, `.md`, generated snippets outside those two directories, `scripts/_app-api-trpc`, or actual app code under `src/`.
- Scaffold matching uses the same strict `api.router.procedure` regex (`scripts/curriculum-qa/gen_procedure_map.py:37`, `scripts/curriculum-qa/gen_procedure_map.py:77-80`). It will miss destructured aliases, wrapper helpers, `const utils = api.useUtils(); utils.router.procedure.invalidate(...)`, `caller.router.procedure(...)`, string-literal route names, or code samples split across lines.
- A procedure is marked orphan only when both `first_day is None` and `comp_ref` is empty (`scripts/curriculum-qa/gen_procedure_map.py:109-118`). Therefore, one accidental textual match in a markdown file or scaffold file is enough to clear the orphan flag.

### False positive risks

- Because the detector requires `api.router.procedure`, it flags references that are real curriculum mentions but not tRPC client call snippets. This happened for `comment.getByTaskId`: Day 18 names `comment.getByTaskId` twice (`material/30days-curriculum/day18_コメント投稿.md:187`, `material/30days-curriculum/day18_コメント投稿.md:557`), but the script does not count either because they lack the `api.` prefix (`scripts/curriculum-qa/gen_procedure_map.py:37`, `scripts/curriculum-qa/gen_procedure_map.py:64-67`).
- The same false-positive pattern applies to bare procedure names in method tables: Day 20 lists `quickSearch` (`material/30days-curriculum/day20_タスク検索機能.md:151`) and Day 12 lists `updateMemberRole` (`material/30days-curriculum/day12_メンバー追加.md:699`, `material/30days-curriculum/day12_メンバー追加.md:729`), but neither is counted by `API_CALL_RE` (`scripts/curriculum-qa/gen_procedure_map.py:37`).
- The scaffold scan does not include actual app code under `src/` (`scripts/curriculum-qa/gen_procedure_map.py:71-80`). For example, `api.project.updateMemberRole.useMutation` exists in the real app at `src/app/project/page.tsx:125`, but it is invisible to the Phase A-0 scaffold detector.

### False negative risks

- `API_CALL_RE` has no word boundary before `api` and does not distinguish prose, comments, or code blocks (`scripts/curriculum-qa/gen_procedure_map.py:37`, `scripts/curriculum-qa/gen_procedure_map.py:63-67`). A sentence that merely says "do not use `api.search.quickSearch`" would count as usage and clear the orphan flag.
- The detector does not verify that a matched `api.router.procedure` token is a call, query, mutation, invalidation, import, or runnable code (`scripts/curriculum-qa/gen_procedure_map.py:63-67`, `scripts/curriculum-qa/gen_procedure_map.py:77-80`). This can under-report true orphans if unrelated text contains the token.
- The orphan gate considers any scaffold reference enough to make a procedure non-orphan (`scripts/curriculum-qa/gen_procedure_map.py:109-118`). A stale scaffold snippet can mask a procedure that the curriculum never teaches.
- Since procedure extraction is regex-based and only sees `scripts/_server-routers/*.ts` (`scripts/curriculum-qa/gen_procedure_map.py:27-29`, `scripts/curriculum-qa/gen_procedure_map.py:102-106`), a missed definition is not reported as an orphan. That is a false negative at the inventory level.

## 2) Per-Orphan Verdict

Searches run:

- Exact client-call forms: `rg -n "api\.comment\.getByTaskId|api\.project\.updateMemberRole|api\.search\.quickSearch" material/30days-curriculum/day*.md scripts/_app-components scripts/_app-base || true` returned no matches.
- Router/procedure prose forms: `rg -n "comment\.getByTaskId|project\.updateMemberRole|search\.quickSearch" material/30days-curriculum/day*.md scripts/_app-components scripts/_app-base || true` returned Day 18 matches for `comment.getByTaskId`.
- Bare procedure forms: `rg -n "\bgetByTaskId\b|\bupdateMemberRole\b|\bquickSearch\b" material/30days-curriculum/day*.md scripts/_app-components scripts/_app-base || true` returned the Day 12, Day 18, and Day 20 matches cited below.

| procedure | verdict | evidence |
|---|---|---|
| `comment.getByTaskId` | False positive for "unreferenced anywhere in material/scaffold"; true positive only under the script's strict `api.*.*` call definition. | Defined at `scripts/_server-routers/comment.ts:95`. Day 18 lists `getByTaskId` in the comment router method table (`material/30days-curriculum/day18_コメント投稿.md:136`) and explicitly names `comment.getByTaskId` as a query not used because `task.getById` already includes comments (`material/30days-curriculum/day18_コメント投稿.md:185-188`, `material/30days-curriculum/day18_コメント投稿.md:555-558`). The exact `api.comment.getByTaskId` search returned no matches in curriculum/scaffold. Scaffold task detail uses `api.task.getById` plus comment create/update/delete mutations, not `comment.getByTaskId` (`scripts/_app-components/task/task-detail-dialog.tsx:63-69`, `scripts/_app-components/task/task-detail-dialog.tsx:78-88`). |
| `project.updateMemberRole` | False positive for "unreferenced anywhere in material/scaffold"; true positive under the script's strict `api.*.*` call definition in the scanned scaffold. | Defined at `scripts/_server-routers/project.ts:402`. Day 12 lists `updateMemberRole` in the `canManageMembers` API set (`material/30days-curriculum/day12_メンバー追加.md:694-700`) and again says the same permission is used by `removeMember` / `updateMemberRole` / `update` (`material/30days-curriculum/day12_メンバー追加.md:726-730`). The exact `api.project.updateMemberRole` search returned no matches in curriculum/scaffold, but the real app uses `api.project.updateMemberRole.useMutation` at `src/app/project/page.tsx:125`, which is outside the script's scaffold scan. |
| `search.quickSearch` | False positive for "unreferenced anywhere in material/scaffold" if bare curriculum method-table mentions count; otherwise uncertain because no router-qualified curriculum/scaffold reference exists. | Defined at `scripts/_server-routers/search.ts:143`. Day 20 lists `quickSearch` in the search router method table (`material/30days-curriculum/day20_タスク検索機能.md:146-153`). The exact `api.search.quickSearch` and `search.quickSearch` searches returned no matches in curriculum/scaffold. Existing tests call `caller.search.quickSearch` (`src/server/api/routers/__test/search.test.ts:66-73`), but tests are outside the requested material/scaffold verdict scope. |

## 3) Phase A-0 Approach Assessment

The Phase A-0 invariant is directionally sound as a pre-rewrite inventory: before rewriting a 30-day curriculum, it is useful to know which distributed tRPC procedures are introduced in which day and whether any server surface is apparently never taught. The script already produces a machine-readable map and a hard orphan gate (`scripts/curriculum-qa/gen_procedure_map.py:123-132`, `scripts/curriculum-qa/gen_procedure_map.py:150-158`), which can prevent silent drift between server APIs and curriculum coverage.

However, the current implementation is not sound enough as a hard gate for curriculum quality. It checks token presence, not teaching intent, runnable code, or learner outcome. The strict `api.router.procedure` pattern (`scripts/curriculum-qa/gen_procedure_map.py:37`) is too narrow for curriculum prose and too loose for actual executable usage. It can flag procedures that are intentionally documented as not used, such as `comment.getByTaskId` in Day 18 (`material/30days-curriculum/day18_コメント投稿.md:185-188`), and it can also pass stale or negative mentions because any token match counts (`scripts/curriculum-qa/gen_procedure_map.py:63-67`, `scripts/curriculum-qa/gen_procedure_map.py:77-80`).

Even if implemented perfectly, a procedure-to-day map would miss several curriculum failure modes:

- A day may mention a procedure only in prose and never teach a working client call.
- A day may include the correct API call but in an order that is pedagogically broken for beginners.
- A procedure may be intentionally present for tests, future extension, or completed app behavior, not necessarily as an explicit day objective.
- The curriculum may teach an outdated shape of the input/output schema even while the procedure name is present.
- Cross-day prerequisites, screenshots, seed data, auth state, and UI wiring can still be broken while every procedure has a mapped day.

My assessment: sound as one inventory signal; unsound as a standalone Phase A-0 quality gate unless the output distinguishes "called in runnable snippet", "mentioned in prose", "intentionally unused/reserved", "scaffold-only", and "test-only".

## 4) Risks Claude May Have Missed

- False confidence from strict-call orphans: The gate reports `comment.getByTaskId`, `project.updateMemberRole`, and `search.quickSearch` as orphans because it only counts `api.router.procedure` tokens (`scripts/curriculum-qa/gen_procedure_map.py:37`, `scripts/curriculum-qa/gen_procedure_map.py:109-118`), even though the curriculum names all three in some form (`material/30days-curriculum/day18_コメント投稿.md:136`, `material/30days-curriculum/day12_メンバー追加.md:699`, `material/30days-curriculum/day20_タスク検索機能.md:151`). Impact: writers may add unnecessary or misleading client-call examples just to satisfy the gate.
- False confidence from loose matches: A procedure stops being an orphan after any regex hit in markdown or scaffold (`scripts/curriculum-qa/gen_procedure_map.py:64-67`, `scripts/curriculum-qa/gen_procedure_map.py:77-80`, `scripts/curriculum-qa/gen_procedure_map.py:109-118`). Impact: a negative sentence, TODO, or stale snippet can make the gate pass while the curriculum still does not teach the feature.
- Scaffold coverage gap: The script scans only `scripts/_app-components` and `scripts/_app-base` `.tsx` files (`scripts/curriculum-qa/gen_procedure_map.py:71-80`). Impact: references in `src/`, `.ts` scaffold files, route files, API setup, or future scaffold directories are invisible; `src/app/project/page.tsx:125` demonstrates that real app usage can exist outside the gate.
- Definition parser maintenance burden: The regex extractor (`scripts/curriculum-qa/gen_procedure_map.py:34-36`, `scripts/curriculum-qa/gen_procedure_map.py:46-54`) depends on current formatting and naming conventions. Impact: harmless formatting changes can remove procedures from the inventory entirely, creating false negatives that look like a clean gate.
- First-use only hides coverage quality: The script stores a single earliest day (`scripts/curriculum-qa/gen_procedure_map.py:64-67`, `scripts/curriculum-qa/gen_procedure_map.py:111-116`). Impact: it cannot tell whether later days rely on a procedure before it is taught in runnable form, whether a procedure is revisited correctly, or whether coverage is spread across prose and code.
- Test channel gate is not implemented yet but appears in the same result object: all discovered tests are initialized to `UNASSIGNED` (`scripts/curriculum-qa/gen_procedure_map.py:120-121`), and `G-testchan` is computed from that placeholder state (`scripts/curriculum-qa/gen_procedure_map.py:134-138`), while only orphan count controls process exit (`scripts/curriculum-qa/gen_procedure_map.py:157-158`). Impact: consumers may overread the JSON as a complete multi-gate quality report even though only `G-orphan` is enforced.
- Budget and per-day gates are placeholders: `G-budget` and `G-perday` both return `pass: None` with notes (`scripts/curriculum-qa/gen_procedure_map.py:139-146`). Impact: Phase A-0 can appear broader than it is; a passing run would not prove the rewrite stays within day-size limits.
- Generated metadata can pollute future ad hoc searches: the script writes `material/30days-curriculum/_meta/procedure-day-map.json` (`scripts/curriculum-qa/gen_procedure_map.py:11`, `scripts/curriculum-qa/gen_procedure_map.py:31-32`, `scripts/curriculum-qa/gen_procedure_map.py:150-151`). Impact: reviewers using broad `rg` over `material/` can accidentally count generated claims as source evidence unless `_meta` is excluded.
