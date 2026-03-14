# /craft-prompt - Craft Prompts for Other AIs

**Generate well-structured prompts to hand off to other AI systems (Devin, ChatGPT, Cursor, etc.).**

This command is separate from `/prompt` (which persists rules for Claude Code itself). `/craft-prompt` creates **outbound prompts** optimized for other AIs.

## Execution Steps

### Step 1: Gather Intent

Identify from the conversation:
- **What the user wants the other AI to do**
- **Target AI** (Devin / ChatGPT / Cursor / generic — if unspecified, ask)
- **Context**: repo, codebase, constraints the other AI needs to know

### Step 2: Apply DS/AI Engineering Structuring

Transform the user's intent into a structured prompt using these principles:

| Principle | Check | Action |
|-----------|-------|--------|
| **Quantifiable Criteria** | Are success/failure conditions measurable? | Replace "good", "appropriate", "meaningful" with scores, thresholds, or booleans. |
| **Semantic Grouping** | Is the task broken into logical phases? | Structure as: Context → Process Steps → Output Requirements. |
| **Scoring Rubrics** | Does evaluation rely on subjective judgment? | Add a scoring rubric with dimensions and scales (1-5 or High/Medium/Low). |
| **Confidence Levels** | Are outputs binary when they should be graduated? | Add confidence tagging (High/Medium/Low) to outputs. |
| **Chunking Strategy** | Could large inputs overwhelm the AI? | Add semantic chunking instructions (by section, not by character count). |
| **Output Schema** | Is the expected output format clearly defined? | Define exact fields, max lengths, and required/optional markers. |

### Step 3: Target AI Optimization

| Target AI | Optimization |
|-----------|-------------|
| **Devin** | Emphasize step-by-step execution plan. Include file paths, CLI commands, and verification steps. Devin works best with explicit, sequential instructions. |
| **ChatGPT** | Use system/user message separation. Add "Think step by step" for complex reasoning. Include examples for few-shot learning. |
| **Cursor** | Reference file paths relative to workspace root. Use @-mentions for file context. Keep instructions concise and action-oriented. |
| **Generic** | Use the full structured format. No platform-specific optimizations. |

### Step 4: Output

Produce **both English and Japanese versions** of the prompt. Format:

```
## Crafted Prompt (English)

\`\`\`prompt
[English prompt here]
\`\`\`

## Crafted Prompt (Japanese)

\`\`\`prompt
[Japanese prompt here]
\`\`\`

## Structural Decisions

| Decision | Rationale |
|----------|-----------|
| [What was structured and why] | [DS/AI engineering reason] |
```

## Quality Checklist (Self-Verify Before Output)

- [ ] No subjective/ambiguous words without defined criteria
- [ ] All evaluation dimensions have scales or thresholds
- [ ] Output format is explicitly defined with field names and constraints
- [ ] Chunking strategy is semantic (by section), not arbitrary (by character count)
- [ ] Confidence levels are included where judgment is required
- [ ] Both English and Japanese versions are provided
- [ ] Target AI optimizations are applied

## Anti-Patterns (Never Do)

| Anti-Pattern | Fix |
|-------------|-----|
| "Find issues that are unnecessary" (undefined "unnecessary") | Define scoring rubric with dimensions and cutoff |
| "Group into 3 groups" (arbitrary count, no axis) | Specify grouping axis (category, severity, domain) |
| "If body > 500 chars, split into 3" (magic numbers) | "Split by semantic sections (Background / Problem / Proposal)" |
| "Report what's wrong" (unbounded output) | Define output schema: URL, summary (≤ N chars), reason, confidence |
