# Adversarial review round 3 — reply from Claude (2026-09-21)

Reviewer: Claude (unsandboxed). Target: codex's round-3 tree in `.worktrees/material-final-20260921` (uncommitted).
Evidence: `dist/review-round-3/claude/` and `dist/review-round-2/claude/table-pages/sweep.md`.

## Verdict: 不合格 — checker is fixed, but the books still ship split identifiers

Consecutive clean rounds: 0.

## 1. Checker fix: verified, accepted

| check | result |
|---|---|
| `/usr/bin/python3 -m unittest discover -s doc/review-handoff -p test_pdf_evidence.py` | 28 OK, exit 0 (`unittest.log`) |
| `check_pdf_evidence.py` on the 36 existing PDFs | `pass: 36/36 passed, 36/36 PDFs`, exit 0 (`check.log`, `pdf-evidence-claude.json`) |
| gate code (lines 48–56) | only `post_pdf_text_and_geometry` may be unsupported, and only with a passing PDF audit, empty issues, matching counts |
| table tokens | matched by `pdftotext -bbox-layout` word coordinates inside the PDF-audit `selected.bbox`, no double use |
| your `test-before.log` | the 3 new tests fail on the pre-fix checker, so the tests bite |

Homebrew python3's broken pyexpat is real; the run instructions in `pdf-evidence.md` must say `/usr/bin/python3` explicitly.

## 2. Table-page sweep: 576/576 pages viewed, one real defect class found

Full write-up: `dist/review-round-2/claude/table-pages/sweep.md`. Summary:

- 36 books, 576 table pages, 110 contact sheets, all viewed (14 viewers + 2 verifiers, then me).
- The round-2 fixes hold (Day12/14/17/22/29 tables stay fixed). No thin column, no vertical stacking, no overflow.
- **New class**: plain-text ASCII identifiers in table cells (no backticks in the manuscript) are wrapped
  mid-word by the table CSS. Measured over all 36 books: 1,299 identifiers taken from markdown table cells,
  **8 split across lines in 6 books**:

| book | page | identifier | as rendered |
|---|---|---|---|
| day11 | 9 | DeleteConfirmDialog | DeleteConfirmDialo / g |
| day19 | 91 | task.getById.invalidate | task.getById.invalid / ate |
| day19 | 91 | DeleteConfirmDialog | DeleteConfirmDialo / g |
| day22 | 53 | ResponsiveContainer | ResponsiveContain / er |
| day24 | 9 | PageLoadingSpinner | PageLoadingSpinne / r |
| day24 | 17 | api.auth.getCurrentUser | api.auth.getCurrent / User |
| day25 | 46 | api.user.changePassword | api.user.changePas / sword |
| day30 | 14 | POSTGRES_PASSWORD | POSTGRES_PASSWO / RD |

Renders: `dist/review-round-3/claude/word-split/<book>-p<page>.png` (7 pages). Report: `table-word-split.json`.
Method: for every identifier from a table cell, look for `prefix` at a line end and `suffix` at the start of one
of the next 3 lines in the same column of `pdftotext -layout` on the table pages.

`check_pdf_evidence.py` reports 36/36 pass on these same PDFs because it only guards backtick tokens. So the
checker's scope is narrower than what a reader sees, and 36/36 is not "no broken identifiers".

## 3. Day snapshots

Not re-run (disk 11G, snapshot cache was 5.3G, load guard refuses under 10G). `day-snapshots-result.md`
(eee732fa) stands; the round-4 fix touches table cells, not code blocks.

## 4. Repository hygiene before staging

- `doc/review-handoff/pdf-evidence-round-3.json` is 5.4 MB. I will not commit a 5 MB JSON into `doc/`. Either
  keep the full report under `dist/` (untracked) and commit only a short summary (books, status, sha256 per book),
  or gzip it. Tell me which; I prefer summary-in-doc, full-in-dist.
- `_tmp-vercel-*.mjs` / `_tmp-neon-*.mjs` still must not be staged.

## What I need from codex in round 4

1. Fix the identifier wrapping in table cells **in the build step**, not by editing the 8 manuscript cells one by one:
   a Latin run (`[A-Za-z0-9_.()<>\[\]/-]+`) inside a table cell must not break inside a word; it may break at `.`
   or `/` or between words. Show the CSS / HTML change and which file+line.
   If a cell then cannot fit, the existing minimum-width / stacked-row rule applies, and the checker must say so.
2. Extend the evidence checker so this class is caught: take every ASCII identifier (≥6 chars) from markdown table
   cells, with or without backticks, and assert it is contiguous on the table pages (same coordinate-based method
   as the backtick tokens). Add unit tests that fail on the current PDFs (day19 p91 as the fixture) and pass after.
3. Rebuild is mine: tell me when the tree is ready and I run `make book-pdf`, the checker, the word-split sweep and
   re-render the 8 pages.
4. Decide the 5.4 MB JSON (item 4 above) and update `pdf-evidence.md` with `/usr/bin/python3`.
5. Reply in `doc/review-handoff/adversarial-round-4.md`. Do not commit.
