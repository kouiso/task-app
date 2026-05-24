# Support Policy

This policy is for purchasers and learners using task-app educational material.

## Scope

Support covers:

- Setup blockers caused by documented environment drift.
- Curriculum errata.
- Reproducible bugs in the provided sample application.
- Clarification for documented commands and expected outputs.

Support does not cover:

- Custom feature development.
- Private production operations outside the course material.
- Third-party account billing issues.
- Unsupported OS, Node.js, npm, Docker, or database versions.

## Errata Format

Publish errata with this structure:

```text
Errata ID:
Published:
Affected material:
Severity: low | medium | high
Problem:
Corrected text or command:
Workaround:
Verification:
Related issue/PR:
```

Severity guidance:

- Low: typo or wording issue that does not block progress.
- Medium: confusing instruction with a clear workaround.
- High: command, code, or screenshot mismatch that blocks a lesson.

## Q&A SLA

| Channel | Initial response target | Resolution target |
| --- | --- | --- |
| Purchase/support email | 2 business days | 5 business days when reproducible |
| GitHub issue for course bugs | 3 business days | Best effort, prioritized by severity |
| Security or data-loss report | 1 business day | Immediate triage, fix/mitigation priority |

Business days exclude weekends and Japanese national holidays unless a separate paid support agreement says otherwise.

## Refund Conditions

Refunds may be approved when:

- The purchaser cannot access the material because of a seller-side delivery issue.
- A high-severity setup blocker is reproducible on a supported environment and no workaround is provided within the stated SLA.
- Material was purchased twice by mistake.
- Legal or licensing review requires withdrawal of the affected material and no equivalent replacement is provided.

Refunds may be declined when:

- The request is for an unsupported environment.
- The purchaser asks for custom implementation work beyond the course.
- The material has already been substantially consumed and the reported issue has a documented workaround.
- The request violates the product terms or redistribution policy.

## Support Request Template

```text
Name:
Purchase date/order ID:
Environment:
- OS:
- Node:
- npm:
- Docker/PostgreSQL:
Lesson or page:
Command run:
Expected result:
Actual result:
Screenshot/log:
```

Do not include production secrets, database passwords, JWT secrets, or private user data in support requests.
