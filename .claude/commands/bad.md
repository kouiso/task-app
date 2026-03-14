# /bad - Bad Behavior to Prohibition + Hook Enforcement

**Identify the bad behavior and determine the best enforcement method: hook (mechanism) or prompt (instruction).**

## Execution Steps

1. Analyze the preceding conversation and identify **what went wrong**
2. Determine the root cause and articulate **why it is bad**
3. **Apply DS/AI Engineering Quality Gate** (Step 2.5 — before choosing enforcement):

   | Check | Question | If NO → Fix |
   |-------|----------|-------------|
   | Reproducibility | Would a different AI reliably avoid this with the proposed rule? | Remove vague prohibitions ("don't do bad things"). Add concrete patterns/examples. |
   | Quantifiability | Can violation be detected with a boolean or threshold? | Define a measurable detection criterion (e.g., "contains `--no-verify`" not "bypasses checks"). |
   | Semantic Structure | Is the prohibition in "NEVER [action] WHEN [condition] BECAUSE [reason]" form? | Rewrite to match this structure. |
   | Confidence | How certain is it that this behavior is always wrong? | Assign High/Medium/Low. If Low, add exception conditions rather than a blanket ban. |
   | False Positive Risk | Could this rule block legitimate use cases? | Define explicit exceptions. A rule that blocks valid work is worse than no rule. |

4. **Evaluate enforcement method** (CRITICAL — this is the core of AI engineering):

   | Criteria | Hook (Mechanism) | Prompt (Instruction) |
   |----------|-----------------|---------------------|
   | Detectable by pattern matching | **Use hook** | - |
   | Requires judgment/context | - | **Use prompt** |
   | Already has similar hook | **Extend existing hook** | - |
   | Behavioral/attitude issue | - | **Use prompt** |

5. Present the proposed solution (hook script + prompt rule, or prompt rule only) to the user for approval
6. After approval, implement:
   - **Hook**: Create/update script in `.claude/hooks/`, register in `.claude/settings.json`
   - **Prompt**: Add to `prompt/instructions/prohibitions.md` (Absolute Prohibitions section)
   - **Both**: When the rule benefits from both mechanical enforcement AND contextual understanding

## Hook-First Thinking

**Always ask: "Can a hook detect and prevent this automatically?"**

- File pattern violations → `file-safety.sh` (PreToolUse Write|Edit)
- Dangerous CLI commands → `git-safety.sh` (PreToolUse Bash)
- Code quality violations → `post-edit-check.sh` (PostToolUse Edit|Write)
- PR/commit format violations → `validate-pr-body.sh` (PostToolUse Bash)
- New category → Create a new hook script

## Existing Hooks Reference

| Hook | Trigger | Enforces |
|------|---------|----------|
| `git-safety.sh` | PreToolUse Bash | --no-verify, git reset, --force, --legacy-peer-deps |
| `file-safety.sh` | PreToolUse Write\|Edit | Backup files, ESLint config protection |
| `post-edit-check.sh` | PostToolUse Edit\|Write | console.log, debugger, any type, @ts-ignore, eslint-disable |
| `validate-pr-body.sh` | PostToolUse Bash | PR template compliance |

## Output Format

```markdown
### Bad Behavior Identified
[Description of what went wrong]

### Root Cause
[Why this happened]

### DS/AI Engineering Quality Gate
- **Reproducibility**: [Pass/Fail — explanation]
- **Quantifiability**: [Pass/Fail — measurable detection criterion]
- **Semantic Structure**: NEVER [action] WHEN [condition] BECAUSE [reason]
- **Confidence**: High / Medium / Low
- **False Positive Risk**: [Low/Medium/High — exceptions if any]

### Enforcement Plan
- **Hook**: [Hook script name + what it detects] (or "N/A — requires contextual judgment")
- **Prompt rule**: [Rule text to add to prohibitions.md] (or "N/A — fully enforced by hook")

### Reason
[Why this is prohibited]
```
