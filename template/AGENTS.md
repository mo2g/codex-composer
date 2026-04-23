# Codex App Template

This repository is configured for Codex App with a lightweight workflow.

## Quick Reference

| What | Where |
|------|-------|
| 5-step default loop | `docs/codex-quickstart.md` |
| Full workflow spec | `docs/codex-task-card-workflow.md` |
| Debug mode spec | `docs/codex-debug-workflow.md` |
| Skill definitions | `.agents/skills/codex-template/` |
| Plan mode scheduler | `task-orchestrator` skill |

## Default Loop

1. **Plan** with `planner` → create `task-card.md`
2. **Implement** with `implementer` → make the change
3. **Verify** with `change-check` → write `acceptance-evidence.md`
4. **Commit** manually
5. **Merge** manually

Use `docs/_codex/<task-slug>/` only when the task needs durable state.

## Plan Mode (for complex work)

When a requirement spans multiple reviewable changes:

1. `planner` → create Epic Card + 2-5 Task Cards
2. `task-orchestrator` → schedules tasks, tracks dependencies
3. Loop: orchestrator → implementer/check → orchestrator
4. Epic complete when all tasks done

See `docs/codex-task-card-workflow.md` Plan Mode section for details.

## Verification

After template/skill/docs changes, run the repo's verification command (usually `npm test`).

## Working Rules

- Start non-trivial work with `planner`.
- Use `debug-investigation` for unconfirmed root cause.
- Use `resume-work` to recover context after interruption.
- Keep merge manual after `change-check`.
- When ambiguous, defer to `docs/codex-quickstart.md` first.
