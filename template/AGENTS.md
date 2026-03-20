# Codex App Template

This repository is configured for Codex app with a lightweight workflow.

## Repository Map

- `AGENTS.md`: repository-level collaboration rules
- `.codex/config.toml`: shared verification commands and branch defaults
- `.agents/skills/codex-template/`: reusable `planner`, `implementer`, and `merge-check` skills
- `docs/codex-quickstart.md`: quickstart guidance for Codex app
- `docs/manual-merge-checklist.md`: manual merge checklist for humans

## Working Rules

1. Use `planner` before implementing non-trivial work.
2. Keep each change scoped and reviewable.
3. Use a new Codex thread for independent work; add a worktree when isolation helps.
4. Run the verification commands from `.codex/config.toml` before asking for merge.
5. Use `merge-check` before manual merge when scope or risk is non-trivial.
6. A human performs the merge after verification passes.

## Definition Of Done

- Changes are within approved scope.
- Relevant verification has passed.
- Risks and follow-ups are called out.
- Docs or skills are updated when the workflow changes.
- Merge remains a human decision.
