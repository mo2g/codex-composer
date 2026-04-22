# Plan Mode State Machine

This document describes the state machine for tasks operating in plan mode.

## States

### Primary States

- `planned`: Task is defined but not yet started. Dependencies may or may not be satisfied.
- `in-progress`: Task is actively being worked on.
- `verifying`: Implementation complete, awaiting verification.
- `done`: Task complete, acceptance criteria met.

### Exception States

- `blocked-needs-user`: Cannot proceed without user input or decision.
- `blocked-needs-evidence`: Cannot proceed without additional evidence or fixtures.
- `replanning`: Task scope or complexity changed, needs replanning.
- `abandoned`: Task no longer needed or superseded.

## State Transitions

### Normal Flow

```
planned -> in-progress -> verifying -> done
```

Entry conditions:
- `planned -> in-progress`: All dependencies satisfied, failure budget available
- `in-progress -> verifying`: Implementation complete per acceptance criteria
- `verifying -> done`: All acceptance criteria verified with evidence

### Exception Flows

```
in-progress -> blocked-needs-user
in-progress -> blocked-needs-evidence
in-progress -> replanning

verifying -> replanning
verifying -> blocked-needs-user
```

Entry conditions:
- `in-progress -> blocked-needs-user`: Failure budget exceeded, missing specification, ambiguous intent
- `in-progress -> blocked-needs-evidence`: Missing reproduction case, fixture, or test data
- `in-progress -> replanning`: Scope changed, task too complex, new dependencies discovered
- `verifying -> replanning`: Acceptance criteria cannot be met as specified
- `verifying -> blocked-needs-user`: External dependency blocking verification

### Recovery Flows

```
blocked-needs-user -> in-progress
blocked-needs-evidence -> in-progress
replanning -> planned
```

Entry conditions:
- `blocked-needs-user -> in-progress`: User provided required input
- `blocked-needs-evidence -> in-progress`: Evidence obtained, fixture available
- `replanning -> planned`: Task redefined with new scope, complexity, or split

## Forced Transfer Rules

These transitions are mandatory (not optional):

1. **No undefined acceptance criteria**: A task without defined acceptance criteria cannot enter `in-progress`.
2. **No undefined next step**: A task without a defined next smallest step cannot begin implementation.
3. **No unconfirmed root cause**: When mode is `debug`, if root cause is unconfirmed, the task must move to `debug-investigation` before `in-progress`.
4. **No insufficient evidence**: A task cannot be marked `done` without evidence mapping to all acceptance criteria.
5. **No exceeded failure budget**: When `failed_attempt_count >= max_attempts`, the task must transition to `blocked-needs-user`.

## Failure Budget Integration

Each task tracks:
- `attempt_count`: Total implementation attempts
- `failed_attempt_count`: Attempts that failed verification
- `same_direction_retry_count`: Retries in the same approach without new evidence

Stop conditions:
- `failed_attempt_count >= max_attempts`: Force `blocked-needs-user`
- `same_direction_retry_count >= max_same_direction_retries`: Force `replanning`
- `root_cause_unconfirmed && implementing`: Force transition to `debug-investigation`

## Dependency Integration

A task can only enter `in-progress` when:
- All tasks in its `dependencies` list are in state `done`
- Or all dependencies are `abandoned` and the task is still relevant

A task with dependencies in `blocked-*` or `replanning` states:
- Cannot enter `in-progress`
- Should be reviewed for whether it should also be blocked

## Epic-Level Coordination

At the Epic level:
- Track counts of tasks in each state
- Identify critical path (tasks whose delay would block most others)
- Prioritize resolving blockers on the critical path
- When all tasks are `done` or `abandoned`, the Epic can be marked `done`

## Notes

- States are explicit; do not infer state from other fields.
- Record state transitions in the Task Card and journal.
- When a state transition occurs, update the Epic Card progress summary.
