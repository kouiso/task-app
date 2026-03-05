---
applyTo: "**"
---

# Absolute Prohibitions

**Any rule violation is an immediate task failure. No exceptions.**

## 1. Git Operation Prohibitions

### 1.1. `--no-verify` Flag
Fix all hook errors instead of bypassing them. Even suggesting `--no-verify` as an option is a serious violation.

### 1.2. `git reset` Command
Use `git revert` to undo commits, `git commit --amend` for the latest commit message, or `git rebase -i` for local branch history cleanup.

### 1.3. `--force` Push
Use `--force-with-lease` only.

### 1.4. `npm install --legacy-peer-deps`
Resolve peer dependency mismatches at root cause (adjust package versions, review dependency tree).

## 2. Code Quality Prohibitions

### 2.1. TypeScript Type Safety
Full rules in `typescript.instructions.md`. Summary: `any` type, type assertions (`as` except `as const`), and `as` in exports are banned.

### 2.2. Error Suppression

- **Banned patterns**: `// @ts-ignore`, `as any`, `try { ... } catch {}` (swallowing), `|| true`
- Fix: Correct the type definitions, implement proper error handling, and resolve the root cause.

### 2.3. Linter Configuration

- **Changing config files** is banned unless explicitly permitted per case.
- **Disable comments** are banned unless the user explicitly approves each case.
- Fix the root cause of warnings.

## 3. Implementation Prohibitions

### 3.1. Unnecessary Dependencies
Installing unnecessary packages is banned. Before adding: verify it's actually needed, check no built-in alternative exists, verify active maintenance.

### 3.2. Environment Variables
- Never commit `.env` files or secrets to git.
- Use proper `.env.example` files.

### 3.3. Console.log
- Use `console.info`, `console.warn`, `console.error` only.
- Remove all `console.log` before committing.

## 4. Communication Prohibitions

### 4.1. Excuses Based on Workload
"It takes too long", "It's too much work", "Can we reduce scope?" are all prohibited.

### 4.2. Premature Questions
Asking a question before self-research is prohibited.

### 4.3. Asking User to Run Commands
The AI runs all commands. Never ask the user to execute anything.

## 5. Review Feedback Loop Prevention

### 5.1. Ban on Repeating Previously Flagged Patterns

**Once a coding pattern has been flagged in a review, the AI must NEVER reproduce that pattern again in any subsequent code generation, even in different files or contexts.**

- ❌ Writing `as SomeType` after being told `as` is prohibited
- ❌ Using `any` after being told to use proper types
- ❌ Using `setTimeout` for timing hacks after being told it's an anti-pattern
- ❌ Swallowing errors with empty `catch` after being told to handle errors properly

### 5.2. Self-Check Before Code Generation

**Before generating ANY TypeScript code, the AI MUST internally verify:**

1. Does this code contain `as` (except `as const`)? → **REWRITE**
2. Does this code contain `any`? → **REWRITE**
3. Does this code use `setTimeout` / `setInterval` as a workaround? → **REDESIGN**
4. Does this code swallow errors? → **ADD PROPER HANDLING**
5. Does this code use magic numbers / hardcoded values? → **EXTRACT CONSTANTS**

### 5.3. Correct Priority Order

1. Type-safe (no `as`, no `any`)
2. Architecturally sound (no timing hacks, no error swallowing)
3. Readable
4. Working

Code that works but uses `as` is **worse** than code that doesn't compile but has correct types.
