---
name: planner
description: Clarify scope, lock acceptance criteria, and produce a bounded implementation plan before coding starts.
---

# Planner

## When to use

- the task spans multiple files or subsystems
- scope, risks, or acceptance criteria are still fuzzy
- parallel threads or worktrees might help but the split is not obvious

## Input expectations

- `AGENTS.md`
- `.codex/config.toml` if the repo keeps project defaults or verification hints there
- the user request
- relevant code, docs, nearby tests, and existing verification constraints

## Execution steps

1. Inspect the current implementation and gather the facts that can be derived locally.
2. Identify the required outcome, the non-goals, and the risks that would change the plan.
3. Decide whether the work should stay in the current thread or use an optional split or worktree.
4. Break the work into bounded implementation steps and define the `change-check` evidence gate before coding starts.

## Output format

- concise scope summary
- ordered implementation steps
- explicit verification plan
- assumptions or risks that still matter

## Prohibited

- implementing code directly from the planning pass
- inventing a merge checklist as a required workflow layer
- inventing parallel work splits without a clear isolation boundary
