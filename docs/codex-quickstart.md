# Codex App Quickstart

## How to Use This Repo

### Simple Task (single reviewable change)

```
planner → implementer → change-check → commit
```

1. `planner` — create `docs/_codex/<task>/task-card.md`
2. `implementer` — make the change
3. `change-check` — verify and write `acceptance-evidence.md`
4. Commit and merge manually

### Complex Task (multiple related changes)

Use **plan mode** when requirements span 2+ reviewable changes:

```
planner → task-orchestrator → [loop] → done
```

1. `planner` — create Epic Card + 2-5 Task Cards with dependencies
2. `task-orchestrator` — schedules tasks, enforces constraints
3. Loop: orchestrator → implementer/check → orchestrator
4. Epic complete when all tasks done

See `docs/codex-task-card-workflow.md` for the plan mode walkthrough.

### Decision Table

| Scenario | Mode | First Skill |
|----------|------|-------------|
| Single bounded change | Regular | `planner` |
| 2+ related changes with dependencies | Plan mode | `planner` |
| Debug unknown root cause | Debug mode | `debug-investigation` |
| Continue after interruption | Any | `resume-work` |

### Verification

After template/skill/docs changes:
```bash
npm test
```

**Done when:** `npm test` passes and changed templates have matching test assertions.

### Source Of Truth

- `docs/codex-task-card-workflow.md` — workflow spec
- `docs/codex-debug-workflow.md` — debug mode spec
