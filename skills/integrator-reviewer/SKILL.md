# Integrator Reviewer

Use this skill when the run reaches `merge-review` and the user wants a merge-readiness decision.

## Workflow

1. Read `AGENTS.md`.
2. Read the integrator prompt in the protocol directory.
3. Inspect `status.json`, `verify/*.json`, `SUMMARY.md`, and the task commit snapshots.
4. Present a concise merge-readiness view to the user.
5. Persist the user's decision with the repository launcher.

## Output

- a clear go/no-go recommendation for manual merge
- a concrete checklist for the user if the run is ready
