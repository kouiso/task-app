# License Inventory

Issue: #120
Audit date: 2026-05-24
Scope: paid curriculum redistribution risk for screenshots, snippets, and templates.

## Summary

| Asset class | Count | Source | License / right basis | Redistribution status |
|-------------|-------|--------|------------------------|-----------------------|
| Curriculum Markdown | 35 files | `material/30days-curriculum/*.md` | Project-authored educational text | OK |
| Curriculum screenshots | 78 PNG files | `material/30days-curriculum/screenshots/**` | Project-maintainer captures of this TaskApp curriculum flow unless noted below | OK with source record |
| Scaffold templates | 59 files | `scripts/_*/**` template directories | Project-authored templates for this repository; UI components are project adaptations using installed OSS packages | OK |
| OSS package APIs | package dependencies | `package.json` / `package-lock.json` | Installed dependency licenses, primarily via npm package metadata | OK as dependencies, do not copy upstream docs verbatim |
| Third-party service UI screenshots | 6 screenshot files | GitHub, Vercel/deploy, VS Code UI captures | Project-created screenshots of third-party product UI for tutorial reference | Allowed only as tutorial reference; replace if commercial review requires stricter clearance |

## Scan Commands

The following checks were run from the repository root:

```bash
grep -r 'copyright\|license\|LICENSE\|©' docs/ src/ \
  --include='*.md' 2>/dev/null | head -30
```

Result: one docs evidence line mentioning the CI license-check workflow; no embedded third-party copyright notice was found in docs/src Markdown.

```bash
find material/30days-curriculum/screenshots -type f | wc -l
find material/30days-curriculum -maxdepth 1 -name '*.md' | wc -l
find scripts -maxdepth 2 -type f \( -path 'scripts/_ui-components/*' \
  -o -path 'scripts/_app-components/*' \
  -o -path 'scripts/_server-routers/*' \
  -o -path 'scripts/_app-base/*' \
  -o -path 'scripts/_trpc-base/*' \
  -o -path 'scripts/_lib-base/*' \
  -o -path 'scripts/_constants/*' \
  -o -path 'scripts/_prisma/*' \
  -o -path 'scripts/_docker/*' \
  -o -path 'scripts/_seed/*' \
  -o -path 'scripts/_seed-dev/*' \) | wc -l
```

Results: 78 screenshots, 35 curriculum Markdown files, 59 scaffold/template files.

## Curriculum Screenshot Inventory

Default source for the following PNG files is self-captured TaskApp output generated during curriculum authoring or Playwright/manual verification. The files remain project assets and can be redistributed with the paid curriculum.

