---
applyTo: "**"
---

# GitHub Project Field Assignment Rules

## Mandatory at 3 Trigger Points

**WHEN** any of the following events occurs → **assign ALL applicable project fields immediately**.

| Trigger Point | Required Action |
|--------------|----------------|
| **Issue created** | Add to project → assign Milestone, Iteration, Status (and Item Type if available) |
| **PR opened / work started** | Add PR to project → assign Milestone, Iteration, Status = in-progress state |
| **PR completed (merged or closed)** | Verify all fields are set → update Status to done/merged state |

## Required Steps

1. **After `gh issue create`**: Run `gh project item-add <project-number> --owner <org> --url <issue-url>`
2. **After `gh pr create`**: Run `gh project item-add <project-number> --owner <org> --url <pr-url>`
3. **Set each field**:
   - Milestone: `gh issue edit <number> --milestone "<milestone-name>"`
   - Project fields: `gh project item-edit --project-id <id> --id <item-id> --field-id <field-id> ...`
4. **Check current Iteration**: `gh project field-list <project-number> --owner <org>` to get active iteration ID

## Verification Gate (PR completion)

Before reporting a PR as complete, verify:
- [ ] Issue and PR are in the project
- [ ] Milestone is set
- [ ] Iteration is assigned
- [ ] Status reflects current state (done/merged)

IF any field is missing → set it now → THEN report done.

## Prohibited

- Reporting PR complete without verifying all project fields
- Leaving items in "Todo" / "Backlog" status while actively working
- Skipping Iteration assignment

