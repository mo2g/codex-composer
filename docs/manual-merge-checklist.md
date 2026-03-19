# Manual Merge Runbook

Run the `integrator-reviewer` skill in the current Codex thread before using this runbook.

Use this runbook for both parallel A/B runs and serial runs. In serial mode, treat "enabled tasks" as the single approved task branch.

## Entry Gate

Proceed only if all of the following are already true:

- `integrator-reviewer` returned an explicit go / allow result for the current `merge-review`
- every enabled task has `verify` status `passed`
- every enabled task has a recorded `commit_sha`, `commit_message`, and `changed_files` snapshot in `status.json`
- if a task has multiple follow-up commits, `commit_history` still lines up with the latest snapshot fields
- required artifacts are present under `.codex/local/runs/<run-id>/`, including `PLAN.md`, `status.json`, task briefs in `tasks/`, and verify reports in `verify/`

If any item is missing, do not record or act on `allow_manual_merge`. Stay in `merge-review` or send the failing task back with `return_a` or `return_b`.

## App Review Before Merge

Use Codex App's review surface before you touch git:

1. Open the review pane on the merge-ready branch diff or on the integration target diff you are about to land.
2. Confirm the diff still matches the approved task boundary and does not include scope creep, opportunistic cleanup, or unrelated cherry-picks.
3. If something looks ambiguous, add inline comments or use `/review` to force a more explicit review pass.
4. Resolve any review findings in the current Codex thread before merge.
5. Only continue when the review result and the approved plan still agree.

If you are not in the App review pane, perform the equivalent human diff review before continuing.

## Pre-Merge Evidence Review

Check the evidence explicitly instead of inferring readiness:

1. Open `.codex/local/runs/<run-id>/status.json` and confirm enabled tasks, verification state, and commit snapshots all line up.
2. Open the relevant verify reports under `.codex/local/runs/<run-id>/verify/` and confirm they match the task branches you are about to merge.
3. Re-check `PLAN.md` and the task briefs under `.codex/local/runs/<run-id>/tasks/` to confirm the merged scope still matches the approved plan.
4. Confirm there is no hidden dependency, overlap, or "fix it during merge" note that should have sent the run back to `merge-review`.

## Merge Order Decision

Decide the merge order before you run any merge command:

1. Single-task run: there is no ordering decision; merge the one approved task branch.
2. Parallel A/B with a real dependency: merge the depended-on branch first.
3. Parallel A/B where one branch is primary implementation and the other is docs/tests-only follow-up: merge implementation first, then docs/tests.
4. Parallel A/B that still look independent: choose a deterministic order, starting with the lower-risk branch.
5. If review or evidence inspection reveals overlap, hidden dependency, or shared high-risk files, stop and return to `merge-review` instead of improvising an order.

## Manual Merge Execution

Only the human operator performs the merge:

1. Check out the intended integration target and confirm the worktree is clean.
2. Merge only the verified and committed task branches that belong to this run.
3. Use normal `git merge` commands; Codex Composer and `integrator-reviewer` do not merge for you.
4. Do not treat `allow_manual_merge` as permission to expand scope, resolve unrelated debt, or fold in extra changes while merging.
5. If a merge conflict exposes hidden overlap or scope drift, stop the merge, return to the current Codex thread, and re-run review instead of improvising.

## Post-Merge Gates

After the human merge, the run is still not complete:

1. Run `./codex-composer verify --run <run-id> --target main`
2. If main verification fails, stop and fix the branch through the normal thread workflow before treating the run as complete.
3. When main verification passes, run `./codex-composer summarize --run <run-id>`
4. Confirm `.codex/local/runs/<run-id>/SUMMARY.md` exists and reflects the final approved mode, task commits, and merged outputs.
5. Confirm `.codex/local/runs/<run-id>/PR_BODY.md` exists and is ready for handoff or PR usage.
6. Confirm verify outputs, commit evidence, and other run artifacts under `.codex/local/runs/<run-id>/` are still present and readable.
7. If your workflow expects a final handoff artifact, check that the generated summary and run outputs are the exact deliverables you plan to share.

## No-Go / Stop Conditions

Stop and return to the current Codex thread if any of the following occur:

- `integrator-reviewer` did not give a clear go / allow result
- any required evidence or artifact is missing
- App review or human diff review finds unexpected overlap, hidden dependency, or scope creep
- merge conflict reveals task-boundary drift
- `verify --target main` fails
- `SUMMARY.md`, `PR_BODY.md`, or other required run outputs are missing or incomplete
