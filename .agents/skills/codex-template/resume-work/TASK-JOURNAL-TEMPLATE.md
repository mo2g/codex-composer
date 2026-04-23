# Task Journal Template

Use this journal when work spans sessions, threads, or worktrees. Treat the code and diff as source of truth; the journal exists to make recovery cheaper, not to override reality.

## Rules

- Keep the journal short and current.
- Update it after meaningful decisions, verification, or handoffs.
- Remove stale assumptions once the code disproves them.
- Prefer one journal per Task Card.

## Template

```md
# Task Journal: <task-slug>

- Linked Task Card: <path-or-inline-reference>
- Status: planned | in-progress | verifying | blocked-needs-user | blocked-needs-evidence | replanning | done | abandoned
- Branch/worktree: <branch-or-worktree-name>
- Last updated: <YYYY-MM-DD HH:MM TZ>

## Reconstructed intent

- Goal: <current accepted goal>
- Scope boundary: <what still belongs to this card>
- Mode: <implementation | debug>
- Root-cause status: <n/a | unconfirmed | confirmed>
- Verification gate: <what still has to pass>

## Current code truth

- Changed files:
  - <path>
  - <path>
- Current diff summary:
  - <what is already implemented>
  - <what is partial or still missing>

## Drift check

- Notes still match code: yes | no
- Drift found:
  - <stale note or invalid assumption>
- Correction:
  - <what changed in reality>

## Decisions

- <decision and rationale>
- <decision and rationale>

## Attempts

| # | Approach | Result | New Evidence? |
|---|----------|--------|---------------|
| 1 | <what was tried> | <outcome> | yes / no |
| 2 | <what was tried> | <outcome> | yes / no |

## Evidence Gained

- <confirmed facts we learned>
- <hypotheses ruled out>
- <boundaries discovered>

## Dead Ends

- <approach that was tried and abandoned>
- <hypothesis that was disproven>

## Open Questions

- <question that needs answer before proceeding>
- <uncertainty that affects the approach>

## Verification evidence

- <command>: <result>
- <command>: <result>

## Risks or blockers

- <risk or blocker>

## Next smallest step

- <single next implementation or verification step>

## Handoff note

- <what the next Codex thread or human needs to know>
```

## Notes For Resume Work

**Recovery priority order**:
1. Code and diff (source of truth)
2. Task Card (goal, scope, acceptance criteria)
3. Journal (decisions, attempts, evidence, next step)
4. `debug.md` when in debug mode
5. `blockers.md` when blocked

**Required fields for long-running work resumability:**

When updating the journal, always record:
- **Current status**: `in-progress` / `verifying` / `blocked-*` / `replanning`
- **Last action**: what you just did
- **Last verification**: what ran and the result
- **Failure budget**: `attempt_count`, `failed_count`, `same_direction_retries`
- **Next smallest step**: the single next action
- **Blockers** (if any): what's needed to unblock

**When to update the journal:**
- After every implementation attempt (success or failure)
- After every verification run
- When switching from `implementer` to `change-check` or vice versa
- When a task becomes blocked
- When receiving user input that unblocks work
- Before any handoff (thread split, worktree, human review)

**Drift handling:**
- If code contradicts journal, trust the code
- Call out drift explicitly in "Drift check" section
- Repair the journal to match code truth
- Never continue from stale assumptions
