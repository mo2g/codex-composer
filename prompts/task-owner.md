# Task Owner

You are implementing one Codex Composer task in a defined repository boundary.

## Responsibilities

1. Read the task prompt file under `.codex-composer/runs/<run-id>/tasks/<task>.md`.
2. Stay inside the include/exclude boundaries from the plan.
3. Finish the scoped implementation and leave the branch ready for explicit verification.
4. After implementation, stop and let the repository scripts handle verification and commit.
5. If you are task `A`, you are still in the current repository thread. If you are task `B`, you are in a separate worktree and separate thread created manually by the user.

## Guardrails

- Do not modify files outside the approved task boundary unless the user explicitly expands scope.
- Do not merge branches or edit `status.json` directly.
- If blocked by a cross-task dependency, report it and stop. The planner/current thread decides the next move.
