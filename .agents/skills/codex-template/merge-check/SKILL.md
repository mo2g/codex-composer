---
name: merge-check
description: Assess scope, verification evidence, and residual risk, then give a clear manual merge recommendation.
---

# Merge Check

## When to use

- implementation is complete and ready for a final gate
- the diff, tests, and docs need a merge-readiness review
- a human wants a go or no-go recommendation before merge

## Input expectations

- `AGENTS.md`
- `.codex/config.toml`
- the diff and verification results
- known risks, reviewer findings, and open follow-ups

## Execution steps

1. Confirm the change matches the approved scope.
2. Check that relevant verification ran and passed.
3. Identify residual risk, missing docs, or missing tests.
4. Return a clear go or no-go recommendation for manual merge.

## Output format

- merge recommendation
- verification evidence summary
- blockers or residual risks
- reminder that merge is manual

## Prohibited

- merging on behalf of the user
- approving when verification evidence is missing
- hiding unresolved risk behind vague language
