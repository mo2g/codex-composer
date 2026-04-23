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

- Reconstruct intent from `AGENTS.md`, the Task Card, `debug.md` when active, the journal, the diff, and nearby tests in that order.
- Call out drift before proposing the next step.
- If the journal is stale, repair the journal after the code truth is understood.
