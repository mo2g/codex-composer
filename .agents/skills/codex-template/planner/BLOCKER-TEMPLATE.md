# Blocker Template

Use this template to record blockers when a task cannot proceed due to missing information, unclear requirements, or external dependencies.

## Rules

- Create a blocker record when a task exceeds its failure budget or cannot proceed without user input.
- Be specific about what is missing and why it blocks progress.
- Include the risk of ignoring the blocker to help prioritize resolution.
- Use blocker types consistently for tracking and escalation.

## Blocker Types

- `missing-spec`: Specification incomplete or ambiguous
- `missing-repro`: No reproduction case or test fixture available
- `missing-fixture`: Missing test data or environment setup
- `missing-permission`: Need access credentials or system permissions
- `ambiguous-intent`: Multiple valid interpretations, user choice needed
- `cross-module-risk`: Change would affect multiple modules, needs authorization
- `test-infra-broken`: Testing infrastructure prevents verification
- `root-cause-unconfirmed`: Root cause not identified, speculative fix would expand diff

## Template

```md
# Blocker: <blocker-id>

- Created: <YYYY-MM-DD HH:MM TZ>
- Related Task: <task-id>
- Type: missing-spec | missing-repro | missing-fixture | missing-permission | ambiguous-intent | cross-module-risk | test-infra-broken | root-cause-unconfirmed
- Severity: blocking | warning

## Summary

<one-sentence description of what is blocked and why>

## Observed Symptoms

- <what we know about the problem>
- <what we've tried>

## Attempts Made

| Attempt | Approach | Result | Evidence |
|---------|----------|--------|----------|
| 1 | <what was tried> | <outcome> | <link or note> |
| 2 | <what was tried> | <outcome> | <link or note> |
| 3 | <what was tried> | <outcome> | <link or note> |

## Evidence Gained

- <confirmed facts>
- <ruled out hypotheses>
- <new discoveries>

## Missing Information

- <specific data or context needed>
- <questions that need answers>

## Required User Input

<what the user needs to provide to unblock this task>

## Risk If Ignored

<what could go wrong if we proceed without resolving this blocker>

## Next Action After Unblock

<specific step to take once blocker is resolved>

## Notes

- <additional context>
- <alternative approaches considered>
```

## Notes For Task Owner

- Record attempts honestly; failed attempts are evidence of what doesn't work.
- Distinguish between "no new evidence" (same failure) and "new evidence" (narrowed scope, ruled out hypothesis, discovered boundary).
- Escalate to `blocked-needs-user` when failure budget is exceeded and root cause is still unclear.
- Update this record when the blocker is resolved: note the resolution and close the blocker.
