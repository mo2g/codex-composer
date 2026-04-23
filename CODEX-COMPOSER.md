# Codex Composer

AI-assisted task workflow for this repository. Part of the Codex App Template.

## Quickstart

### Default Path (single task)

```
planner → implementer → change-check → commit
```

1. **planner** — Create `.codex/codex-composer/<task>/task-card.md`
2. **implementer** — Make the change
3. **change-check** — Verify and write `acceptance-evidence.md`
4. Commit and merge manually

### Plan Mode Path (complex work)

For requirements spanning 2+ reviewable changes:

```
planner → task-orchestrator → [loop] → done
```

1. **planner** — Create Epic Card + 2-5 Task Cards
2. **task-orchestrator** — Schedules tasks, tracks dependencies
3. Loop: orchestrator → implementer/check → orchestrator

## Skills

| Skill | Use When |
|-------|----------|
| `planner` | Starting new task/epic |
| `implementer` | Writing code |
| `change-check` | Verifying changes |
| `debug-investigation` | Unknown root cause |
| `resume-work` | Interrupted work |
| `task-orchestrator` | Multi-task coordination |

## Task States

```
planned → in-progress → verifying → done
   ↓         ↓            ↓
blocked-needs-user  blocked-needs-evidence  replanning
```

## Artifacts

Artifacts live in `.codex/codex-composer/<task-slug>/`:

- `task-card.md` — Requirements and acceptance criteria
- `journal.md` — Progress and decisions
- `acceptance-evidence.md` — Verification results
- `debug.md` — Debug investigation (only when root cause unconfirmed)
