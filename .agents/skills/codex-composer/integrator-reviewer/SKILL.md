# Codex Composer Integrator Reviewer

## Description / Scope

Repo-native merge-readiness skill for Codex Composer. Use it after A and B have been verified and committed to decide whether the user should record `allow_manual_merge`, send one task back with `return_a` or `return_b`, or keep the run in `merge-review`.

## When To Use

- the run has reached `merge-review`
- all enabled tasks are verified and committed, or the team wants to confirm why they are not
- the user wants a merge readiness judgment before touching `main`
- the user wants a human-readable allow / no-go answer backed by verification evidence

## When Not To Use

- the repository is still in `clarify`, `plan-review`, or active task implementation
- a task still needs normal coding work rather than merge review
- the user expects the skill to execute the merge itself
- the user wants to expand task scope or change the plan itself

## Inputs

- the active run id
- `AGENTS.md`
- `.codex/local/runs/<run-id>/status.json`
- `.codex/local/runs/<run-id>/verify/*.json`
- `.codex/local/runs/<run-id>/SUMMARY.md`
- task commit snapshots stored in `status.json`
- optional runtime scaffolding from `.codex/protocol/templates/integrator-reviewer.md`

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
- keep the current thread focused on evidence and readiness, not implementation

## Forbidden Actions

- run the merge yourself
- claim readiness when verification or commit is missing
- write to `main`
- collapse multiple task outcomes into an automatic decision
- hide missing evidence behind a vague "probably okay"

## Failure Handling

- if evidence is incomplete, return a no-go result and say what is missing
- if merge risk is unclear, keep the run in `merge-review`
- if only one task needs rework, send only that task back with `return_a` or `return_b`
- if the repository skill path is not yet migrated, tell the user to migrate before continuing
- if the user asks for the actual merge, stop at the checklist and hand control back to the human operator

## Minimal Example

```text
Recommended prompt:
"Use the repo's integrator-reviewer skill for run `login`. Inspect status, verify reports, and commit snapshots, then tell me whether to record `allow_manual_merge`, `return_a`, or `return_b`."

Expected behavior:
1. Review status, verify evidence, and task commit snapshots
2. State a clear allow / no-go judgment
3. If no-go, say exactly which task or evidence is missing
4. If go, point the user to:
   ./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
5. End with the manual merge checklist, `verify --target main`, and `summarize`
```
