---
name: task-orchestrator
description: Coordinate multiple Task Cards in plan mode, track dependencies and failure budgets, and decide when to escalate or ask for user input.
---

# Task Orchestrator

## When to use

- an Epic Card coordinates multiple Task Cards with dependencies
- you need to identify which tasks are ready to execute
- a task has exceeded its failure budget and needs escalation
- you need to decide which model class should handle the next task
- multiple tasks are blocked and need prioritization for user input

## Input expectations

- `AGENTS.md`
- Epic Card with task list and dependency graph
- All Task Cards in the epic
- Current `blockers.md` if any tasks are blocked
- Task journals to check current progress

## Execution steps

1. Read the Epic Card to understand the goal, scope, and task list.
2. For each Task Card, check its current status and dependencies.
3. Identify tasks with all dependencies satisfied (ready to execute).
4. Check each ready task's failure budget and attempt history.
5. If a task exceeds its failure budget, transition it to `blocked-needs-user` and record the blocker.
6. Recommend model class based on complexity score and task type.
7. Decide next action: `implement`, `check`, `debug`, `replan`, or `ask-user`.
8. Summarize overall progress and current blockers.

## Output format

- Epic status summary
- Ready-to-execute tasks (with recommended model class)
- Blocked tasks (with blocker type and required input)
- Completed tasks
- Overall progress: <completed>/<total>
- Next recommended action

## Task State Machine

```
planned -> in-progress -> verifying -> done
   |           |              |
   v           v              v
blocked-needs-user  replanning  abandoned
```

### State transitions

- `planned -> in-progress`: when dependencies are satisfied and failure budget allows
- `in-progress -> verifying`: when implementation is complete
- `verifying -> done`: when acceptance criteria are met
- `in-progress -> blocked-needs-user`: when failure budget exceeded or information missing
- `in-progress -> replanning`: when the task becomes too complex or scope changes

## Failure Budget Rules

Each Task Card has a failure budget to prevent speculative retry loops:

- Track `attempt_count`, `failed_attempt_count`, `same_direction_retry_count`
- Stop conditions:
  - 2 consecutive changes fail verification with no new evidence → escalate
  - 3 retries in same direction without progress → block and replan
  - Root cause unconfirmed but implementation started → force investigation mode

"New evidence" means: narrowed scope, ruled out hypothesis, obtained real fixture/response, discovered new error boundary.

## Model Class Selection

Based on complexity score and task type:

| Complexity | Task Type | Model Class |
|------------|-----------|-------------|
| 1-3 | execution | cheap |
| 4-6 | execution | standard |
| 7+ | execution | strong OR split into smaller tasks |
| any | decision | strong |
| any | investigation | strong |
| any | verification | cheap |

Default rule: prefer `cheap` when possible, split rather than escalate complexity.

## Blocker Escalation

When a task is blocked, use this user feedback template:

1. **Current goal**: what the task intended to achieve
2. **Confirmed facts**: what we know for certain
3. **Current blocker**: what is preventing progress
4. **Why continue trying wastes token**: explanation of the uncertainty
5. **Minimum information needed**: specific input required from user

Example:
> Goal: adapt interface to new return structure. Confirmed: mock and types are inconsistent, error handling is insufficient. Blocker: real backend contract is unknown. Continuing would be blind patching and might introduce incorrect compatibility. Need: real response sample or confirmation about field `items` nullability.

## Prohibited

- ignoring failure budget and allowing infinite retries
- escalating to `strong` model without first attempting to split the task
- proceeding with implementation when root cause is unconfirmed
- making cross-module changes without explicit user authorization
- guessing user intent when multiple valid interpretations exist

## Notes

- The orchestrator does not write code; it makes scheduling and escalation decisions.
- When in doubt, prefer `blocked-needs-user` over speculative progress.
- Keep the Epic Card progress summary current after each state change.
- Record blockers in `blockers.md` with specific missing information.
