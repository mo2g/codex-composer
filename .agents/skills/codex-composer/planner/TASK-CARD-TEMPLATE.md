# Task Card Template

Use this template when a task is non-trivial or likely to outlive the current Codex thread.

## Rules

- One Task Card should represent one reviewable change.
- Do not combine unrelated fixes just because they touch nearby files.
- Split into another card when acceptance criteria, verification, or isolation differ.
- Prefer the smallest card that can still produce useful evidence.

## Template

```md
# Task Card: <task-slug>

- Status: planned | in-progress | verifying | blocked-needs-user | blocked-needs-evidence | replanning | done | abandoned
- Owner thread: <current-thread | new-thread>
- Branch/worktree: <branch-or-worktree-name>
- Last updated: <YYYY-MM-DD HH:MM TZ>
- Mode: implementation | debug
- Required artifacts: task-card.md, journal.md, acceptance-evidence.md[, debug.md]
- Root-cause status: n/a | unconfirmed | confirmed

## Plan mode fields (optional)

Use these when coordinating multiple tasks through an Epic Card:

- Task ID: `<epic-shortname>-<number>` (e.g., auth-01, auth-02)
- Parent Epic: `<epic-slug>`
- Task Type: decision | execution | verification | question | investigation
- Dependencies: `<task-id-1>, <task-id-2>` (comma-separated list of blocking tasks)
- Complexity Score: `<1-10>` (1-3 = cheap, 4-6 = standard, 7+ = strong or split)
- Model Class: cheap | standard | strong
- Failure Budget:
  - Max attempts: `<number>`
  - Max same-direction retries: `<number>`
  - Stop if no new evidence after: `<number>` attempts
- Blocker Policy: replan | ask-user | escalate-to-strong
- Structure Impact: (notes on module boundaries, file responsibilities, test structure)
- Escalation Conditions: (when to escalate: missing spec, ambiguous intent, cross-module risk, etc.)

## Goal

<one concrete outcome>

## In scope

- <bounded change 1>
- <bounded change 2>

## Out of scope

- <explicitly excluded work>
- <follow-up that should stay separate>

## Files likely involved

- <path>
- <path>

## Acceptance criteria

1. <observable behavior or code property>
2. <observable behavior or test expectation>

## Verification gate

- <narrowest command or evidence path that can prove the card>
- <additional risk-driven verification if needed>

## Verification commands (for Codex execution)

```bash
# Primary verification command
<command to run tests, typecheck, lint, etc.>

# Additional verification if needed
<additional command>
```

## Done criteria

- [ ] All acceptance criteria verified with evidence
- [ ] Structural checks pass (no hard fails)
- [ ] Failure budget not exceeded
- [ ] `change-check` completed and `acceptance-evidence.md` written
- [ ] Task Card status updated to `done` or `verifying`

## Review expectations

- **Review focus**: <what the reviewer should pay attention to>
- **Expected review time**: <small/medium/large>
- **Risk areas**: <areas that need careful review>
- **Safe to merge when**: <conditions for safe merge>

## Isolation

- Stay in current thread | open new thread | use worktree
- Reason: <why this isolation choice reduces risk>

## Risks

- <risk>
- <risk>

## Decisions

- <decision already made>

## Evidence log

- Pending

## Next smallest step

- <the next bounded implementation step>
```

## Notes For Planner

- Lock the goal before naming implementation steps.
- Make acceptance criteria specific enough for `change-check` to map evidence back to them.
- Set `Mode: debug` only when the root cause is still unconfirmed and the task needs hypothesis-driven investigation.
- Add `debug.md` to `Required artifacts` only when debug mode is active.
- If the task needs multiple cards, name the dependency order explicitly instead of hiding it inside one large plan.

## Plan Mode Notes

- Use `Task Type: decision` for architecture or boundary choices; use `execution` for implementation work.
- Assign `Complexity Score` honestly: low scores allow cheap models, high scores require splitting or strong models.
- Fill `Dependencies` so `task-orchestrator` can identify ready-to-run tasks.
- Set `Failure Budget` to prevent infinite speculative retries; typical values are 3-5 max attempts, 2 same-direction retries.
- Document `Structure Impact` to prevent "add more code to existing large file" anti-patterns.
- When a task exceeds its failure budget, transition to `blocked` and record what information is missing in `journal.md`.
