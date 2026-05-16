# task-app Test Flow Plan

## Goal

task-app is a paid 30-day hands-on curriculum. The finish line is not another open-ended LLM review loop; it is objective evidence that a learner can follow the material and end with a working Next.js task-management app.

## Fixed Completion Criteria

1. Unit/integration tests pass: `npm test`.
2. Build/type generation pass: `npm run build` and `npm run type-check` if the repo supports them without external production secrets.
3. Lint/format gate is understood: `npm run lint` result is recorded, including known symlink/prompt-tree warnings.
4. Curriculum quality scripts pass or each remaining violation is classified with a concrete fix owner.
5. Material code examples match `src/` for all touched curriculum days, especially Day 01/10/20/30 and UI redesign-related days.
6. Real browser E2E covers learner-critical flows: signup/login, project CRUD, task CRUD/status, comments, search/filter, dashboard reflection.
7. Screenshots and distributable ZIP reflect the current UI and material.

## Active Phases

| Phase | Status | Owner | Scope |
| --- | --- | --- | --- |
| 1 | completed | Codex副長 | Rebuild the canonical test flow and current evidence map. |
| 2 | completed | taskapp-flow組長 | Audit existing Playwright/E2E scripts and identify missing learner flows. |
| 3 | completed | taskapp-quality組長 | Run objective curriculum gates and classify remaining issues. |
| 4 | completed | taskapp-browser組長 | Execute visible-browser workflow against the app and capture screenshots. |
| 5 | completed | Codex副長 | Merge findings, fix high-confidence gaps, and produce a PR-ready status. |

## Rules

- Do not rerun broad LLM reviews as a completion criterion.
- Do not ask 局長 to operate browser, login, screenshots, env, or 1Password. Use local browser automation and existing env/token sources.
- Do not mark a lane done without command output or screenshot/evidence path.
- If a lower session is idle or repeating a failed action without new evidence, Codex副長 must kick or replace it.
