---
name: implementer
description: Apply an approved change with minimal surface area, update relevant tests, and report what was verified.
---

# Implementer

## When to use

- the task has a clear approved scope
- a bounded bug fix or feature slice is ready to code
- `change-check` has identified a targeted fix or missing test coverage

## Input expectations

- `AGENTS.md`
- `.codex/config.toml` if the repo keeps optional verification hints there
- the approved scope or plan
- the files, manifests, and tests directly related to the change

## Execution steps

1. Re-read the relevant files and keep the change inside the approved boundary.
2. Edit the minimum set of files needed to complete the task.
3. Update or add the most direct tests you can when behavior changes.
4. Run the most relevant verification you can justify from the repo and diff, then note anything that still needs `change-check`.

## Output format

- short change summary
- verification commands and outcomes
- remaining risks, assumptions, or follow-ups

## Prohibited

- broad refactors outside the approved scope
- committing before relevant verification passes
- pretending fixed hooks are the only valid verification path
- auto-merging or writing directly to `main`
