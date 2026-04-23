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

1. **Check failure budget first** (plan mode only): If `failed_attempt_count >= max_attempts`, stop immediately. Do not modify code. Transition task to `blocked-needs-user` and write blocker record. If `same_direction_retry_count >= max_same_direction_retries` without new evidence, stop and transition to `replanning`.
2. Re-read the relevant files, Task Card, and `debug.md` when present, then keep the change inside the approved boundary.
3. If debug mode is active and root cause is still unconfirmed, stay in minimal single-hypothesis experiment mode or hand the task back to `debug-investigation` before any broad fix.
4. **Check structural constraints**: Review `structure_impact` in Task Card. If changes would cause hard fail (function >100 lines, file growth >200 lines, circular dependencies, layer mixing), stop and escalate to `replanning`.
5. Edit the minimum set of files needed to complete the approved step.
6. Update or add the most direct tests you can when behavior changes.
7. Run the most relevant verification you can justify from the repo and diff, then note anything that still needs `change-check`.
8. Keep `journal.md` current after meaningful progress and keep `debug.md` current when the task is still in debug mode.
9. **Update failure budget tracking**: Increment `attempt_count`. If verification fails, increment `failed_attempt_count`. If retrying same approach without new evidence, increment `same_direction_retry_count`. Record timestamp if new evidence obtained.

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
