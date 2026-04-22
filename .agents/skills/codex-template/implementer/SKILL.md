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
- the current Task Card and `debug.md` when debug mode is active
- the files, manifests, and tests directly related to the change

## Execution steps

1. Re-read the relevant files, Task Card, and `debug.md` when present, then keep the change inside the approved boundary.
2. If debug mode is active and root cause is still unconfirmed, stay in minimal single-hypothesis experiment mode or hand the task back to `debug-investigation` before any broad fix.
3. Edit the minimum set of files needed to complete the approved step.
4. Update or add the most direct tests you can when behavior changes.
5. Run the most relevant verification you can justify from the repo and diff, then note anything that still needs `change-check`.
6. Keep `journal.md` current after meaningful progress and keep `debug.md` current when the task is still in debug mode.
7. When plan mode fields are present, respect the failure budget: track attempt count, stop and escalate if max attempts exceeded or 3 same-direction retries fail without new evidence.

## Output format

- short change summary
- whether the task is still in debug mode or moved into confirmed-cause fix mode
- verification commands and outcomes
- remaining risks, assumptions, or follow-ups

## Prohibited

- broad refactors outside the approved scope
- broad speculative fixes while debug mode is active and root cause is still unconfirmed
- committing before relevant verification passes
- pretending fixed hooks are the only valid verification path
- auto-merging or writing directly to `main`
