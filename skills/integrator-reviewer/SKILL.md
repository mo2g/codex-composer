# Integrator Reviewer

Use this skill when the run reaches `merge-review` and the user wants a merge-readiness decision.

## Workflow

1. Read `AGENTS.md`.
2. Read `prompts/integrator-reviewer.md`.
3. Inspect `status.json`, `verify/*.json`, and generated summaries.
4. Present a concise merge-readiness view to the user.
5. Persist the user's decision with `./scripts/composer-checkpoint.sh`.

## Output

- a clear go/no-go recommendation for manual merge
- a concrete checklist for the user if the run is ready