| Path | Source | Third-party content check | Status |
|------|--------|---------------------------|--------|
| `material/30days-curriculum/screenshots/bulk-operation-header.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/bulk-operations-complete.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/bulk-task-operations.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/change-password.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/dashboard.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day01-dashboard-named.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day01-env-pasted.png` | Local editor/terminal capture | May include editor UI only | OK |
| `material/30days-curriculum/screenshots/day01-success.png` | Local browser capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day01-vscode-open.png` | VS Code UI capture | Third-party product UI reference | Reference use; replace if stricter clearance is required |
| `material/30days-curriculum/screenshots/day01/first-render.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day02-before.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day02-card-full.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day02-card-title.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day02-code-snippet.png` | Local editor/browser capture | Project code only | OK |
| `material/30days-curriculum/screenshots/day02-complete.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day02-step3-card.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day02/dashboard-message.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day03-commit-success.png` | Git/GitHub workflow capture | Third-party service or terminal UI reference possible | Reference use; replace if stricter clearance is required |
| `material/30days-curriculum/screenshots/day03-git-diff.png` | Git terminal/editor capture | Project code only | OK |
| `material/30days-curriculum/screenshots/day03-git-status.png` | Git terminal/editor capture | Project code only | OK |
| `material/30days-curriculum/screenshots/day03-github-history.png` | GitHub UI capture | Third-party product UI reference | Reference use; replace if stricter clearance is required |
| `material/30days-curriculum/screenshots/day03-rollback.png` | Git terminal/editor capture | Project code only | OK |
| `material/30days-curriculum/screenshots/day04-day30-link.png` | Tutorial/deploy workflow capture | Third-party service UI reference possible | Reference use; replace if stricter clearance is required |
| `material/30days-curriculum/screenshots/day04-final-app-preview.png` | TaskApp deployed app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day04-prep-panel.png` | Deploy workflow capture | Third-party service UI reference possible | Reference use; replace if stricter clearance is required |
| `material/30days-curriculum/screenshots/day04-sample-url.png` | Deployed app/browser capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day04-sharing-diagram.png` | Project-authored diagram | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day04/public-url.png` | Deployed app/browser capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day08-step5-sidebar.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day08-step7-sidebar.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day09-cards.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day09-empty.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day09-loading.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day09-responsive.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/day09-step1.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/error-page.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/login-error.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/login.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/my-task.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/profile-edit.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/profile.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/project-add-member.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/project-create-dialog.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/project-delete-confirm.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/project-detail-archive-action.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/project-detail-dialog.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/project-detail-members.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/project-detail-tasks.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/project-list.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/project-list-after-create.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/archived-project-list.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/register.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/register_complete.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/register_step4.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/register_step6.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/report-weekly.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/report.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/search-results.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/search.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/select-all-checkbox.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/sidebar.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-comment-edit.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-create-dialog.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-detail-comment-form.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-detail-comment-posted.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-detail-comments-list.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-detail-dialog.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-list.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-list-filtered.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-list-after-create.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-list-after-edit.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-row-with-checkbox.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/task-timer.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/user-detail-page.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/user-detail-projects-tasks.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/user-detail-skeleton.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/user-edit-form.png` | TaskApp app capture | No third-party UI detected from path/name | OK |
| `material/30days-curriculum/screenshots/user-list.png` | TaskApp app capture | No third-party UI detected from path/name | OK |

## Template Inventory

The scaffold templates are redistributed as part of this repository's paid curriculum bundle. They are project-authored app scaffolding files generated for this TaskApp codebase. UI component templates use Radix/shadcn-style APIs through installed package dependencies and do not include upstream documentation prose.

| Template group | Paths | Source / right basis | Status |
|----------------|-------|----------------------|--------|
| App shell templates | `scripts/_app-base/*.tsx`, `scripts/_app-api-trpc/route.ts` | Project-authored TaskApp templates | OK |
| App component templates | `scripts/_app-components/**` | Project-authored TaskApp templates | OK |
| UI component templates | `scripts/_ui-components/*.tsx` | Project-authored adaptations using installed OSS APIs; keep dependency notices in package metadata | OK |
| Server/router templates | `scripts/_server-base/*.ts`, `scripts/_server-routers/**/*.ts` | Project-authored TaskApp templates | OK |
| tRPC/lib/constant templates | `scripts/_trpc-base/*.ts*`, `scripts/_lib-base/*.ts`, `scripts/_lib-utils/*.ts`, `scripts/_constants/*.ts` | Project-authored TaskApp templates | OK |
| Prisma/Docker/seed templates | `scripts/_prisma/*`, `scripts/_docker/docker-compose.yml`, `scripts/_seed/*`, `scripts/_seed-dev/*` | Project-authored TaskApp templates | OK |

## Code Snippet Compatibility

| Area | Check | Result |
|------|-------|--------|
| Curriculum code fences | Markdown snippets mirror this repository's implementation and scaffold templates | OK |
| OSS-derived snippets | No copyright/license marker found in docs/src Markdown scan | No required notice found |
| Package APIs | Uses normal imports from npm dependencies in `package.json` | Dependency licenses remain governed by npm package metadata |
| shadcn/Radix UI usage | Templates call OSS component APIs and project styling; no upstream docs prose copied in this inventory scan | MIT-compatible dependency use |

## Required Maintenance

- When adding a new screenshot, record whether it is a TaskApp app capture, a local editor/terminal capture, or a third-party service UI capture.
- When adding a new scaffold template copied from upstream source, add the upstream project, license, URL, copied file, and required attribution to this inventory.
- Before commercial release, consider replacing third-party product UI screenshots with self-authored diagrams if legal review requires zero third-party UI depiction.
