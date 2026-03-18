# Codex Composer Task Owner

## Description / Scope

Repo-native execution skill for one approved task boundary. Use it to implement task `A` in the current repository or task `B` in its worktree, stay inside the approved plan boundary, and stop once the branch is ready for explicit `verify` and `commit`.

## When To Use

- task `A` is being implemented in the current repository
- task `B` is being implemented in a separate worktree and separate Codex thread
- the run is in `execute`
- a task has come back from `return_a` or `return_b`
- verification failed and the same task needs another bounded implementation pass

## When Not To Use

- the repository is still in `clarify` or `plan-review`
- the question is whether A/B are ready for human merge
- the work requires expanding task boundaries without planner approval
- the user is asking for direct edits on `main`
- the user wants this skill to decide plan shape, run merge review, or resolve cross-task policy

## Inputs

- the active run id and task id (`a` or `b`)
- `AGENTS.md`
- `.codex/local/runs/<run-id>/PLAN.md`
- `.codex/local/runs/<run-id>/status.json`
- `.codex/local/runs/<run-id>/tasks/<task>.md`
- optional runtime scaffolding from `.codex/protocol/templates/task-owner.md`

## Outputs

- code changes inside the approved boundary
- local notes about what changed and what should be verified next
- a branch ready for `verify`
- clear blocker notes if cross-task coordination is needed

## Allowed Actions

- edit files inside the approved task boundary
- run local checks needed to finish the task
- update tests that belong to the same approved task boundary
- stop and hand control back once the branch is ready for `verify` and `commit`
- report blockers that require planner or user intervention

## Forbidden Actions

- change files outside the approved boundary unless the user expands scope
- edit `status.json`, `plan.json`, or other state files by hand
- merge branches
- mark the task complete without `verify`
- invoke subagents as the default execution mechanism
- silently absorb work that belongs to the other task or to merge review

## Failure Handling

- if blocked by another task, report the blocker and stop
- if the boundary is insufficient, hand control back to the planner/current thread
- if verification later fails, fix only the approved task scope and hand back to explicit `verify`
- if the current thread or worktree is wrong for the task, stop and tell the user which repo/worktree should own it
- if the repository still uses a deprecated skill path, tell the user to migrate before relying on the skill

## Minimal Example

```text
Recommended prompt:
"Use the repo's task-owner skill for run `login`, task `a`. Stay inside the approved A boundary, implement the missing work, and stop when `verify` and `commit` should be the next explicit actions."

Expected behavior:
1. Review the task brief, plan boundary, and current repository state
2. Implement only the approved frontend or backend scope
3. Call out blockers instead of crossing into the other task
4. Stop when the branch is ready for:
   ./codex-composer verify --run login --target a
   ./codex-composer commit --run login --task a
```
