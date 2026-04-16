# External Memory Contract

Use external memory only when it lowers recovery cost. It does not replace the code, diff, tests, or repository rules as the source of truth.

## Principles

- Code truth beats note truth.
- Keep notes short and current.
- One reviewable change should have one memory set.
- Memory narrows recovery cost; it should not widen scope.

## Recommended Artifact Set

For long-running work, keep these together:

1. `task-card.md`
2. `journal.md`
3. `acceptance-evidence.md`

When debug mode is enabled for an unclear root cause, add:

4. `debug.md`

These artifacts should capture current mode, required artifacts, acceptance criteria, verification, the next bounded step, and root-cause status when debug mode is active.

## Recovery Rules

- When notes disagree with the diff or tests, treat the notes as stale.
- Repair stale notes after the code truth is understood.
- When thread context is compressed, recover from repository artifacts first.
- Do not continue from conversational memory alone.

## Review Goal

A reviewer should be able to understand the intended change, actual code truth, verification evidence, and residual risk without rereading the full Codex conversation.
