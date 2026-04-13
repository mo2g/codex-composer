# External Memory Contract

Use external memory only to reduce recovery cost. It must never replace the code, diff, tests, or repository rules as the source of truth.

## Principles

- Code truth beats note truth.
- Short, current notes beat long narrative notes.
- One reviewable change should have one memory set.
- Memory exists to reduce re-discovery, not to widen scope.

## Required artifacts for long-running work

For any task expected to span sessions, keep these artifacts together:

1. `task-card.md`
   - bounded intent
   - acceptance criteria
   - verification gate
   - isolation choice

2. `journal.md`
   - current code truth
   - drift check
   - decisions kept
   - latest verification evidence
   - next smallest step

3. `acceptance-evidence.md`
   - criterion-to-evidence mapping
   - gaps and residual risks

## Drift policy

When notes disagree with the diff or tests:

- treat the notes as stale
- repair the notes after reading the code truth
- do not continue implementation from stale assumptions

## Compression policy

When Codex thread context is compressed or partially lost:

- do not rely on conversational memory alone
- recover from repository artifacts first
- restate the accepted goal and next bounded step before editing

## Review policy

A human reviewer should be able to inspect:

- what the task was supposed to do
- what actually changed
- what verification proved each criterion
- what remains risky or unverified

without rereading the entire Codex conversation.
