# Codex Debug Workflow

This document is the canonical debug-mode extension for `docs/codex-task-card-workflow.md`.

Use it when a Task Card enters debug mode because long threads, context compression, or repeated speculative edits would otherwise hide the real cause.

## When to enable debug mode

Enable debug mode when any of these are true:

- root cause is not yet confirmed
- the failure is intermittent or timing-sensitive
- previous fix attempts failed
- the issue looks like a race condition, flaky test, ordering bug, or state leak

## Recommended artifact set

This extends the normal artifact set from `docs/codex-task-card-workflow.md` with debug-specific evidence.

```text
docs/_codex/<task-slug>/
  task-card.md
  debug.md
  journal.md
  acceptance-evidence.md
```

## Debug-mode additions

### 1. Plan the debug task

Use `planner` to create or refresh a bounded Task Card.

The Task Card should capture:

- mode
- required artifacts
- root-cause status
- symptom and scope boundary
- acceptance criteria for the fix
- verification gate
- isolation choice

### 2. Start hypothesis-driven investigation

Use `debug-investigation` and create `debug.md` before broad edits.

Required rules:

- write a ranked hypothesis table first
- run one experiment per hypothesis
- keep experimental changes as small as possible
- record evidence after every experiment
- after two failed attempts in one direction without new support, re-rank hypotheses

### 3. Confirm root cause before broad fix work

Do not move into full fix mode only because a symptom changed.

Transition from investigation to fix mode only when:

- one hypothesis has direct support
- contradictory evidence has been checked
- the planned fix targets the confirmed cause rather than masking the symptom

Until then, `implementer` should stay in minimal experiment mode or defer back to `debug-investigation` instead of making a broad speculative fix.

### 4. Resume from artifacts, not memory

If thread context is compressed or a handoff occurs:

- read `AGENTS.md`
- read `task-card.md`
- read `debug.md`
- read `journal.md`
- inspect the current diff and nearby tests

This extends the normal resume path with debug-specific evidence.

### 5. Verify the actual fix

Use `change-check` and `acceptance-evidence.md` to prove:

- which hypothesis became the confirmed root cause
- which hypotheses were ruled out
- whether the fix targets cause rather than only symptoms
- what evidence supports the fix
- which acceptance criteria are satisfied
- which risks remain

## Core operating rules

1. No non-trivial debugging without an explicit hypothesis table.
2. No multi-variable experiments.
3. No relying on chat history as the only record of evidence.
4. No repeated speculation after two failed attempts in the same direction without new support.
5. No calling the bug fixed unless the fix is tied to a confirmed cause and verified against acceptance criteria.

## Why this fits Codex app

This workflow extends the base task-card workflow instead of replacing it. It keeps the stable map small, stores debug state in repository artifacts only when needed, and preserves a full debug-aware closure without making trivial tasks heavier.
