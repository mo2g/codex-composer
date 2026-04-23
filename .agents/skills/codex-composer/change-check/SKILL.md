---
name: change-check
description: Build verification evidence for a change, strengthen direct tests when needed, and suggest a commit message without taking merge responsibility.
---

# Change Check

## When to use

- implementation is complete or close enough for a final evidence pass
- the diff may need new or stronger tests
- a human needs verification evidence and commit guidance before commit or manual merge

## Input expectations

- `AGENTS.md`
- `.codex/config.toml` if the repo already keeps optional verification hints there
- the approved scope or plan
- the Task Card, task journal, and `debug.md` when debug mode is active
- the diff, changed files, nearby tests, and repo manifests or tool configs

## Execution steps

1. Inspect the diff, changed files, and nearby tests to decide whether behavior changed.
2. Reconstruct the acceptance criteria and verification gate from the approved plan or Task Card.
3. Add or update the most direct tests you can justify when coverage is missing.
4. Detect the stack and the best-fit verification commands from the repo, then use `.codex/config.toml` hooks only as optional hints or overrides.
5. Run the narrowest reliable verification first, expand only when the repo or risk requires it, and report any remaining gaps.
6. For debug tasks, confirm which hypothesis became the root cause, which hypotheses were ruled out, and whether the fix targets cause rather than only symptoms.
7. Map each acceptance criterion to direct evidence, a remaining gap, or an explicit risk.
8. **Perform structural checks with state implications**:
   - Check function length (>100 lines), file growth (>200 lines), circular dependencies, layer mixing, god functions
   - **Hard fail**: If any hard fail condition met, set task status to `replanning`, document violation, require replan before continuing
   - **Soft fail**: If minor issues found, document as residual risk in acceptance evidence, require explanation in Task Card `structure_impact`
9. Verify failure budget tracking is current; if budget exceeded, flag for immediate escalation.
10. Return verification evidence, structural check results, residual risks, and one preferred git commit message plus optional alternates.

## Output format

- verification evidence summary
- debug closure summary when applicable
- acceptance criteria coverage with evidence or gaps
- structural check results (pass/hard fail/soft fail with details)
- failure budget status (current/max attempts, same-direction retries)
- recommended state transition (continue, replanning, blocked-needs-user)
- tests added, updated, or still missing
- residual risks or unverified areas
- preferred git commit message
- optional alternate commit messages
- reminder that merge stays manual

## Prohibited

- merging on behalf of the user
- using a checklist as a substitute for real verification
- claiming a debug fix is verified when the evidence only shows a symptom changed
- claiming the change is verified when no reliable command or test path could be inferred
