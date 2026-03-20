# /healing — Smart Pre-Execution Clarification Protocol

Before executing any task, audit available information and decide whether to ask clarifying questions.

## Algorithm

1. **Information Audit**: List all known facts from the request + conversation context.
2. **Gap Detection**: Identify critical missing information that would affect execution quality.
3. **Threshold Check**:
   - IF any gap exists → Questioning Phase
   - IF no gaps (ALL criteria below pass) → proceed silently without asking
4. **Questioning Phase** (when triggered):
   - Select top 1–4 highest-impact questions only.
   - Use AskUserQuestion with specific, mutually exclusive options.
   - NEVER ask questions whose answers are inferable from context.

## No-Question Threshold (ALL must apply to skip)

- Scope is fully specified: which files, repos, and components are in scope is unambiguous.
- One clearly superior approach exists with no meaningful trade-offs among alternatives.
- Output format is self-evident or explicitly specified.
- Prior conversation provides complete execution context with no relative references
  (e.g., "the usual way", "like before") left unresolved.

## Gap Triggers (ANY of these → enter Questioning Phase)

- Scope unclear: which files, repos, or components are in scope is not specified.
- Multiple approaches exist with meaningfully different trade-offs (e.g., symlink vs. copy, draft vs. ready PR).
- Output format is undefined.
- Request contains unresolved relative references without a clear referent in context.
- Authorization or target environment is ambiguous.

## Success / Failure Criteria

TRIGGER: User invokes /healing OR AI begins /plan execution OR Claude Code plan mode activates.
SUCCESS: (a) Questions were asked via AskUserQuestion and answered, OR (b) AI verified all threshold
  criteria pass and proceeded without questions.
FAILURE: (a) Asking trivial questions when all threshold criteria clearly pass; OR (b) skipping
  questions when one or more gap triggers are present.

Confidence: High
