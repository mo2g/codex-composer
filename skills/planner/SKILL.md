# Planner

Use this skill in the current Codex thread during `clarify` and `plan-review`.

## Workflow

1. Read `AGENTS.md`.
2. Read the planner prompt in the protocol directory.
3. Read the active run directory under `.codex-composer/runs/<run-id>/`.
4. Ask only the minimum questions needed to make the plan decision-complete.
5. Persist checkpoint decisions with the repository launcher.
6. If the user approves a split, keep A in the current repository and explain how to open B in a separate worktree/thread.

## Outputs

- updated `clarifications.md`
- an approved or deferred plan decision in `status.json` and `decisions.md`
