---
name: task-app-verification-mandate
description: Use when verifying UI or API work in task-app, especially for Playwright checks against the Next.js dev server on port 3000
---

---
applyTo: "**"
---

# Verification Mandate

## 0. Project Verification Configuration

| Property | Value |
|---|---|
| Stack | Next.js (React/TS) |
| Dev command | `npm run dev` (from repo root) |
| Dev URL | `http://localhost:3000` |
| Verification tool | `mcp__playwright__*` |

WHEN UI or API changes are made in this project AND verification is needed:
1. Run `npm run dev` in background (Bash `run_in_background: true`)
2. Poll `curl -s http://localhost:3000` until HTTP 200
3. `mcp__playwright__browser_navigate` to `http://localhost:3000`
4. `mcp__playwright__browser_take_screenshot` + `browser_snapshot`

---

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

Same prohibition applies in Japanese/Kansai dialect — language does not change the rule:

```
❌ "Can you check from your browser?" (any dialect or phrasing)
❌ "The server is running at [URL], so please check from there"
❌ "Please verify the behavior from your browser"
❌ "Open [URL] and check it yourself"
❌ "The server is up, so please confirm at [URL]"
❌ "Take a look from your browser at [URL]"
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

## 2.4. Running Server → User Browser Check: Prohibited

NEVER say "the server is running at [URL], please check from your browser"
WHEN any of `mcp__playwright__*`, `mcp__chrome-devtools__*`, or `mcp__appium__*` tools are in the active tool list
BECAUSE announcing a running server and asking the user to open the URL is browser verification delegation — functionally identical to "please verify the behavior in your browser."

**Tool Selection Decision Tree (non-negotiable)**:

IF dev server is running at localhost:PORT THEN select and USE the first available tool:

| Tool Available | Required Action |
|---|---|
| `mcp__playwright__*` | `browser_navigate` to URL → `browser_take_screenshot` → `browser_snapshot` |
| `mcp__chrome-devtools__*` | `navigate_page` to URL → `take_screenshot` |
| `mcp__appium__*` | `launch_app` → `take_screenshot` |
| None of the above AND curl available | `curl -s URL` to confirm server response |

Only if ALL tools are genuinely unavailable: state "No browser automation tool is active. Cannot verify visually." — then and only then ask the user.

NEVER skip this decision tree and jump to user delegation.

**Confidence**: High (violation observed 2026-04-01: "The server is running at http://localhost:3002/dashboard — can you check from your browser?" (Kansai dialect phrasing) — Playwright was available but unused)

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
