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

- Status: planned | in-progress | blocked | ready-for-check | done
- Owner thread: <current-thread | new-thread>
- Branch/worktree: <branch-or-worktree-name>
- Last updated: <YYYY-MM-DD HH:MM TZ>
- Mode: implementation | debug
- Required artifacts: task-card.md, journal.md, acceptance-evidence.md[, debug.md]
- Root-cause status: n/a | unconfirmed | confirmed

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
