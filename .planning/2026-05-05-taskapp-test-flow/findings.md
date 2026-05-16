# task-app Findings

## 2026-05-05 Context

- True purpose: a learner-facing 30-day curriculum where following the material produces a working production-level task-management app.
- Previous anti-loop decision: stop chasing subjective LLM review scores; use finite objective quality gates.
- Existing evidence says `npm test` passed with 203 tests in the prior Codex run, and curriculum Day 01/10/20/30 were already walked through.
- Existing Playwright evidence from 2026-04-13 reports 19/20 OK, with one warning around the "進行中" status filter where a TODO task remained visible or the check matched stale DOM text.
- Handoff notes say Phase B originally required UI redesign curriculum alignment and screenshot refresh after the Ant Design-inspired token update.

## Immediate Risks

- The latest branch contains unrelated prompt/instruction deletion/untracked migration noise; do not revert it.
- Existing E2E summary is older than the current branch state and was headless; current acceptance needs visible-browser confirmation.
- The previous completion definition may be stale after UI/curriculum edits, so the objective gates must be rerun before PR-ready status.

## 2026-05-13 Evidence

- Current branch now has fresh local objective evidence for the active completion criteria.
- Unit/integration tests passed: `npm test` reported 203/203 passing.
- Build and type gates passed: `npm run build` and `npm run type-check`.
- Lint gate is understood, not a code-style failure: `npm run lint` exited 0 with 40 broken symlink warnings in prompt/instruction trees.
- Curriculum quality gate passed: `bash script/bulk_quality_check.sh` reported 30/30 files passing and refreshed `material/quality_reports`.
- Visible browser E2E passed: `npm run test:e2e -- --headed` reported 50/50 passing and refreshed screenshots under `material/30days-curriculum/screenshots`.
- Distributable ZIP was regenerated: `task-app-curriculum-v1.0.zip` at 11M.

## Remaining Notes

- `lucky-question-key.md` was not found by filename search. If that file exists outside this checkout, its specific tasks were not available in this run.
- Playwright and build logs repeatedly emitted Prisma/OpenTelemetry dynamic dependency warnings via Sentry import traces; they did not fail the gates.
- The seed script uses create calls for projects/tasks/comments, so repeated local seeding can duplicate demo records. This did not block E2E because assertions are tolerant of extra data.
