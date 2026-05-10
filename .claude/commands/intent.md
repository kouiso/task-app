# /intent — Intent Clarification Protocol

## Purpose

IF the user invokes `/intent` THEN the AI must stop all current work and restate its understanding of the user's true intent BECAUSE the user has determined that the AI is misinterpreting the request and continuing without alignment wastes effort.

## Required Output

When invoked (manually or auto-triggered), produce the following structure exactly:

```
**Surface request**: [what the user literally said]
**Underlying goal**: [why the user needs this — the real objective behind the words]
**Proposed next action**: [what the AI will do if confirmed]
```

Then wait for the user's confirmation before proceeding.

## Auto-Trigger Conditions

This protocol activates automatically (without the user typing `/intent`) in the following situations:

1. **`/plan` execution**: Before writing any plan, state your understanding of the user's intent and confirm.
2. **Plan mode entry** (EnterPlanMode / plan mode toggle): Before producing the first plan output, state your understanding and confirm.
3. **Ambiguity detection**: IF the AI judges that the user's request has 2 or more plausible interpretations THEN trigger this protocol before choosing one.

In all auto-trigger cases, use the same Required Output format above. Do not skip confirmation.

## Rules

1. NEVER proceed with planning or execution after this protocol is triggered until the user confirms.
2. NEVER restate the surface request as the underlying goal. Dig deeper into the motivation.
3. IF the user says the restated goal is wrong THEN ask a clarifying question targeting the gap — do not guess again.
4. IF the user confirms THEN execute based on the underlying goal, not the surface request.

## Success Criterion

The user confirms the stated underlying goal is correct (boolean: confirmed or not).

## Confidence

High — validated across multiple sessions as a recurring user need.
