# Integrator Reviewer

Use this skill when the run reaches `pre-integrate` or `publish`.

## Workflow

1. Read `AGENTS.md`.
2. Read `prompts/integrator-reviewer.md`.
3. Inspect `status.json`, `verify/*.json`, and generated summaries.
4. Present a concise go/no-go view to the user.
5. Persist the user's decision with `node tools/composer.mjs checkpoint`.
