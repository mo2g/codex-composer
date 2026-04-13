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

1. Read `AGENTS.md`, the Task Card, `debug.md` when debug mode is active, and the task journal if the repository keeps them.
2. Inspect the current diff, changed files, and nearby tests to recover the true state of the work.
3. Reconstruct the accepted goal, scope, mode, root-cause status, acceptance criteria, and verification gate.
4. Call out any drift between the saved notes and the actual code.
5. Propose the next smallest safe step before editing, and say whether the task should stay in debug mode or can move into confirmed-cause fix work.

## Output format

- reconstructed intent summary
- drift found or not found
- next bounded step
- current mode and root-cause status
- verification to run after that step
- risks or missing context that still matter

## Prohibited

- blindly trusting stale notes over the code
- widening scope just because the task was resumed
- claiming the task is ready to merge without a fresh `change-check`
