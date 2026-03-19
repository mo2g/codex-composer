---
name: implementer
description: Apply an approved change with minimal surface area, update relevant tests, and report what was verified.
---

# Implementer

## When to use

- the task has a clear approved scope
- a bounded bug fix or feature slice is ready to code
- verification failures need a targeted fix

## Input expectations

- `AGENTS.md`
- `.codex/config.toml`
- the approved scope or plan
- the files and tests directly related to the change

## Execution steps

1. Re-read the relevant files and keep the change inside the approved boundary.
2. Edit the minimum set of files needed to complete the task.
3. Update or add tests when behavior changes.
4. Run the relevant verification commands and note any residual risk.

## Output format

- short change summary
- verification commands and outcomes
- remaining risks, assumptions, or follow-ups

## Prohibited

- broad refactors outside the approved scope
- committing before relevant verification passes
- auto-merging or writing directly to `main`
