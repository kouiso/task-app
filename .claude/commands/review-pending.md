# /review-pending - Interactive Pending Review

## Pre-requisite

Before executing this command, read the following files:

- `prompt/instructions/code-review.md`
- `prompt/skills/review-perspectives.md`
- `prompt/skills/github-pending-review.md`

## Trigger

User provides a PR URL and requests a review with pending review posting.

## Workflow

### Phase 1: Gather PR Context

1. Fetch PR metadata: `gh pr view <PR_NUMBER> --repo <OWNER/REPO> --json title,body,headRefName,baseRefName,changedFiles,additions,deletions,author`
2. Fetch full diff: `gh pr diff <PR_NUMBER> --repo <OWNER/REPO>`
3. Fetch existing review comments (including self-comments by the PR author): `gh api repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments`
4. Fetch CodeRabbit and other bot reviews for context

### Phase 2: Multi-Perspective Review

Launch parallel subagents for comprehensive review covering:

- Code quality and TypeScript type safety
- Architecture and component design
- React Native performance (unnecessary re-renders, memoization, StyleSheet patterns)
- Breaking change impact (search ALL callers of modified interfaces/components)
- Business logic correctness

Reference the PR author's self-comments to understand their reasoning before critiquing.

### Phase 3: Present Review Summary

Present all findings in chat, grouped by severity:

- **[MUST]**: Bugs, crashes, security issues, type safety violations — Must fix before merge
- **[SUGGEST]**: Quality improvements, performance, maintainability — Strongly recommended
- **[Q]**: Questions about intent or requirements — Need clarification
- **[IMO]**: Subjective suggestions, alternative approaches — Personal opinion
- **[NITS]**: Typos, formatting, minor naming — Trivial

### Phase 4: Interactive Comment Posting

**Critical: Post comments ONE AT A TIME with user approval.**

For each comment:

1. **Present** the full comment content in chat (including `suggestion` block if applicable)
2. **Wait** for user to say OK, request modifications, or skip
3. **Post** to the pending review using GraphQL `addPullRequestReviewThread`
4. **Confirm** the post succeeded and provide the PR URL

When the user says "post all remaining" or similar:

1. Present ALL remaining comments at once for review
2. Wait for user approval
3. Post all approved comments sequentially
4. Report completion with total count

### Phase 5: Self-Review

After all comments are posted, automatically self-review:

1. **Conflicting suggestions**: Ensure applying suggestion A does not break suggestion B (e.g., variable rename in one comment but old name used in another suggestion)
2. **Suggestion line ranges**: Verify `startLine`/`line` covers ALL code that the suggestion replaces. If a rename affects L73 and L99, the range must cover L73-101, not just L73-95.
3. **Consistency**: Verify terminology, tag usage ([MUST] vs [SUGGEST]), and tone are consistent
4. **Completeness**: Check that no important issue was missed
5. Fix any issues found immediately (update or delete+recreate comments)

### Phase 6: User Submits

**Never submit the review. The user submits from GitHub UI or gives an explicit submit instruction.**

Remind the user: "GitHub の Files changed タブで確認して、問題なければ Submit（Request Changes）してな！"

---

## Comment Format

Each comment should include:

1. **Severity tag as heading**: `## [MUST]: Title` or `## [SUGGEST]: Title`
2. **Why it matters**: Explain the problem and its impact
3. **Concrete fix**: Use GitHub `suggestion` blocks wherever possible so the author can apply with one click
4. **Context from self-comments**: If the author left a self-comment explaining their reasoning, acknowledge it

### Suggestion Block Rules

- The `suggestion` block replaces exactly the lines covered by `startLine` to `line`
- Include ALL affected lines in the range — partial ranges cause errors when "Commit suggestion" is clicked
- For changes involving variable renames: expand the range to include all references in contiguous code

### Example Comment

````
## [MUST]: `icon` / `badgeIcon` の型を明示してください

共通化の設計方針は良いと思います。実際の使われ方から型が一意に決まるので、`any` を解消できます。

- `icon`: JSXとしてそのまま描画（`{props.icon}`）→ `React.ReactNode`
- `badgeIcon`: `FontAwesomeIcon` の `icon` propに渡している → `IconDefinition`（L5で既にimport済み）

```suggestion
  icon: React.ReactNode
  badgeIcon?: IconDefinition
```
````

---

## API Reference

All API calls use GraphQL via `gh api graphql`. See `prompt/skills/github-pending-review.md` for detailed examples of:

- Checking for existing pending reviews
- Adding comments with `addPullRequestReviewThread`
- Updating comments with `updatePullRequestReviewComment`
- Deleting comments with `deletePullRequestReviewComment`

---

## CodeRabbit Thread Handling

CodeRabbit is a peer reviewer equal to human reviewers. Apply the following rules:

### 1. Reply to Existing CodeRabbit Threads

When CodeRabbit has posted inline review comments on the PR, do NOT create a duplicate new thread for the same issue. Instead, reply directly to CodeRabbit's existing thread.

- Fetch CodeRabbit comments in Phase 1 (`gh api repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments`)
- Identify comments from `coderabbitai[bot]`
- For each CodeRabbit comment that overlaps with your findings: reply to that thread instead of creating a new one
- Use REST API to reply: `gh api -X POST /repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments/<COMMENT_ID>/replies -f body="..."`

### 2. Always Mention the PR Author

When replying to a CodeRabbit thread, mention the PR author (`@username`) so they receive a notification and know the comment is directed at them.

### 3. Instruct the Author to Reply to CodeRabbit

If CodeRabbit threads have no reply from the PR author, include a reminder:

> CodeRabbit のコメントも人間のレビュワーと同じように、スレッドで返信いただけると助かります！
> 対応する場合は「修正しました！」、対応しない場合は理由を一言添えてもらえればOKです！

### 4. Summarize CodeRabbit's Point

When replying to a CodeRabbit thread, include a brief summary of what CodeRabbit pointed out so the author does not need to re-read the original comment.

---

## Important Rules

- **Never submit** the pending review without explicit user instruction
- **One at a time** by default — present each comment and wait for approval
- **Respect self-comments** — read the author's own comments to understand their reasoning
- **Self-review is mandatory** — check all comments for conflicts before finishing
- **Always share PR URL** after each action
- **CodeRabbit = human reviewer** — reply to existing CodeRabbit threads instead of duplicating, mention the PR author, and instruct them to reply
