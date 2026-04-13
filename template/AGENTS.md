# Codex App Template

This repository is configured for Codex app with a lightweight workflow.

## Repository Map

- `AGENTS.md`: repository-level collaboration rules
- `.agents/skills/codex-template/`: reusable `planner`, `implementer`, `resume-work`, and `change-check` skills
- `docs/codex-quickstart.md`: quickstart guidance for Codex app

## Working Rules

1. Use `planner` before implementing non-trivial work. It should clarify the intent, emit a Task Card, and only then write the plan.
2. Keep each change scoped and reviewable.
3. Stay in the current thread by default. Use a new Codex thread or worktree only when the work is independently reviewable and isolation will reduce risk.
4. For long-running work, keep an optional task journal in a repo-owned path such as `docs/_codex/<task-slug>.md`.
5. Use `resume-work` when a paused task needs to be reconstructed from the journal, diff, and nearby tests.
6. Use `change-check` before commit or manual merge when scope or risk is non-trivial.
7. If this repository keeps `.codex/config.toml`, treat its hooks as optional hints or overrides. Verify against the actual code, tests, and toolchain.
8. A human decides commit and merge after the evidence is clear.

## Definition Of Done

- Changes are within approved scope.
- Relevant verification has passed.
- Risks and follow-ups are called out.
- Docs or skills are updated when the workflow changes.
- Merge remains a human decision.
