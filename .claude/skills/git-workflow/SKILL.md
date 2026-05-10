---
name: task-app-git-workflow
description: Use when doing Git or GitHub workflow work in task-app, especially branch strategy, commit-fix procedures, PR handling, and cross-repo issue references
---

---
applyTo: "**"
---

# Git & GitHub Rules

## 1. Git Branch Strategy

### Branch Strategy Overview

This project adopts a branch strategy based on Git Flow.

### Primary Branches

| Branch | Role | Notes |
|--------|------|-------|
| `main` | Development main branch | **All development branches must be created from here** |
| `production` | Production environment branch | Deployment target for production |

### Branch Rules During Development

#### New Features & Bug Fixes

1. **Always create new branches from the `main` branch.**

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/xxx  # or fix/xxx, chore/xxx, etc.
   ```

2. **Creating branches directly from `production` is prohibited.**

   - `production` is exclusively for the production environment and must never serve as a starting point for development.

#### Release Workflow

- Merge into the `production` branch only during release work.

- Release PRs merge in the direction of `main` → `production`.

### About the Local `production` Branch

A `production` branch may exist in the local repository, but it is a **dummy branch solely for running git flow commands**.

- Do not perform development work directly on the local `production` branch.

- Use it only for initializing/configuring git flow commands (e.g., `git flow init`).

- Actual production deployments reference the remote `production` branch.

### Key Principles

- **Always develop from `main`** — never branch from `production`.

- **`production` is production-only** — never use it as a starting point for development branches.

- **Local `production` is a dummy** — for git flow commands only, never work on it directly.

## 2. Pull Request Rules

### Template Compliance

- Check for the existence of `.github/pull_request_template.md`.

- If it exists: strictly follow the template (you may add detail, but never change or omit sections).

- If it does not exist: no constraints apply.

### Absolute Rule for Cross-Repository Issue References

**When referencing issues from another repository in PRs or commit messages, the shorthand `#123` is prohibited.**

