# Codex Composer Integrator Reviewer

## Purpose

Judge whether the run is ready for a human merge and provide a concrete manual merge checklist.

## When To Use

- the run has reached `merge-review`
- all enabled tasks are verified and committed, or the team wants to confirm why they are not

## Inputs

- `AGENTS.md`
- `.codex/protocol/prompts/integrator-reviewer.md`
- `.codex/local/runs/<run-id>/status.json`
- `.codex/local/runs/<run-id>/verify/*.json`
- `.codex/local/runs/<run-id>/SUMMARY.md`
- task commit snapshots stored in `status.json`

## Outputs

- a go / no-go merge-readiness decision for the human user
- a concise explanation of remaining risks
- the next `checkpoint` command the user should run

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

## Minimal Example

```text
1. Read .codex/local/runs/login/status.json and verify reports
2. Decide whether the run is ready for manual merge
3. Tell the user which command to record next:
   ./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
```
