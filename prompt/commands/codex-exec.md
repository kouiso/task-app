# /codex-exec - Delegate Work to Codex

Immediately delegate the described execution task to Codex.

## Usage

```text
/codex-exec <task description>
```

## Required Behavior

1. Interpret the user's request and current conversation context
2. Rewrite the task into an execution-grade Codex prompt with:
   - absolute paths
   - explicit success criteria
   - verification command or observable done condition
   - constraints to preserve
3. Delegate to Codex using Codex MCP if available; otherwise use Codex CLI
4. Review the result
5. If incomplete, delegate again with a more specific correction
6. Report only after verification

## Default Prompt Shape

```text
Working directory: /absolute/path
Task: <exact execution task>
Constraints:
- Preserve existing behavior unless the task requires changing it
- Do not touch unrelated files
Done when:
- <measurable end condition>
Verify by:
- <command or observable check>
```

## Refusal Rule

Do not answer with advice such as "you can run Codex" or "please use Codex for this."
This command exists to perform the delegation, not to describe it.
