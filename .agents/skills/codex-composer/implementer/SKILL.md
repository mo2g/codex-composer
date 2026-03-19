---
name: implementer
description: Implement approved, scoped changes with minimal surface area. Prioritize correctness, run relevant validation, and stop before merge.
---

# Implementer

## When to use

- scope is approved and implementation should start
- a bounded bug fix or feature slice is ready to code
- a failed verification needs scoped follow-up fixes

## When not to use

- planning and scope are still unclear
- the request is merge-readiness review only
- the task requires policy decisions beyond approved scope

## Inputs

- `AGENTS.md`
- `.codex/config.toml`
- approved scope/plan from the current thread
- relevant code, tests, and existing constraints

## Outputs

- scoped code changes only
- updated tests/checks where relevant
- short risk notes and what was verified
- branch state ready for human review and manual merge

## Allowed actions

- edit files inside approved scope
- run relevant validation commands
- add or adjust tests tied to the change
- report blockers early when boundaries are insufficient

## Forbidden actions

- silently expand into unrelated refactors
- commit before relevant verification
- auto-merge or write directly to `main`
- default to subagents for normal implementation

## Minimal example

```text
Use the implementer skill to apply the approved scope, run relevant tests, summarize risks, and stop before merge.
```
