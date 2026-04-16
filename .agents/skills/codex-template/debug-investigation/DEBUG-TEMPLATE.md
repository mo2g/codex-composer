# Debug Template

Use this file for non-trivial debugging work where root cause is not yet confirmed.

Suggested path:

```text
docs/_codex/<task-slug>/debug.md
```

## Rules

- Keep code truth above note truth.
- List hypotheses before patching.
- One experiment should target one hypothesis.
- Prefer probes, assertions, logging, and minimal toggles over broad fixes.
- If one direction fails twice without new support, re-rank hypotheses.

## Template

```md
# Debug Record: <task-slug>

- Status: investigating | root-cause-confirmed | fixing | verified
- Last updated: <YYYY-MM-DD HH:MM TZ>
- Related Task Card: <path>

## Symptom

- Observed behavior:
- Repro shape:
- Frequency:
- Known triggers:
- Known non-triggers:

## Hypothesis table

| Rank | Hypothesis | Supporting evidence | Contradicting evidence | Next experiment | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | <hypothesis> | <evidence> | <evidence> | <experiment> | open |
| 2 | <hypothesis> | <evidence> | <evidence> | <experiment> | open |

## Experiments

### E1
- Target hypothesis:
- Purpose:
- Change made:
- Why this is attributable:
- Result:
- Evidence added:
- Conclusion:

## Current leading hypothesis

- <current best explanation>

## Confirmed root cause

- <fill only when confirmed>

## Fix plan

- <smallest fix that directly targets the confirmed cause>

## Verification after fix

- <targeted checks>

## Notes

- <important observations>
```
