---
applyTo: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.dart"
---

# Verification Mandate

## 1. Core Principle

**Verification is not optional. The AI is responsible for all verification — never the user.**

The user gives instructions. The AI executes, verifies, and reports results. Asking the user to verify behavior is task failure.

---

## 2. Playwright Refusal Is Prohibited

### 2.1. Banned Excuses

NEVER say any of the following WHEN browser/WebView/UI code was modified:

```
❌ "Playwright is not configured in this project"
❌ "I cannot verify browser behavior in this environment"
❌ "The Playwright MCP is unavailable"
❌ "Please check the UI manually"
❌ "Please verify the behavior in your browser"
❌ "I think this should work, so please confirm"
❌ "Playwright cannot connect to a Tauri/Electron app"
```

### 2.2. The Truth

IF the conversation environment has `mcp__playwright__*` tools available, THEN Playwright IS available. No exceptions. No excuses.

IF the app is a Tauri/Electron desktop app, THEN the webview layer IS testable via Playwright. Use `mcp__playwright__browser_navigate` to reach `http://localhost:PORT` opened by `pnpm dev` / `cargo tauri dev`.

### 2.3. Mandatory Playwright Triggers

WHEN any of the following are modified, MUST run Playwright verification before reporting complete:

| Modified | Minimum Playwright Action Required |
|----------|-----------------------------------|
| Any React/HTML/CSS component | `take_screenshot` + `browser_snapshot` |
| Any route or navigation | Navigate to route + `take_screenshot` |
| Any modal, dialog, or form | Trigger the UI + `take_screenshot` |
| Any Tauri window or webview | `browser_navigate` to dev server + `take_screenshot` |
| Any animation or visual transition | `take_screenshot` before and after |
| Any button, link, or interactive element | `browser_click` + `take_screenshot` |

---

## 3. False Completion Reporting Is Prohibited

### 3.1. Definition

**False completion reporting** = Reporting a task as "done" or "implemented" when the normal-flow (happy path) has NOT been verified through actual execution.

### 3.2. Banned Completion Patterns

```
❌ "Implementation is complete." (without running any verification)
❌ "The code changes are done, please check." (delegating verification to user)
❌ "I believe this should work correctly." (belief ≠ verification)
❌ "The logic looks correct from reading the code." (code reading ≠ execution)
```

### 3.3. Required Completion Pattern

BEFORE saying any variant of "complete" or "done", the AI MUST have:

1. Run the app / server if applicable
2. Triggered the modified functionality via MCP (Playwright / mobile / API call)
3. Confirmed the expected output is present (screenshot, response, log)
4. Confirmed no console errors or unexpected behavior

Only after all 4 steps pass is the task complete.

### 3.4. If Verification Fails

IF the verification reveals a bug THEN fix it and re-verify. Do NOT report partial completion and ask the user to handle the rest. Repeat fix → verify until fully passing.

---

## 4. Desktop App Verification (Tauri / Electron)

Desktop apps with webview (Tauri v2, Electron) ARE verifiable via Playwright. The correct procedure is:

```
Step 1: Start dev server
  → Run `pnpm dev` / `cargo tauri dev` in background (isBackground=true)

Step 2: Wait for server ready
  → Poll port until responding (mcp__playwright__browser_wait_for or curl)

Step 3: Navigate and verify
  → mcp__playwright__browser_navigate to http://localhost:[PORT]
  → mcp__playwright__browser_take_screenshot
  → mcp__playwright__browser_snapshot (accessibility tree)

Step 4: Interact and confirm
  → mcp__playwright__browser_click / browser_type as needed
  → mcp__playwright__browser_take_screenshot after each action
```

The claim "Tauri apps cannot be tested with Playwright" is FALSE and is prohibited.

---

## 5. Minimum Verification Standards by Task Type

| Task Type | Minimum Verification |
|-----------|---------------------|
| Backend API change | `curl` or `mcp__postgres__query` to confirm data |
| Frontend component change | Playwright screenshot of the component |
| Full page/screen change | Playwright screenshot of full page |
| Form submission | Playwright fill + submit + confirm success state screenshot |
| CSS/styling change | Playwright screenshot before + after |
| Auth / login flow | Playwright navigate → fill credentials → confirm redirect |
| Navigation/routing change | Playwright navigate to each affected route |

---

## 6. Confidence Rating

| Rule | Confidence |
|------|-----------|
| Playwright MCP is always available when tools exist | High |
| Tauri webview is testable via Playwright on dev server | High |
| False completion without execution is prohibited | High |
| Desktop apps require `pnpm dev` before Playwright | High |
