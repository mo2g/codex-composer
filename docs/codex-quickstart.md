# Codex App Quickstart

## First Pass

1. Read `AGENTS.md` for this repository's workflow guidance.
2. Inspect repo manifests, nearby tests, and `.codex/config.toml` if present.
3. If the task is non-trivial, start with `planner` skill.

## Default Loop (single task)

1. **Plan** — Use `planner` to bound one reviewable change
2. **Implement** — Use `implementer` for the approved step
3. **Verify** — Use `change-check` before commit
4. **Commit & Merge** — Manual, after verification

Use `docs/_codex/<task-slug>/` only when the task needs durable state.
Use `resume-work` to recover context after interruption.
Use `debug-investigation` when root cause is unconfirmed.

## Plan Mode (multiple related tasks)

For complex requirements spanning multiple reviewable changes:

1. `planner` creates Epic Card + 2-5 Task Cards with dependencies
2. `task-orchestrator` schedules tasks and tracks progress
3. Loop: orchestrator → implementer/check → orchestrator
4. Epic complete when all tasks done

See `docs/codex-task-card-workflow.md` Plan Mode section for the walkthrough.

## Verification

Run the repo's verification command after changes:
- Template/skill/docs changes: `npm test`

## Source Of Truth

- `docs/codex-task-card-workflow.md` — workflow spec
- `docs/codex-debug-workflow.md` — debug mode spec

When wording conflicts, defer to the canonical workflow docs.
