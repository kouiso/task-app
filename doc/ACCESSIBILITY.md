# Accessibility checklist

Issue #109 tracks WCAG 2.1 AA readiness. This checklist separates automated coverage from manual assistive-technology checks so release evidence does not rely on `aria-` grep counts.

## Automated gate

- Run `npx playwright test e2e/a11y.spec.ts --project=chromium`.
- The Playwright spec uses `@axe-core/playwright`.
- Current automated scope:
  - `/login`
  - `/register`
  - login form keyboard-only tab order
- Required axe result for covered pages: 0 `critical` violations for `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` tags.

## Keyboard-only checklist

Use this checklist for each major authenticated screen after a test database is available.

| Screen | Required check | Pass criteria |
| --- | --- | --- |
| Login | Tab through email, password, submit, register link | Focus is visible and follows visual order |
| Dashboard | Tab through navigation and primary content links | No keyboard trap; current focus is visible |
| Project dialog | Open dialog, press Tab and Shift+Tab | Focus stays inside the dialog while open |
| Project dialog | Press Escape | Dialog closes and focus returns to the opener |
| Task dialog | Open dialog, press Tab and Shift+Tab | Focus stays inside the dialog while open |
| Task dialog | Press Escape | Dialog closes and focus returns to the opener |

## Screen reader spot check

Run with VoiceOver on macOS or an equivalent screen reader.

| Screen | Required check | Pass criteria |
| --- | --- | --- |
| Login | Move through the form fields | Labels are announced for email and password |
| Dashboard | Move through page regions and navigation | Page heading and navigation links are announced clearly |
| Task creation | Open the task dialog and move through fields | Dialog title, required fields, and submit action are announced |

## Evidence template

```markdown
## Accessibility evidence
- commit:
- command:
- axe result:
- keyboard-only result:
- screen reader:
- known blockers:
```
