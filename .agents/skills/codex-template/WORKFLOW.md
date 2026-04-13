# Default Task-Card Workflow

This file turns the installed `planner`, `implementer`, `resume-work`, and `change-check` skills into one explicit default loop.

## When to use this workflow

Use it for any task that is:

- non-trivial
- likely to span more than one Codex turn
- likely to need a handoff across sessions, threads, or worktrees
- risky enough that acceptance evidence should stay auditable

## Canonical artifact layout

The repository may keep task artifacts under a repo-owned path such as:

```text
docs/_codex/<task-slug>/
  task-card.md
  journal.md
  acceptance-evidence.md
```

Keep one directory per reviewable change.

## Default loop

1. **Plan with `planner`.**
   - Create or refresh `task-card.md` using `planner/TASK-CARD-TEMPLATE.md`.
   - The card should define the exact goal, scope boundary, acceptance criteria, verification gate, and isolation choice.
   - Do not begin implementation until the Task Card is bounded.

2. **Implement with `implementer`.**
   - Make the smallest step that advances the current Task Card.
   - Keep the change inside the approved boundary.
   - After meaningful progress, update `journal.md` with current code truth, decisions, evidence, and the next smallest step.

3. **Resume with `resume-work` when context is weak.**
   - Reconstruct the task from `AGENTS.md`, `task-card.md`, `journal.md`, the diff, and nearby tests.
   - Call out drift before taking the next step.
   - Repair stale notes after the code truth is understood.

4. **Verify with `change-check`.**
   - Use `acceptance-evidence.md` to map every acceptance criterion to evidence, a gap, or a risk.
   - Prefer the narrowest reliable verification first.
   - Keep merge manual.

## Split rules

Split into a new Task Card when any of these changes:

- acceptance criteria
- verification gate
- isolation boundary
- reviewability of the diff

Do not hide multi-card work inside one oversized journal.

## Handoff rules

Before a handoff or pause:

- `task-card.md` should reflect the current accepted scope
- `journal.md` should reflect the current code truth
- `acceptance-evidence.md` should exist once verification begins
- the next smallest step should be written explicitly

## Minimal success condition

A task is in good shape when a fresh Codex thread can recover it by reading only:

- `AGENTS.md`
- `docs/_codex/<task-slug>/task-card.md`
- `docs/_codex/<task-slug>/journal.md`
- the current diff and nearby tests
