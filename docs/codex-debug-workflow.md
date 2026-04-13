# Codex Debug Workflow

This document defines the repository pattern for debugging tasks in Codex app.

It is designed for workflows where long threads, context compression, and repeated speculative edits can waste large amounts of token budget.

## Design goals

- keep `AGENTS.md` short
- treat `docs/` as the system of record
- externalize debugging state so Codex can resume from repository artifacts
- force hypothesis-driven investigation before broad code changes
- keep experiments attributable and auditable

## When to enable debug mode

Enable debug mode when any of these are true:

- root cause is not yet confirmed
- the failure is intermittent or timing-sensitive
- previous fix attempts failed
- the issue looks like a race condition, flaky test, ordering bug, or state leak

## Recommended artifact set

```text
docs/_codex/<task-slug>/
  task-card.md
  debug.md
  journal.md
  acceptance-evidence.md
```

## Workflow

### 1. Plan the debug task

Use `planner` to create a bounded Task Card.

The Task Card should capture:

- symptom and scope boundary
- acceptance criteria for the fix
- verification gate
- isolation choice
- whether debug mode is enabled

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

### 4. Resume from artifacts, not memory

If thread context is compressed or a handoff occurs:

- read `AGENTS.md`
- read `task-card.md`
- read `debug.md`
- read `journal.md`
- inspect the current diff and nearby tests

This allows Codex to recover the investigation without relying on conversational memory.

### 5. Verify the actual fix

Use `change-check` and `acceptance-evidence.md` to prove:

- which hypothesis became the confirmed root cause
- which hypotheses were ruled out
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

This workflow matches Codex app best practices by keeping the stable map small, storing working knowledge in repository docs, and making paused work resumable from checked-in artifacts instead of long chat history.
