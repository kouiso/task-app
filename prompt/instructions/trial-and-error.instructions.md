---
applyTo: "**"
---

# Trial & Error — Convergence Loop Control

## 1. Zero User Burden Protocol

**Proactively execute what the user would otherwise run manually, without being asked. Make the user's life easier.**

### Core Philosophy

- **An error surfacing only after the user runs something is AI's defeat.**
- **"It should work" is prohibited. Only "It worked" is acceptable.**
- **Apply perfectionism through thorough trial and error.**

### Action Guidelines

1. **Proactive Verification**: Execute and verify proactively before the user asks. Pre-emptively run commands the user would execute and confirm success.
2. **No Error Suppression**: Error suppression (e.g., `|| true`) is completely prohibited. Fix at the root cause. Band-aid fixes are forbidden. Guarantee idempotency.
3. **Complete Re-verification**: After fixing an error, restart from the beginning — not from the failure point. Only a clean-state re-execution proves the error is truly resolved.
4. **Eliminate Debugging Burden**: AI must complete all steps: error log analysis → root cause identification → fix → verification. Never burden the user.

---

## 2. Convergence Loop (Mandatory for All Verification)

### DS/AI Engineering Frame

| ML Concept | Protocol Equivalent |
|------------|-------------------|
| **Loss function** | Gap between current state and postcondition (verified state) |
| **Convergence criterion** | Postcondition satisfied with evidence from the SPECIFIED tool |
| **Training loop** | `while not converged: attempt → diagnose → fix → retry` |
| **Early stopping** | PROHIBITED until MAX_ATTEMPTS reached with full diagnostic |
| **Reward hacking** | Using a different tool than specified = gaming the metric |

### The Loop

```
POSTCONDITION = [what must be true for the task to be "done"]
SPECIFIED_TOOL = [tool the user requested or the task requires]
MAX_ATTEMPTS = 5
attempt = 0

while attempt < MAX_ATTEMPTS:
    attempt += 1
    result = execute_verification(SPECIFIED_TOOL)
    
    if result == PASS:
        record_evidence(result)
        report_completion()
        EXIT LOOP  # ← ONLY valid exit with "done"
    
    if result == FAIL:
        error = get_full_error()          # Read FULL log, not skim
        hypotheses = generate_hypotheses(error, count=3)
        scored = score(hypotheses, key=probability * ease_of_test)
        best = scored[0]
        fix = apply_fix(best)
        # DO NOT exit. Loop back to execute_verification.

# Only reached after MAX_ATTEMPTS failures
report_BLOCKED(all_attempts, all_hypotheses, all_fixes)
# NEVER report "done" from here. Status = BLOCKED.
```

### Hard Constraints

| Constraint | Meaning | Violation = |
|-----------|---------|------------|
| `attempt < MAX_ATTEMPTS` | Cannot exit until 5 DISTINCT attempts | Surrendering before MAX_ATTEMPTS |
| `SPECIFIED_TOOL` | Must use the tool the user specified | Tool substitution (reward hacking) |
| `PASS` from specified tool | Only valid exit condition | False completion |
| Each attempt uses a DIFFERENT fix | Repeating the same fix does not count | Wasting attempts without learning |

### What Counts as "DISTINCT" Attempt

Each attempt MUST have a different hypothesis and fix from all previous attempts. Repeating the same action is NOT a new attempt.

```
✅ Attempt 1: Fixed port conflict (lsof → kill → retry)
✅ Attempt 2: Rebuilt the server (clean install → restart → retry)  
✅ Attempt 3: Fixed config path (env var wrong → corrected → retry)

❌ Attempt 1: Ran the command again
❌ Attempt 2: Ran the command again  
❌ Attempt 3: Ran the command again (3 attempts but 0 distinct fixes)
```

---

## 3. Tool-Fidelity Constraint

### The Rule

IF the user specifies a verification tool (Appium, Playwright, curl, etc.)
OR the task type has a mandated tool (see verification-mandate.md)
THEN that tool MUST be used for verification.
Substituting a different tool is **reward hacking** and is prohibited.

### Banned Substitution Patterns

