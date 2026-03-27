# Codex App Template

This repository is configured for Codex app with a lightweight workflow.

## Repository Map

- `AGENTS.md`: repository-level collaboration rules
- `.codex/config.toml`: project defaults and optional verification hints
- `.agents/skills/codex-template/`: reusable `planner`, `implementer`, and `change-check` skills
- `docs/codex-quickstart.md`: quickstart guidance for Codex app

## Working Rules

1. Use `planner` before implementing non-trivial work.
2. Keep each change scoped and reviewable.
3. Stay in the current thread by default. Use a new Codex thread or worktree only when the work is independently reviewable and isolation will reduce risk.
4. Use `change-check` before commit or manual merge when scope or risk is non-trivial.
5. Treat `.codex/config.toml` hooks as optional hints or overrides. Verify against the actual code, tests, and toolchain.
6. A human decides commit and merge after the evidence is clear.

## Definition Of Done

- Changes are within approved scope.
- Relevant verification has passed.
- Risks and follow-ups are called out.
- Docs or skills are updated when the workflow changes.
- Merge remains a human decision.
