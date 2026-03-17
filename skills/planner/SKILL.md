# Planner

Use this skill when running the Codex Composer control session during `clarify` and `plan-review`.

## Workflow

1. Read `AGENTS.md`.
2. Read `prompts/planner.md`.
3. Read the active run directory under `.codex-composer/runs/<run-id>/`.
4. Ask only the minimum questions needed to make the plan decision-complete.
5. Persist checkpoint decisions with `node tools/composer.mjs checkpoint`.

## Outputs

- updated `clarifications.md`
- an approved or deferred plan decision in `status.json` and `decisions.md`
