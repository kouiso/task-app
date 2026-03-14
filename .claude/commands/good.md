# /good - Good Behavior to Rule + Hook Reinforcement

**Identify the good behavior and determine the best reinforcement method: hook (mechanism) or prompt (instruction).**

## Execution Steps

1. Analyze the preceding conversation and identify **what was good**
2. Articulate the behavior as a clear, reproducible rule
3. **Apply DS/AI Engineering Quality Gate** (Step 2.5 — before choosing enforcement):

   | Check | Question | If NO → Fix |
   |-------|----------|-------------|
   | Reproducibility | Would a different AI produce the same behavior from this rule? | Remove ambiguous words ("appropriate", "as needed"). Add concrete conditions/thresholds. |
   | Quantifiability | Can compliance be measured with a score or boolean? | Define a measurable criterion (e.g., "coverage ≥ 80%" not "sufficient coverage"). |
   | Semantic Structure | Is the rule in "IF condition THEN action" form? | Rewrite as: `IF [trigger] THEN [action] BECAUSE [reason]`. |
   | Confidence | How certain is this rule's value? | Assign High/Medium/Low. If Low, mark as experimental and revisit after 3 sessions. |

4. **Evaluate reinforcement method**:

   | Criteria | Hook (Mechanism) | Prompt (Instruction) |
   |----------|-----------------|---------------------|
   | Can be automatically validated | **Use hook** | - |
   | Requires judgment/context | - | **Use prompt** |
   | Workflow/process improvement | **Consider hook** | **Use prompt** |
   | Behavioral/attitude pattern | - | **Use prompt** |

5. Present the proposed solution to the user for approval
6. After approval, implement:
   - **Hook**: Create/update script in `.claude/hooks/`, register in `.claude/settings.json`
   - **Prompt**: Add to the appropriate `prompt/instructions/` file
   - **Both**: When the rule benefits from both

## Hook-First Thinking

**Always ask: "Can a hook automatically validate or encourage this behavior?"**

Examples:
- "Always run lint after editing" → PostToolUse hook that auto-runs lint
- "Always check PR template" → Already enforced by `validate-pr-body.sh`
- "Good error messages" → Prompt rule (requires judgment)

## Existing Hooks Reference

| Hook | Trigger | Enforces |
|------|---------|----------|
| `git-safety.sh` | PreToolUse Bash | --no-verify, git reset, --force, --legacy-peer-deps |
| `file-safety.sh` | PreToolUse Write\|Edit | Backup files, ESLint config protection |
| `post-edit-check.sh` | PostToolUse Edit\|Write | console.log, debugger, any type, @ts-ignore, eslint-disable |
| `validate-pr-body.sh` | PostToolUse Bash | PR template compliance |

## Output Format

```markdown
### Good Behavior Identified
[Description of what was done well]

### DS/AI Engineering Quality Gate
- **Reproducibility**: [Pass/Fail — explanation]
- **Quantifiability**: [Pass/Fail — measurable criterion defined]
- **Semantic Structure**: IF [condition] THEN [action] BECAUSE [reason]
- **Confidence**: High / Medium / Low

### Reinforcement Plan
- **Hook**: [Hook script + what it validates] (or "N/A — requires contextual judgment")
- **Prompt rule**: [Rule text] (or "N/A — fully enforced by hook")

### Rationale
[Why this behavior should be standard]
```
