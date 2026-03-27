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
- the diff, changed files, nearby tests, and repo manifests or tool configs

## Execution steps

1. Inspect the diff, changed files, and nearby tests to decide whether behavior changed.
2. Add or update the most direct tests you can justify when coverage is missing.
3. Detect the stack and the best-fit verification commands from the repo, then use `.codex/config.toml` hooks only as optional hints or overrides.
4. Run the narrowest reliable verification first, expand only when the repo or risk requires it, and report any remaining gaps.
5. Return verification evidence, residual risks, and one preferred git commit message plus optional alternates.

## Output format

- verification evidence summary
- tests added, updated, or still missing
- residual risks or unverified areas
- preferred git commit message
- optional alternate commit messages
- reminder that merge stays manual

## Prohibited

- merging on behalf of the user
- using a checklist as a substitute for real verification
- claiming the change is verified when no reliable command or test path could be inferred
