# Codex App Template Source Repository

This repository is the source template for installing a lightweight Codex App workflow into other repositories.

## Map

- `README.md`: source-repo overview and bootstrap entrypoint
- `docs/codex-task-card-workflow.md`: canonical task-card and external-memory workflow
- `docs/codex-debug-workflow.md`: canonical debug workflow
- `docs/workflow-sync-rules.md`: sync rules for workflow surfaces
- `.agents/skills/codex-template/`: reusable core skills and templates
- `template/`: installed repository files
- `tools/`: installer logic and contract constants
- `test/`: installer and workflow contract tests

## Core Skills

- `planner`
- `implementer`
- `resume-work`
- `change-check`
- `debug-investigation`

## Working Rules

- Keep this file short. Put detailed workflow rules in `docs/` and skill assets.
- Keep `template/`, `docs/`, `.agents/skills/codex-template/`, installer logic, and tests aligned.
- Preserve the task-card, external-memory, and debug-aware workflow without adding a repo-local protocol or state machine.
- Keep installed repositories lightweight by default; `.codex/config.toml` remains optional and repo-owned.
- Keep merge manual after verification and review.

For non-trivial or long-running work, prefer repository artifacts over chat-only state:

```text
docs/_codex/<task-slug>/
  task-card.md
  journal.md
  acceptance-evidence.md
  debug.md   # only for active debug work
```

## Source Of Truth

When wording conflicts, defer to:

- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`
- `docs/workflow-sync-rules.md`
