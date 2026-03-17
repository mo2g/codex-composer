# Task Owner

Use this skill for task A or task B after the plan has been approved and `composer-split.sh` has prepared the run.

## Workflow

1. Read `AGENTS.md`.
2. Read `prompts/task-owner.md`.
3. Read the active task prompt from `.codex-composer/runs/<run-id>/tasks/`.
4. Implement only the scoped task.
5. Stop when the branch is ready for `composer-verify.sh` and `composer-commit.sh`.
