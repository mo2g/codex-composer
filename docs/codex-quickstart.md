# Codex App Quickstart

## Default Path (single task)

```
planner → implementer → change-check → commit
```

1. `planner` — create `docs/_codex/<task>/task-card.md`
2. `implementer` — make the change
3. `change-check` — verify and write `acceptance-evidence.md`
4. Commit and merge manually

## Plan Mode Path (complex work)

For requirements spanning 2+ reviewable changes:

```
planner → task-orchestrator → [loop] → done
```

1. `planner` — create Epic Card + 2-5 Task Cards
2. `task-orchestrator` — schedules tasks, tracks dependencies
3. Loop: orchestrator → implementer/check → orchestrator

See `docs/codex-task-card-workflow.md` for the walkthrough.

## What to Do

| Situation | Use |
|-----------|-----|
| Simple bounded change | Default path |
| Multiple related changes | Plan mode path |
| Debug unknown root cause | `debug-investigation` skill |
| Interrupted work | `resume-work` skill |

## Verification

After changes: `npm test`
