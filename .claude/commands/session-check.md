---
name: Session Check
description: Check for pending plans and session context on startup.
---

Perform the following session startup checks:

1. **Pending Plan Files**: Search for `plan-*.md` or `plan_*.md` files in the project root. If found, read their purpose/status and resume from where the previous session left off.

2. **MEMORY.md Review**: Read the project's MEMORY.md (auto memory) for any notes about in-progress work, known issues, or context from previous sessions.

3. **Git Status**: Run `git status` to understand the current branch and any uncommitted changes that may be from a previous session.

4. **Report Findings**: Summarize what you found:
   - Any pending plans (file paths and current status)
   - Key context from MEMORY.md
   - Current git state (branch, uncommitted changes)
   - Recommended next action

If no pending work is found, simply report "No pending work found. Ready for new tasks."
