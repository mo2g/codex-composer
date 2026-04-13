# Default Task-Card Workflow

This file turns the installed `planner`, `implementer`, `resume-work`, `change-check`, and `debug-investigation` skills into one explicit default loop.

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

When debugging an unclear root cause, extend the artifact set with:

```text
docs/_codex/<task-slug>/
  debug.md
```

## Default loop

1. **Plan with `planner`.**
   - Create or refresh `task-card.md` using `planner/TASK-CARD-TEMPLATE.md`.
   - The card should define the exact goal, scope boundary, acceptance criteria, verification gate, isolation choice, and the current mode.
   - Do not begin implementation until the Task Card is bounded.

2. **Implement with `implementer`.**
   - Make the smallest step that advances the current Task Card.
   - If debug mode is active and root cause is still unconfirmed, stay in minimal experiment mode or defer back to `debug-investigation`.
   - Keep the change inside the approved boundary.
   - After meaningful progress, update `journal.md` with current code truth, decisions, evidence, and the next smallest step, and keep `debug.md` current when active.

3. **Resume with `resume-work` when context is weak.**
   - Reconstruct the task from `AGENTS.md`, `task-card.md`, `debug.md` when active, `journal.md`, the diff, and nearby tests.
   - Call out drift before taking the next step.
   - Repair stale notes after the code truth is understood.

4. **Verify with `change-check`.**
   - Use `acceptance-evidence.md` to map every acceptance criterion to evidence, a gap, or a risk.
   - For debug tasks, also prove the confirmed root cause, ruled-out hypotheses, and cause-targeting fix.
   - Prefer the narrowest reliable verification first.
   - Keep merge manual.

## Debug-mode extension

When root cause is unclear, switch into debug mode before broad fixes.

1. Use `debug-investigation`.
2. Create or refresh `debug.md` using `debug-investigation/DEBUG-TEMPLATE.md`.
3. List hypotheses before patching.
4. Run one attributable experiment per hypothesis.
5. Externalize every result before moving to the next step.
6. Re-rank hypotheses after two failed attempts in one direction without new support.

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
- `docs/_codex/<task-slug>/debug.md` when debug mode is active
- the current diff and nearby tests