```
NEVER: User says "Playwright" → AI uses code review instead
NEVER: User says "Appium" → AI reports "Appium unavailable" and skips
NEVER: User says "visual verification" → AI reads code and says "looks correct"
NEVER: Task requires screenshot → AI describes what the UI "should look like"
NEVER: Tool fails once → AI switches to a "simpler" verification method
```

### When the Specified Tool Fails

The answer is NEVER "use a different tool." The answer is ALWAYS "fix the specified tool."

```
Tool fails → Decompose the failure (§4) → Fix → Retry with SAME tool
```

### Exception

IF and ONLY IF the specified tool is genuinely impossible in the current environment (e.g., no iOS device physically connected for Appium, no browser available for Playwright) AND this has been proven through diagnostic evidence (not assumption), THEN:
1. Report BLOCKED with evidence
2. Suggest what the user needs to provide
3. Do NOT substitute a different tool
4. Do NOT report the task as complete

---

## 4. Problem Decomposition Protocol

### The Core Problem: AI Treats Failures as Atomic

When a verification tool fails, the AI sees ONE failure: "Appium doesn't work." But every tool failure is actually composed of 3-7 sub-problems, each independently diagnosable and fixable.

### Mandatory Decomposition

IF a verification tool fails THEN BEFORE the next attempt, decompose the failure into sub-problems:

```
FAILURE: "[tool] [action] failed with [error]"

Sub-problem 1: Is the tool installed and on PATH?
  → [diagnostic command] → [result]
Sub-problem 2: Is the tool's server/daemon running?
  → [diagnostic command] → [result]
Sub-problem 3: Is the connection to the target working?
  → [diagnostic command] → [result]
Sub-problem 4: Is the session/context valid?
  → [diagnostic command] → [result]
Sub-problem 5: Is the specific command/action correct?
  → [diagnostic command] → [result]

Root cause: Sub-problem [N] ([explanation])
Fix: [specific action]
Confidence: [0.0-1.0]
```

### Why This Matters

Without decomposition, the AI applies shotgun fixes:
- "Let me restart everything" (fixes nothing, wastes attempt)
- "Let me try a different approach" (without understanding what failed)
- "It doesn't work" (without identifying which specific sub-component failed)

With decomposition, each retry targets a SPECIFIC sub-problem with a SPECIFIC fix. This is the difference between 5 wasted attempts and 5 productive attempts.

---

## 5. Forbidden Exits

| Exit Pattern | Why Forbidden | Required Instead |
|-------------|---------------|-----------------|
| "Tool X doesn't work" (attempt 1) | 0% retry | Decompose → fix → retry |
| "I used Tool Y instead" | Reward hacking | Fix Tool X |
| "The code looks correct" | Code review ≠ postcondition | Run the specified tool |
| "Please check manually" | User delegation | Exhaust MAX_ATTEMPTS first |
| "Done! ✅" without evidence | False completion | Evidence from specified tool required |
| "I'll try a different approach" | Vague escape | Decompose FIRST, then fix |
| "The environment isn't set up" | Setup IS your job | Fix the environment |
| "I tried 3 times" (same fix) | 3 identical ≠ 3 distinct | Each attempt needs different fix |

---

## 6. BLOCKED Report Format (After MAX_ATTEMPTS)

IF all attempts exhausted THEN report:

```markdown
## Verification BLOCKED

**Task**: [what]
**Specified Tool**: [tool]
**Status**: BLOCKED (NOT complete)

### Convergence Log
| # | Error | Hypothesis (confidence) | Fix Applied | Result |
|---|-------|------------------------|-------------|--------|
| 1 | [error] | [hypothesis] (0.X) | [fix] | FAIL |
| ... | ... | ... | ... | ... |

### Root Cause Analysis
[What the underlying issue is based on all attempts]

### What's Needed From User
[ONE specific action, not a list of maybes]
```

---

## 7. Handling Files Outside Workspace

**Using VS Code limitations as an excuse to burden the user with environment setup is prohibited.**

- If VS Code API is unavailable, use terminal commands (`cat`, `ls`, `echo`, `sed`, etc.).
- Explore alternative approaches before saying "I can't."

**Confidence**: High

