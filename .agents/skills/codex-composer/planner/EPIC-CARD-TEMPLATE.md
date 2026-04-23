# Epic Card Template

Use this template when a requirement spans multiple reviewable Task Cards.

## Rules

- One Epic Card coordinates 2-5 Task Cards that together complete a larger goal.
- Each Task Card remains independently reviewable with its own acceptance criteria.
- Dependencies between tasks should be explicit, not implicit.
- The Epic Card does not replace Task Cards; it provides context for them.

## Template

```md
# Epic Card: <epic-slug>

- Status: planned | in-progress | blocked-needs-user | blocked-needs-evidence | replanning | done | abandoned
- Last updated: <YYYY-MM-DD HH:MM TZ>
- Parent: <parent-epic-or-none>

## Goal

<one concrete outcome that the Epic achieves>

## Non-goals

<what is explicitly out of scope for this Epic>

## Scope

<boundaries of what this Epic covers>

## Global Acceptance Criteria

1. <criteria that applies across all tasks>
2. <cross-task integration criteria>

## Task List

| ID | Task | Type | Complexity | Model | Status | Depends On |
|----|------|------|------------|-------|--------|------------|
| 01 | <brief description> | decision/execution/verification | 1-10 | cheap/standard/strong | planned/in-progress/verifying/blocked-needs-user/blocked-needs-evidence/replanning/done/abandoned | - |
| 02 | <brief description> | decision/execution/verification | 1-10 | cheap/standard/strong | planned/in-progress/verifying/blocked-needs-user/blocked-needs-evidence/replanning/done/abandoned | 01 |
| 03 | <brief description> | decision/execution/verification | 1-10 | cheap/standard/strong | planned/in-progress/verifying/blocked-needs-user/blocked-needs-evidence/replanning/done/abandoned | 01, 02 |

## Dependency Graph

```
01 -> 02 -> 04
  \
   -> 03 -> 05
```

Or describe in text:
- Task 01 (decision) must complete before any execution tasks start
- Tasks 02 and 03 can run in parallel after 01
- Task 04 depends on 02
- Task 05 depends on 03

## User Decision Points

- <decision that needs user input>
- <architectural choice with tradeoffs>

## Global Blockers

| Blocker ID | Summary | Blocks Tasks | Risk if Ignored |
|------------|---------|--------------|-----------------|
| B01 | <description> | 02, 03 | <consequence> |

## Progress Summary

Updated by `task-orchestrator` after each state change:

| State | Count | Task IDs |
|-------|-------|----------|
| planned | <count> | <ids> |
| in-progress | <count> | <ids> |
| verifying | <count> | <ids> |
| blocked-needs-user | <count> | <ids> |
| blocked-needs-evidence | <count> | <ids> |
| replanning | <count> | <ids> |
| done | <count> | <ids> |
| abandoned | <count> | <ids> |

**Overall**: <completed>/<total> complete, <blocked> blocked, <in-progress> in progress

## Epic done criteria

- [ ] All tasks `done` or `abandoned`
- [ ] No tasks in `blocked-needs-user` or `blocked-needs-evidence`
- [ ] Global acceptance criteria verified
- [ ] `task-orchestrator` final summary written

## Next Actions

1. <immediate next step>
2. <contingency if blocked>

## Notes

- <assumptions>
- <risks>
- <open questions>
```

## Notes For Planner

- Keep the Epic goal concrete and achievable; avoid open-ended epics.
- Split tasks by cognitive type (decision vs execution), not just by file.
- Assign complexity scores honestly to enable model stratification.
- Mark dependencies clearly so `task-orchestrator` can identify ready tasks.
- Record user decision points upfront to reduce mid-implementation blocks.
- Update the progress summary after each Task Card completes.
