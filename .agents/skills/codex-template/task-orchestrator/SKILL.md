---
name: task-orchestrator
description: The single entry point for plan mode execution. Coordinates all Task Cards, enforces state transitions, manages failure budgets, and delegates to other skills for actual work.
---

# Task Orchestrator

## Plan Mode Execution Path

In plan mode, the execution flow is:

```
planner (creates Epic + Task Cards)
    ↓
task-orchestrator (schedules, enforces constraints)
    ↓
implementer / change-check / debug-investigation / resume-work (does work)
    ↓
task-orchestrator (updates state, selects next task)
    ↓
(repeat until Epic complete)
```

**Critical rule**: No skill other than `task-orchestrator` may:
- Transition task states
- Update Epic progress summary
- Write to `blockers.md`
- Decide which task runs next

## When to use

- Starting work on an Epic (select first task(s) to execute)
- After any skill completes work (update state, select next task)
- When a task appears stuck or blocked (enforce failure budget, escalate)
- When structural checks fail (transition to `replanning`)
- When user provides input (unblock and resume scheduling)
- When multiple tasks complete and dependencies shift

## Input expectations

- `AGENTS.md`
- Epic Card with task list and dependency graph
- All Task Cards in the epic
- Current `blockers.md` if exists
- Task journals (for attempt history)
- Output from last skill execution (implementer, change-check, etc.)

## Output format

- **Orchestrator decision log**:
  - State validation results (any inconsistencies found and fixed)
  - Hard constraints enforced (budget violations, structural fails)
- **Epic status summary**:
  - Tasks by state: planned / in-progress / verifying / blocked-needs-user / blocked-needs-evidence / replanning / done / abandoned
  - Overall progress: <completed>/<total>
- **Current executable task** (if any):
  - Task ID and description
  - Recommended model class with justification
  - Failure budget remaining
- **Blocked tasks** (if any):
  - Blocker ID, type, and required input
  - Risk if ignored
- **State transitions made**:
  - Previous state → new state for each modified task
- **Next action**:
  - Dispatch to skill: `implementer` / `change-check` / `debug-investigation` / `resume-work`
  - OR escalate: `ask-user` / `replan`
  - OR complete: Epic done

## Execution steps

### Phase 1: Load and validate state

1. Read Epic Card, all Task Cards, `blockers.md`, and task journals
2. Validate state consistency:
   - Tasks marked `in-progress` must have valid failure budget remaining
   - Tasks with exceeded budgets must be in `blocked-needs-user` or `replanning`
   - Dependencies must be acyclic and reference existing tasks
3. Rebuild dependency graph and identify critical path

### Phase 2: Identify executable tasks

4. Find tasks in `planned` state with all dependencies `done` or `abandoned`
5. For each candidate, verify failure budget allows execution
6. Apply model class selection rules (complexity + task type)
7. If no tasks ready, report why (dependencies or blockers)

### Phase 3: Enforce hard constraints

8. Check for budget-exceeded tasks that escaped proper state:
   - If `failed_attempt_count >= max_attempts` and status ≠ `blocked-needs-user`, force transition
   - If `same_direction_retry_count >= max_same_direction_retries`, force `replanning`
   - Write/update `blockers.md` with violation details
9. Check for structural violations reported by change-check:
   - Hard fail → transition to `replanning`, document in Epic
   - Soft fail → ensure residual risk recorded, continue if justified

### Phase 4: Select and dispatch

10. Select highest-priority ready task (critical path first, then complexity-appropriate)
11. Update Epic Card progress summary
12. Dispatch to appropriate skill:
    - New implementation → `implementer`
    - Verification needed → `change-check`
    - Debug mode active → `debug-investigation`
    - Context recovery needed → `resume-work`
    - Requires user input → `ask-user` (via `blocked-needs-user`)

### Phase 5: Post-execution state update

13. Receive output from executing skill
14. Update task state based on result:
    - Success → `verifying` (if more verification needed) or `done`
    - Failure with budget remaining → stay `in-progress`, update counters
    - Failure with budget exhausted → `blocked-needs-user` or `replanning`
    - Structural hard fail → `replanning`
15. Write updated Task Card and journal
16. Update Epic Card progress summary
17. If blocked, write `blockers.md` entry

### Phase 6: Determine next action

18. If more tasks ready → loop to Phase 4
19. If all tasks done/abandoned → mark Epic `done`
20. If blocked on user input → stop, report blocker summary
21. If replanning needed → stop, request `planner` intervention

## Task State Machine

### Complete state diagram

```
Primary flow:
  planned -> in-progress -> verifying -> done

Exception flows:
  planned -> abandoned
  in-progress -> blocked-needs-user
  in-progress -> blocked-needs-evidence
  in-progress -> replanning
  verifying -> blocked-needs-user
  verifying -> replanning

Recovery flows:
  blocked-needs-user -> in-progress (after user input)
  blocked-needs-evidence -> in-progress (after evidence obtained)
  replanning -> planned (after replan complete)
```

### State definitions

- `planned`: Task defined, dependencies may or may not be satisfied
- `in-progress`: Actively being implemented
- `verifying`: Implementation complete, undergoing verification
- `done`: All acceptance criteria met with evidence
- `blocked-needs-user`: Cannot proceed without user input (spec, decision, permission)
- `blocked-needs-evidence`: Cannot proceed without additional evidence (fixture, repro, data)
- `replanning`: Task needs restructuring (scope change, complexity too high, structural hard fail)
- `abandoned`: Task no longer needed

### State transitions (orchestrator-enforced)

| From | To | Condition | Orchestrator Action |
|------|-----|-----------|---------------------|
| `planned` | `in-progress` | Dependencies satisfied, budget allows | Update Task Card, assign to skill |
| `in-progress` | `verifying` | Implementation complete | Dispatch to `change-check` |
| `verifying` | `done` | All criteria verified, no hard fails | Mark complete, update Epic |
| `in-progress` | `blocked-needs-user` | Budget exceeded, missing spec, ambiguous intent, root cause unconfirmed | Write blocker, stop execution |
| `in-progress` | `blocked-needs-evidence` | Missing fixture, no repro, unknown contract | Write blocker, request data |
| `in-progress` | `replanning` | Structural hard fail, complexity requires split, scope changed | Document reason, request replan |
| `verifying` | `replanning` | Structural hard fail found during check | Document violation, request replan |
| `blocked-needs-user` | `in-progress` | User provided required input | Validate input, resume execution |
| `blocked-needs-evidence` | `in-progress` | Evidence obtained | Validate evidence, resume execution |
| `replanning` | `planned` | New plan approved, task restructured | Update Task Card, dependencies |

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
