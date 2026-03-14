# /prompt - Persist User Instructions (Prompt + Hook)

**Persist user instructions from the conversation into prompt files and/or hooks.**

## Purpose

Ensure user instructions ("do this", "follow this rule") persist across sessions without repeating.

## Triage: `/bad` vs `/good` vs `/prompt`

| Command | Trigger | Action |
|---------|---------|--------|
| `/bad` | AI did something wrong | Add prohibition + consider hook |
| `/good` | AI did something right | Add rule + consider hook |
| `/prompt` | User states a preference/instruction | Persist as rule and/or hook |

## Execution Steps

1. Analyze the conversation and identify **the user's instruction/rule/preference**
2. Articulate it as a clear, enforceable rule
3. **Apply DS/AI Engineering Quality Gate** (Step 2.5 — before choosing enforcement):

   | Check | Question | If NO → Fix |
   |-------|----------|-------------|
   | Reproducibility | Would a different AI follow this instruction identically? | Remove ambiguous words ("appropriate", "properly"). Add concrete conditions/thresholds. |
   | Quantifiability | Can compliance be measured with a score or boolean? | Define a measurable criterion (e.g., "always include URL" not "share relevant links"). |
   | Semantic Structure | Is the rule in "IF condition THEN action" form? | Rewrite as: `IF [trigger] THEN [action] BECAUSE [reason]`. |
   | Confidence | How certain is this instruction's long-term value? | Assign High/Medium/Low. If Low, mark as experimental and revisit after 3 sessions. |

4. **Evaluate enforcement method** (CRITICAL):

   | Question | If YES |
   |----------|--------|
   | Can a shell script detect violations? | Create/extend a hook in `.claude/hooks/` |
   | Does it require AI judgment? | Add to prompt instructions |
   | Both pattern-matchable AND contextual? | Hook + prompt (belt and suspenders) |

5. Present the proposed solution to the user for approval
6. After approval, implement

## Destination Guide

| Instruction Type | Prompt File | Hook Script |
|-----------------|-------------|-------------|
| Prohibited commands/patterns | `prompt/instructions/prohibitions.md` | `git-safety.sh` or `file-safety.sh` |
| Code quality rules | `prompt/instructions/quality-implementation.md` | `post-edit-check.sh` |
| Git/GitHub rules | `prompt/instructions/git.md` | `git-safety.sh` or `validate-pr-body.sh` |
| Autonomous execution/MCP | `prompt/instructions/autonomous-execution.md` | - |
| Persona/communication | `prompt/instructions/persona.md` | - |
| Other | Appropriate file under `prompt/instructions/` | Consider new hook if pattern-matchable |

## Hook-First Thinking

**Before writing a prompt rule, always ask: "Can a hook enforce this mechanically?"**

Hooks are superior to prompt rules because:
- **100% enforcement**: Hooks never forget or misinterpret
- **Immediate feedback**: AI gets instant correction
- **Token-efficient**: One hook replaces paragraphs of prompt text
- **Composable**: Hooks can be shared across projects

## Existing Hooks Reference

| Hook | Trigger | Enforces |
|------|---------|----------|
| `git-safety.sh` | PreToolUse Bash | --no-verify, git reset, --force, --legacy-peer-deps |
| `file-safety.sh` | PreToolUse Write\|Edit | Backup files, ESLint config protection |
| `post-edit-check.sh` | PostToolUse Edit\|Write | console.log, debugger, any type, @ts-ignore, eslint-disable |
| `validate-pr-body.sh` | PostToolUse Bash | PR template compliance |
