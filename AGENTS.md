# Codex App Template Source Repository

This repository is the source template for a lightweight Codex App workflow.

## Quick Start

**New to this repo?** Read `docs/codex-quickstart.md` first.

**Making changes?** Run `npm test` after any template/skill/docs edits.

## Repo Layout

```
├── docs/codex-quickstart.md          # Start here
├── docs/codex-task-card-workflow.md  # Canonical workflow spec
├── docs/codex-debug-workflow.md      # Debug mode spec
├── .agents/skills/codex-template/    # Skills (planner, implementer, etc.)
└── test/                             # Contract tests
```

## Source Of Truth

If wording conflicts, defer to (in order):
1. `docs/codex-task-card-workflow.md`
2. `docs/codex-debug-workflow.md`
3. `docs/workflow-sync-rules.md`

## Skills

- `planner` — bound scope and acceptance criteria
- `implementer` — execute approved change
- `change-check` — verify and write evidence
- `resume-work` — recover context after interruption
- `debug-investigation` — debug unknown root cause
- `task-orchestrator` — plan mode scheduler

## Working Rules

- Start non-trivial work with `planner` skill
- Keep merge manual after verification
- Run `npm test` before committing template changes