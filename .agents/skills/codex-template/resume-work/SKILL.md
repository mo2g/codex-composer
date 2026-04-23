---
name: resume-work
description: Reconstruct a paused task from AGENTS.md, the task journal, any debug record, the diff, and nearby tests before taking the next bounded step.
---

# Resume Work

## When to use

- the task spans multiple sessions
- the current thread lost useful context
- a worktree or branch handoff happened
- a human wants Codex to continue from a saved task journal

## Input expectations

- `AGENTS.md`
- the relevant Task Card, task journal, and `debug.md` when debug mode is active
- the current diff, changed files, and nearby tests
- `.codex/config.toml` only if the repo already keeps one

## Execution steps

**Recovery priority** (trust in this order):
1. Code and diff (source of truth)
2. Task Card (goal, scope, acceptance criteria)
3. Journal (decisions, attempts, evidence, next step)
4. `debug.md` when in debug mode
5. `blockers.md` when blocked

1. Read `AGENTS.md`, the Task Card, `debug.md` when debug mode is active, and the task journal if the repository keeps them.
2. **Restore plan mode state** (if plan mode fields present):
   - Read Epic Card and `blockers.md`
   - Restore `attempt_count`, `failed_attempt_count`, `same_direction_retry_count`, `last_new_evidence`
   - Identify current blockers and their types (missing-spec, missing-repro, etc.)
   - If task is in `blocked-needs-user` or `replanning` state, report this before proposing next steps
3. Inspect the current diff, changed files, and nearby tests to recover the true state of the work.
4. Reconstruct the accepted goal, scope, mode, root-cause status, acceptance criteria, verification gate.
5. **Call out any drift** between the saved notes and the actual code, including:
   - Missing attempt history
   - Undocumented retries
   - State mismatches (e.g., task marked `in-progress` but failure budget exceeded)
6. **Check failure budget before proposing next step**:
   - If budget exceeded, propose escalation, not implementation
   - If structural issues found in diff, flag for `replanning`
   - If blocked, restate what information is needed
7. Propose the next smallest safe step, respecting current state and constraints.

## Output format

- reconstructed intent summary
- restored plan mode state:
  - attempt history (attempt_count, failed_count, same_direction_retries)
  - current blocker state and missing information
  - task status and whether continuation is allowed
- drift found or not found (including state mismatches)
- next bounded step (or escalation if blocked/budget exceeded)
- current mode, root-cause status, and structural check status
- verification to run after that step
- risks or missing context that still matter

## Prohibited

- blindly trusting stale notes over the code
- widening scope just because the task was resumed
- claiming the task is ready to merge without a fresh `change-check`
