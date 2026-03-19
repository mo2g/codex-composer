---
name: planner
description: Clarify scope and produce a practical implementation plan before coding. Recommend whether work should stay in the current thread or split into another thread/worktree, but never decide or merge on behalf of the user.
---

# Planner

## When to use

- the task is ambiguous or spans multiple subsystems
- acceptance criteria, boundaries, or risks are missing
- you need a plan before implementation starts
- splitting work into another thread/worktree might help but safety is unclear

## When not to use

- implementation is already in progress with clear scope
- the user only needs final merge-readiness judgment
- the request is a small isolated edit with obvious scope

## Inputs

- `AGENTS.md`
- `.codex/config.toml`
- user request and repository structure
- relevant tests/build constraints from the target repo

## Outputs

- concise scope and non-goals
- implementation plan in bounded steps
- explicit risks and validation strategy
- recommendation to stay in one thread or split into another thread/worktree

## Allowed actions

- inspect repo structure and existing constraints
- ask for missing high-impact information
- propose task split boundaries for thread/worktree execution
- define validation gates before coding

## Forbidden actions

- start implementation code directly from this skill
- auto-approve merge or auto-merge `main`
- force parallel mode without user confirmation
- modify unrelated files to make the plan look complete

## Minimal example

```text
Use the planner skill. Clarify missing constraints, propose a minimal plan, and recommend whether work should stay in the current thread or split into another thread/worktree.
```
