---
name: task-owner
description: Implement one already-approved Codex Composer task boundary. Use this skill for task A in the current repo or task B in its worktree thread, stay inside the approved scope, and stop when explicit verify and commit should be the next actions.
---

# Codex Composer Task Owner

## When to use

- the run is in `execute`
- task `A` is being implemented in the current repository and current Codex thread
- task `B` is being implemented in its dedicated worktree and separate Codex thread
- a task has come back from `return_a` or `return_b`
- verification failed and the same task needs another bounded implementation pass

## When not to use

- the repository is still in `clarify` or `plan-review`
- the question is whether A/B are ready for human merge
- the work requires expanding task boundaries without planner approval
- the user is asking for direct edits on `main`
- the user wants this skill to decide plan shape, run merge review, or absorb work from the other task

## Inputs

- the active run id and task id (`a` or `b`)
- `AGENTS.md`
- `.codex/config.toml`
- `.codex/local/runs/<run-id>/PLAN.md`
- `.codex/local/runs/<run-id>/status.json`
- `.codex/local/runs/<run-id>/tasks/<task>.md`
- the current task worktree and branch selected by `split`
- optional runtime scaffolding from `.codex/protocol/templates/task-owner.md`

## Outputs

- code changes inside the approved task boundary only
- local notes about what changed and what should be verified next
- a branch ready for explicit `verify`
- clear blocker notes if planner or user intervention is needed

## Allowed actions

- edit files inside the approved task boundary
- run local checks needed to finish the task
- update tests that belong to the same approved task boundary
- stop and hand control back once `verify` and `commit` should be the next explicit actions
- report blockers instead of crossing task boundaries

## Forbidden actions

- change files outside the approved boundary unless the user explicitly expands scope
- edit `status.json`, `plan.json`, or other workflow state files by hand
- merge branches or write directly to `main`
- mark the task complete without explicit `verify`
- use subagents as the default execution mechanism
- silently absorb work that belongs to the other task or to merge review

## Failure handling

- if blocked by the other task, report the blocker and stop
- if the approved boundary is insufficient, hand control back to the planner/current thread
- if verification later fails, fix only the approved task scope and hand back to explicit `verify`
- if the current thread or worktree is wrong for the task, stop and tell the user which repo/worktree should own it
- if waiting on a human gate or another task, report the blocker once and stop instead of waiting or polling
- if the repository still uses deprecated protocol, skill, or config paths, tell the user to run `./codex-composer migrate`

## Minimal example

```text
Recommended prompt:
"Use the repo's task-owner skill for run `login`, task `a`. Stay inside the approved A boundary, implement the missing work, and stop when `verify` and `commit` should be the next explicit actions."

Expected behavior:
1. Review the task brief, plan boundary, `.codex/config.toml`, and current repository state
2. Implement only the approved frontend or backend scope
3. Call out blockers instead of crossing into the other task
4. Stop when the branch is ready for:
   ./codex-composer verify --run login --target a
   ./codex-composer commit --run login --task a
```
