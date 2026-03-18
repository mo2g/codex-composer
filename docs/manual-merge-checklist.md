# Manual Merge Checklist

Before merging A/B into your chosen target:

1. Confirm every enabled task has `verify` status `passed`
2. Confirm every enabled task has a recorded `commit_sha`
3. Confirm the integrator-reviewer outcome is allow/go, not no-go
4. Re-check task boundaries and note any last-minute overlap risk
5. Merge branches manually with normal git commands
6. After merge, run `./codex-composer verify --run <run-id> --target main`
7. After main verification passes, run `./codex-composer summarize --run <run-id>`
8. Ensure the final `SUMMARY.md` and `PR_BODY.md` are present under `.codex/local/runs/<run-id>/`
