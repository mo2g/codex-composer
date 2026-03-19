---
name: merge-check
description: Evaluate merge readiness based on scope, verification evidence, and review risk. Provide a clear go/no-go recommendation; humans perform the merge.
---

# Merge Check

## When to use

- implementation is complete and ready for merge-readiness review
- verification results and diff scope need final gate review
- the user wants a go/no-go recommendation before manual merge

## When not to use

- work is still being implemented
- acceptance criteria are not yet settled
- the user asks for automatic merge execution

## Inputs

- `AGENTS.md`
- `.codex/config.toml`
- branch diff and verification outputs
- reviewer findings and known risks

## Outputs

- explicit go/no-go merge recommendation
- scope/risk checklist result
- remaining blockers (if any)
- post-merge verification reminder

## Allowed actions

- inspect diffs, tests, and review evidence
- identify boundary drift and regression risk
- request focused fixes before merge when needed

## Forbidden actions

- run merge commands on behalf of the user
- mark ready when verification evidence is missing
- hide unresolved risk behind vague approval

## Minimal example

```text
Use the merge-check skill to assess scope, test evidence, and residual risk, then give a clear go/no-go recommendation for manual merge.
```
