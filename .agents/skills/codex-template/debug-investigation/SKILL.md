---
name: debug-investigation
description: Investigate non-deterministic or unclear bugs with explicit hypotheses, minimal experiments, externalized evidence, and forced hypothesis re-ranking.
---

# Debug Investigation

## When to use

- race conditions
- flaky tests
- intermittent failures
- timing-sensitive regressions
- unclear root cause bugs
- repeated failed fix attempts without confirmed cause

## Input expectations

- `AGENTS.md`
- the current Task Card
- the current diff and nearby tests
- `debug.md` when one already exists
- logs, traces, screenshots, or repro notes when available

## Required operating rules

1. Do not patch blindly before writing hypotheses.
2. Every experiment must target exactly one hypothesis.
3. Keep experimental changes as small and attributable as possible.
4. Externalize every observation, experiment result, and conclusion into `debug.md`.
5. If the same hypothesis direction fails twice without new supporting evidence, stop and re-rank hypotheses.

## Execution steps

1. Restate the symptom, repro shape, and current uncertainty.
2. Create or refresh `debug.md` using `DEBUG-TEMPLATE.md`.
3. Write a ranked hypothesis table before changing code.
4. Choose the highest-value unresolved hypothesis.
5. Run the smallest useful experiment that can add or remove evidence for that hypothesis.
6. Record the result in `debug.md`.
7. Re-rank the hypothesis table.
8. Only after root cause is confirmed, move from experiment mode to fix mode.

## Output format

- symptom summary
- ranked hypotheses
- experiment run
- evidence added
- leading hypothesis or confirmed root cause
- next smallest step

## Prohibited

- large speculative fixes before a hypothesis table exists
- multi-variable experiments
- relying on conversational memory instead of repository artifacts
- calling a bug fixed when only the symptom changed and root cause is still unconfirmed
