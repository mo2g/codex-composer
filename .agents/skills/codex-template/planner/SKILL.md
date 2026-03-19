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
- `.codex/config.toml`
- the user request
- relevant code, docs, and existing verification constraints

## Execution steps

1. Inspect the current implementation and gather the facts that can be derived locally.
2. Identify the required outcome, the non-goals, and the risks that would change the plan.
3. Break the work into bounded implementation steps.
4. Define the validation commands and the merge-readiness gate before coding starts.

## Output format

- concise scope summary
- ordered implementation steps
- explicit verification plan
- assumptions or risks that still matter

## Prohibited

- implementing code directly from the planning pass
- approving merge readiness
- inventing parallel work splits without a clear isolation boundary
