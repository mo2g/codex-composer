# Codex Composer Task Owner

## Purpose

Implement one approved task inside its assigned boundary and stop once the branch is ready for explicit verification and commit.

## When To Use

- task `A` is being implemented in the current repository
- task `B` is being implemented in a separate worktree and separate Codex thread
- the run is in `execute`

## Inputs

- `AGENTS.md`
- `.codex/protocol/prompts/task-owner.md`
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

## Forbidden Actions

- change files outside the approved boundary unless the user expands scope
- edit `status.json` or other state files by hand
- merge branches
- mark the task complete without `verify`
- invoke subagents as the default execution mechanism

## Failure Handling

- if blocked by another task, report the blocker and stop
- if the boundary is insufficient, ask the planner/current thread to clarify
- if verification fails later, expect the run to come back through `return_a` or `return_b`

## Minimal Example

```text
1. Read the task prompt from .codex/local/runs/login/tasks/a.md
2. Implement only the approved frontend or backend scope
3. Stop when the branch is ready for:
   ./codex-composer verify --run login --target a
   ./codex-composer commit --run login --task a
```
