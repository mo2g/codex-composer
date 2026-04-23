# Codex App Template

This repository is configured for Codex App with a lightweight workflow.

## Map

- `docs/codex-task-card-workflow.md`: canonical task-card and external-memory workflow
- `docs/codex-debug-workflow.md`: canonical debug workflow
- `docs/codex-quickstart.md`: first-pass and default loop
- `.agents/skills/codex-template/`: reusable workflow skills

Plan mode adds `task-orchestrator` for coordinating multiple Task Cards through an Epic Card.

## Codex Best Practices (in Task Cards)

Task Cards should include these fields for optimal Codex execution:

- **Verification commands**: Specific commands to run (tests, typecheck, lint)
- **Done criteria**: Checklist for when the task is truly complete
- **Review expectations**: What reviewers should focus on and safe merge conditions

## Working Rules

1. Start non-trivial work with `planner`.
2. Use `docs/_codex/<task-slug>/` only when the task needs durable state; keep `debug.md` only for active debug work.
3. Use `debug-investigation` for unconfirmed root cause, `resume-work` for recovery, and `change-check` before commit or manual merge.
4. Stay in the current thread by default; split thread or worktree only when reviewability or isolation clearly improves.
5. Treat `.codex/config.toml` as optional hints and keep merge manual.

When wording is ambiguous, defer to `docs/codex-quickstart.md` first, then the canonical docs.