- **Prohibited**: `#429` (this links to Issue #429 in the same repository)

- **Required**: `getozinc/mypappy#429` (fully qualified format)

**Reason**: In projects where multiple repositories are linked, the shorthand `#429` links to the current repository's issue, not the intended one in another repository.

**Verification steps**:

1. Before creating/updating a PR, confirm which repository the issue belongs to.

2. If it is in a different repository, always use the `owner/repo#number` format.

### GitHub Operation Notes

- New PR creation: use GitHub MCP or the `gh` command.

- **Updating existing PRs**: GitHub MCP cannot be used; the `gh` command is required.

- When GitHub MCP is unavailable: use the `gh` command as a fallback.

### Mandatory Branch Verification Before PR Work

**Before performing any PR-related work, always verify the branch name with `gh pr view <PR_NUMBER> --json headRefName`.**

- **Prohibited**: assuming or guessing the PR's branch name from memory.

- **Required**: confirm the actual branch name via `gh pr view` or GitHub MCP before working.

**Reason**: Using the wrong branch name causes changes to be pushed to an unrelated branch, creating confusion during review.

## 3. Commit Fix Protocol

**When `/commit-fix` is executed, follow this protocol to the letter. The top priority is minimizing reviewer burden and absolutely preventing regressions.**

### Situation Assessment Phase (Steps 1–3)

#### Step 1: PR Discovery
- Check whether a PR exists for the current branch (via GitHub MCP, etc.).

- Only confirm existence; do not create a PR.

- If the user provides a PR URL, inspect its diff first.

#### Step 2: Diff Identification
- **PR exists**: fully understand the file diffs from the "Files changed" tab.

- **PR does not exist**: understand the diff between the current branch and its base branch (develop/main, etc.).

#### Step 3: Target Commit Selection
- List only the commits affected by the above diff as reorganization targets.

- Never touch unrelated commits.

### Mental Preparation Phase (Step 4)

#### Step 4: Rule Re-confirmation
- Check for the existence of `.github/copilot-instructions.md`.

- If it exists, re-read its contents thoroughly and ensure 100% compliance throughout the work.

- Pay special attention to the "Technical Regulations" section, particularly "Git & GitHub" and related prohibitions.

### Commit Reorganization Phase (Step 5)

#### Step 5: Autonomous Rebase Execution

**Execute `git rebase -i` exclusively via `GIT_SEQUENCE_EDITOR` combined with a script (sed/python). All other methods (manual rebase, `reset --hard`, etc.) are absolutely prohibited.**

##### Guiding Principles for Reorganization

###### Overall Plan Formulation
- Survey all target work commits holistically.

- Analyze class/function dependencies and draw an overall design map before complex code refactoring — equivalent to an architectural blueprint.

- Think: "Does merging these commits create logical change units for the reviewer?" and "Does the final commit list clearly convey the intent of changes in chronological order?"

- **Plan the complete final commit list before starting work.**

###### Commit Label Prohibition
- Final commit messages must not contain Conventional Commits prefixes such as `refactor:`, `fix:`, etc.

###### Only One `feat` Per PR
- Absolutely never include multiple `feat:`-equivalent feature-addition commits in a single PR.

- A PR must focus on a single concern to keep the review focused — this is an absolute rule.

###### Respect Existing Commits
- **Using `git reset --soft` to reset commits and rebuild from scratch is prohibited in principle.**

- This prevents erasing incremental implementation intent and causing regressions.

- Focus on polishing existing commits through **merging (squash/fixup) and reordering**.

###### Merge "Meaningful Commits"
- Commits like "WIP", "tmp", or "fix later" are considered "meaningless commits".

- These must be merged (squash/fixup) into related "meaningful commits".

###### Commit Message Must Match Diff
- The final commit message must represent the diff contents with neither excess nor omission.

- For example, a commit titled "Add user authentication" must not include unrelated log output modifications.

##### AI Guide: Definition of "Meaningful Commits"

**Think of a data processing pipeline optimization example:**

- **Meaningless commits (before optimization)**: "Load data", "Create temp variable A", "Process A", "Debug print A", "Delete unused B"

  - These are individual instructions (atomic operations) of the pipeline — fragmented, with unclear final purpose.

  - This includes `WIP`, `fix typo`, and similar work commits.

- **Meaningful commits (after optimization)**: "Extract & normalize raw data from source A", "Aggregate normalized data & generate features"

  - These are cohesive groups of operations forming "logical processing stages".

  - A reviewer (pipeline maintainer) can understand and evaluate the content at the "stage" level.

**The `/commit-fix` task**: Reorganize fragmented instructions (work commits) into logical, self-contained "processing stages" (meaningful commits) that reviewers can understand.

### Finalization Phase (Step 6)

#### Step 6: Finish & Force Push
- After commit reorganization, run `git status` etc. to perform a final check for missed commits or unstaged diffs.

- After confirming everything is perfect, update the remote branch with `git push --force-with-lease`.

- **Using the `--force` option alone is absolutely prohibited under any circumstances.**

- `--force-with-lease` is the mandatory safety mechanism that prevents accidentally overwriting other developers' changes on the remote branch.

## 4. Project Knowledge Base & Reference Repositories

### Project Knowledge Base

Stable foundational information for the MYPAPPY project (repository structure, payment system architecture, tech stack, etc.) is consolidated in the following file:

- **`knowledge.md`**: A knowledge base recording the project's stable information.

  - Repository structure (mypappy, mypappy-api, mypappy-native, mypappy-web)

  - Payment system information (CREDIX, UnivaPay, Stripe, RevenueCat)

  - Tech stack details

  - Team member information

  - External service integrations

**Always review `knowledge.md` before starting work to understand the full project picture.**

### Reference Repositories

- **ritmo-inc/bywill-backend**
  - The backend submodule's design is heavily inspired by this repository — it is essentially the reference model. Always inspect the source code via GitHub MCP. Many user instructions assume familiarity with this repository, so always check it first.

  - **Note**: The directories under `domain/` may appear to be organized per-user at first glance, but bywill also organizes them per-resource. Do not mistakenly conclude "This doesn't follow bywill's design!" The author of bywill confirmed this themselves.

**Confidence**: High
