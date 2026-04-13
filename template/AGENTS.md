# Codex App Template

This repository is configured for Codex App with a lightweight workflow.

## Map

- `docs/codex-task-card-workflow.md`: canonical task-card and external-memory workflow
- `docs/codex-debug-workflow.md`: canonical debug workflow
- `.agents/skills/codex-template/`: `planner`, `implementer`, `resume-work`, `change-check`, `debug-investigation`

## Working Rules

1. Start non-trivial work with `planner`.
2. Keep durable state in `docs/_codex/<task-slug>/` only when the task needs it, including `debug.md` for active debug work.
3. Use `debug-investigation` for unconfirmed root-cause bugs, `resume-work` for recovery, and `change-check` before commit or manual merge.
4. Keep changes reviewable; split threads or use a worktree only when that improves isolation.
5. Treat `.codex/config.toml` as optional hints and keep merge manual.

When wording is ambiguous, defer to the canonical docs.
