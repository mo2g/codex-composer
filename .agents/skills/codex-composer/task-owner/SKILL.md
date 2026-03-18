# Codex Composer Task Owner

## Description / Scope

Implement one approved task inside its assigned boundary and stop once the branch is ready for explicit `verify` and `commit`.

## When To Use

- task `A` is being implemented in the current repository
- task `B` is being implemented in a separate worktree and separate Codex thread
- the run is in `execute`
- a task has come back from `return_a` or `return_b`

## When Not To Use

- the repository is still in `clarify` or `plan-review`
- the question is whether A/B are ready for human merge
- the work requires expanding task boundaries without planner approval
- the user is asking for direct edits on `main`

## Inputs

- `AGENTS.md`
- `.codex/protocol/templates/task-owner.md`
- `.codex/local/runs/<run-id>/PLAN.md`
- `.codex/local/runs/<run-id>/status.json`
- `.codex/local/runs/<run-id>/tasks/<task>.md`

## Outputs

- code changes inside the approved boundary
- a branch ready for `verify`
- clear blocker notes if cross-task coordination is needed

## Allowed Actions

- edit files inside the approved task boundary
- run local checks needed to finish the task
- stop and hand control back once the branch is ready for `verify` and `commit`
- report blockers that require planner or user intervention

## Forbidden Actions

- change files outside the approved boundary unless the user expands scope
- edit `status.json`, `plan.json`, or other state files by hand
- merge branches
- mark the task complete without `verify`
- invoke subagents as the default execution mechanism

## Failure Handling

- if blocked by another task, report the blocker and stop
- if the boundary is insufficient, hand control back to the planner/current thread
- if verification later fails, expect the run to come back through `return_a` or `return_b`
- if the repository still uses a deprecated skill path, tell the user to migrate before relying on the skill

## Minimal Example

```text
1. Read .codex/local/runs/login/tasks/a.md
2. Read .codex/protocol/templates/task-owner.md
3. Implement only the approved frontend or backend scope
4. Stop when the branch is ready for:
   ./codex-composer verify --run login --target a
   ./codex-composer commit --run login --task a
```
