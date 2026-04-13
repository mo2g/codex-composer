# Codex App Template

This repository is configured for Codex App with a lightweight workflow.

## Map

- `docs/codex-task-card-workflow.md`: canonical task-card and external-memory workflow
- `docs/codex-debug-workflow.md`: canonical debug workflow
- `.agents/skills/codex-template/`: `planner`, `implementer`, `resume-work`, `change-check`, `debug-investigation`

## Working Rules

1. Start non-trivial work with `planner`, then implement only the approved bounded change.
2. Keep one thread by default. Split threads or use a worktree only when that improves reviewability or isolation.
3. For long-running work, keep repository artifacts under `docs/_codex/<task-slug>/`.
4. For unclear-root-cause bugs, use `debug-investigation` and keep `debug.md` current.
5. Use `resume-work` to recover from repository artifacts, the diff, and nearby tests.
6. Use `change-check` before commit or manual merge, and keep merge manual.
7. Treat `.codex/config.toml` as optional hints, not the only verification truth.

When wording is ambiguous, defer to the canonical docs.
