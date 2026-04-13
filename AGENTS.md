# Codex App Template Source Repository

This repository is the source template for installing a lightweight Codex App workflow into other repositories.

## Repository Map

- `README.md`: source-repo overview and bootstrap entrypoint
- `docs/codex-task-card-workflow.md`: canonical task-card and external-memory workflow
- `docs/codex-debug-workflow.md`: canonical debug workflow
- `docs/workflow-sync-rules.md`: sync rules for workflow surfaces
- `.agents/skills/codex-template/`: reusable workflow skills and templates
- `template/`: installed repository files
- `tools/`: installer logic and contract constants
- `test/`: installer and workflow contract tests

## Commands

- `npm install`
- `npm test`

## Workflow Map

- Keep this file short. Put detailed workflow rules in `docs/` and skill assets.
- Use `planner` for non-trivial work before coding.
- Use `implementer` for the approved bounded change.
- Use `resume-work` when a task is resumed from weak or stale context.
- Use `change-check` for the final evidence pass before commit or manual merge.
- Use `debug-investigation` when root cause is still unconfirmed.

For non-trivial or long-running work, prefer repository artifacts over chat-only state:

```text
docs/_codex/<task-slug>/
  task-card.md
  journal.md
  acceptance-evidence.md
  debug.md   # only for active debug work
```

## Constraints

1. Keep `Codex App Template` and `codex-template` consistent across docs, skills, scripts, tests, and installed assets.
2. Keep `template/`, `docs/`, `.agents/skills/codex-template/`, installer logic, and tests aligned.
3. Keep installed repositories lightweight by default; `.codex/config.toml` remains optional repo-owned configuration, not a required install artifact.
4. Preserve the task-card, external-memory, and debug-aware workflow without adding a repo-local protocol or state machine.
5. Keep merge manual after verification and review.

## Source Of Truth

When wording conflicts, defer to:

- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`
- `docs/workflow-sync-rules.md`

## Done

- Scope stays bounded.
- `npm test` passes.
- Docs, skills, template assets, and tests describe the same workflow contract.
- Risks and follow-ups are called out.
- Merge remains a human action.
