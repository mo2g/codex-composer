# Codex App Template

This repository is configured for Codex App with a lightweight workflow.

## Map

- `docs/codex-task-card-workflow.md`: canonical task-card and external-memory workflow
- `docs/codex-debug-workflow.md`: canonical debug workflow
- `docs/codex-quickstart.md`: first-pass and default loop
- `.agents/skills/codex-template/`: reusable workflow skills

## Working Rules

1. Start non-trivial work with `planner`.
2. Keep `docs/_codex/<task-slug>/` only when the task needs durable state.
3. Use `debug-investigation` for unconfirmed root cause, `resume-work` for recovery, and `change-check` before commit or manual merge.
4. Stay in the current thread by default; split thread or worktree only when isolation helps.
5. Treat `.codex/config.toml` as optional hints and keep merge manual.

When wording is ambiguous, defer to the canonical docs.
