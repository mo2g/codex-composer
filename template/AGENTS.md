# Codex App Template

This repository is configured for Codex app with a lightweight workflow.

## Repository Map

- `AGENTS.md`: repository-level collaboration rules
- `.agents/skills/codex-template/`: reusable `planner`, `implementer`, `resume-work`, `change-check`, and `debug-investigation` skills
- `docs/codex-quickstart.md`: quickstart guidance for Codex app
- `docs/codex-task-card-workflow.md`: canonical task-card and external-memory workflow
- `docs/codex-debug-workflow.md`: canonical debug workflow

## Working Rules

1. Use `planner` before implementing non-trivial work. It should clarify the intent, emit a Task Card, and only then write the plan.
2. Keep each change scoped and reviewable.
3. Stay in the current thread by default. Use a new Codex thread or worktree only when the work is independently reviewable and isolation will reduce risk.
4. For long-running work, keep repository artifacts under `docs/_codex/<task-slug>/`, especially `task-card.md` and `journal.md`.
5. For unclear-root-cause bugs, use `debug-investigation` and keep `docs/_codex/<task-slug>/debug.md`.
6. Use `resume-work` when a paused task needs to be reconstructed from the artifacts, diff, and nearby tests.
7. Use `change-check` before commit or manual merge when scope or risk is non-trivial.
8. If this repository keeps `.codex/config.toml`, treat its hooks as optional hints or overrides. Verify against the actual code, tests, and toolchain.
9. Use `docs/codex-task-card-workflow.md` and `docs/codex-debug-workflow.md` as the workflow source of truth.
10. A human decides commit and merge after the evidence is clear.

## Definition Of Done

- Changes are within approved scope.
- Relevant verification has passed.
- Risks and follow-ups are called out.
- Docs or skills are updated when the workflow changes.
- Merge remains a human decision.
