# Planner

Use this skill in the current Codex thread during `clarify` and `plan-review`.

## Workflow

1. Read `AGENTS.md`.
2. Read `prompts/planner.md`.
3. Read the active run directory under `.codex-composer/runs/<run-id>/`.
4. Ask only the minimum questions needed to make the plan decision-complete.
5. Persist checkpoint decisions with `./scripts/composer-checkpoint.sh`.
6. If the user approves a split, keep A in the current repository and explain how to open B in a separate worktree/thread.

## Outputs

- updated `clarifications.md`
- an approved or deferred plan decision in `status.json` and `decisions.md`
