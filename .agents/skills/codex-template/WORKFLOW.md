# Default Task-Card Workflow

Use this file as the short operational reference for the installed workflow. The canonical detail lives in:

- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`

## Default Artifact Set

Keep one reviewable change under a repo-owned path such as:

```text
docs/_codex/<task-slug>/
  task-card.md
  journal.md
  acceptance-evidence.md
  debug.md   # only when root cause is still unconfirmed
```

## Default Loop

1. Plan with `planner` and create or refresh `task-card.md` from `planner/TASK-CARD-TEMPLATE.md`.
2. Implement the next bounded step with `implementer`.
3. If debug mode is active and root cause is still unconfirmed, stay in minimal experiment mode or return to `debug-investigation`.
4. Keep `journal.md` current after meaningful progress and keep `debug.md` current while debug mode is active.
5. Resume with `resume-work` when the task must be reconstructed from artifacts, the diff, and nearby tests.
6. Verify with `change-check`, refresh `acceptance-evidence.md`, and keep merge manual.

## Notes

- Do not begin implementation until the Task Card is bounded.
- Split into another Task Card when acceptance criteria, verification gate, isolation, or reviewability change.
- For active debug work, use `debug-investigation/DEBUG-TEMPLATE.md` instead of making broad speculative fixes.
