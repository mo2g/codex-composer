# Manual Merge Checklist

Run the `integrator-reviewer` skill in the current Codex thread before using this checklist.

Use this checklist for both parallel A/B runs and serial runs. In serial mode, treat "enabled tasks" as the single approved task branch.

## Before merge

- [ ] `integrator-reviewer` has already given an explicit allow/go outcome for the current `merge-review`, not a no-go or "needs more evidence" result
- [ ] every enabled task has `verify` status `passed`
- [ ] every enabled task has a recorded `commit_sha`, `commit_message`, and `changed_files` snapshot in `status.json`
- [ ] required evidence is present under `.codex/local/runs/<run-id>/`, including `PLAN.md`, `status.json`, task briefs in `tasks/`, and verify reports in `verify/`
- [ ] the approved task boundaries still match the current branches; there is no scope creep, no extra cherry-pick, and no unreviewed "while I am here" change
- [ ] if one branch now depends on another, the dependency has been called out explicitly before merge
- [ ] if both A and B exist, choose the merge order before touching git:
- [ ] merge the dependency first when one task depends on the other
- [ ] merge implementation before docs/tests-only follow-up when one branch is clearly primary
- [ ] skip special ordering only when the branches are still truly independent
- [ ] the target branch is the intended human merge target and is clean before starting manual merge commands

## Merge execution

- [ ] perform the merge manually with normal `git merge` commands; Codex Composer and `integrator-reviewer` do not merge for you
- [ ] do not treat `allow_manual_merge` as permission to expand scope or resolve unrelated branch debt during merge
- [ ] if merge conflicts expose hidden overlap or scope drift, stop the merge, return to the current Codex thread, and re-run review instead of improvising
- [ ] if the run is parallel A/B, merge only the verified and committed task branches that belong to this run

## After merge

- [ ] run `./codex-composer verify --run <run-id> --target main`
- [ ] do not consider the run complete until `verify --target main` passes
- [ ] run `./codex-composer summarize --run <run-id>` after main verification passes
- [ ] confirm `.codex/local/runs/<run-id>/SUMMARY.md` exists and reflects the final approved mode, task commits, and merged outputs
- [ ] confirm `.codex/local/runs/<run-id>/PR_BODY.md` exists and is ready for handoff or PR usage
- [ ] confirm verify outputs, commit evidence, and other run artifacts under `.codex/local/runs/<run-id>/` are still present and readable
- [ ] if your workflow expects a final handoff artifact, check that the generated summary and run outputs are the exact deliverables you plan to share
