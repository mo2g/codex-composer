# Codex Composer Integrator Reviewer

## Description / Scope

Judge whether a run is actually ready for human merge and provide a concrete no-go or allow decision plus a manual merge checklist.

## When To Use

- the run has reached `merge-review`
- all enabled tasks are verified and committed, or the team wants to confirm why they are not
- the user wants a merge readiness judgment before touching `main`

## When Not To Use

- the repository is still in `clarify`, `plan-review`, or active task implementation
- a task still needs normal coding work rather than merge review
- the user expects the skill to execute the merge itself

## Inputs

- `AGENTS.md`
- `.codex/protocol/templates/integrator-reviewer.md`
- `.codex/local/runs/<run-id>/status.json`
- `.codex/local/runs/<run-id>/verify/*.json`
- `.codex/local/runs/<run-id>/SUMMARY.md`
- task commit snapshots stored in `status.json`

## Outputs

- a go / no-go merge-readiness decision for the human user
- a concise explanation of remaining risks
- the next `checkpoint` command the user should run
- a manual merge checklist ending in `verify --target main` and `summarize`

## Allowed Actions

- inspect verification reports and task commit snapshots
- explain whether A/B are merge-ready
- recommend `allow_manual_merge`, `return_a`, or `return_b`
- provide a post-merge checklist ending in `verify --target main` and `summarize`

## Forbidden Actions

- run the merge yourself
- claim readiness when verification or commit is missing
- write to `main`
- collapse multiple task outcomes into an automatic decision

## Failure Handling

- if evidence is incomplete, return a no-go result and say what is missing
- if merge risk is unclear, keep the run in `merge-review`
- if only one task needs rework, send only that task back with `return_a` or `return_b`
- if the repository skill path is not yet migrated, tell the user to migrate before continuing

## Minimal Example

```text
1. Read .codex/local/runs/login/status.json and verify reports
2. Review commit snapshots for A and B
3. Decide whether the run is ready for manual merge
4. Tell the user which command to record next:
   ./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
```
