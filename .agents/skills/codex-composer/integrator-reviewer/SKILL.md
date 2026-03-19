---
name: integrator-reviewer
description: Review merge readiness for verified, committed Codex Composer tasks in the current Codex thread. Inspect status, verify evidence, and commit snapshots, then recommend allow_manual_merge, return_a, or return_b without performing the merge.
---

# Codex Composer Integrator Reviewer

## When to use

- the run has reached `merge-review`
- all enabled tasks are verified and committed, or the team needs to confirm why they are not
- the user wants a merge-readiness judgment before touching `main`
- the user needs a human-readable go / no-go answer backed by verification evidence and commit snapshots

## When not to use

- the repository is still in `clarify`, `plan-review`, or active task implementation
- a task still needs normal coding work rather than merge review
- the user expects this skill to execute the merge
- the user wants to expand task scope or change the plan itself

## Inputs

- the active run id
- `AGENTS.md`
- `.codex/local/runs/<run-id>/status.json`
- `.codex/local/runs/<run-id>/verify/*.json`
- `.codex/local/runs/<run-id>/PLAN.md`
- task commit snapshots stored in `status.json`
- optional runtime scaffolding from `.codex/protocol/templates/integrator-reviewer.md`

## Outputs

- a go / no-go merge-readiness decision for the human user
- a concise explanation of remaining risks or missing evidence
- an explicit note about evidence completeness and whether App review should happen before merge
- a merge order suggestion when more than one branch is in play
- clear stop conditions for the human operator
- the next `checkpoint` command the user should run
- a manual merge runbook that ends with `verify --target main` and `summarize`

## Allowed actions

- inspect verification reports, task briefs, plan boundaries, and task commit snapshots
- explain whether A/B are merge-ready and whether scope still matches the approved plan
- call out when App review, inline comments, or a `/review` pass should happen before merge
- recommend `allow_manual_merge`, `return_a`, or `return_b`
- provide the merge order suggestion, stop conditions, and the required post-merge commands
- keep the current thread focused on evidence and readiness rather than implementation

## Forbidden actions

- run the merge yourself
- claim readiness when verification, commit evidence, or required artifacts are missing
- write to `main`
- collapse multiple task outcomes into an automatic decision
- hide missing evidence behind a vague "probably okay"

## Failure handling

- if evidence is incomplete, return a no-go result and say exactly what is missing
- if review is incomplete or the branch diff does not match the approved boundary, return a no-go result
- if merge risk is unclear, keep the run in `merge-review`
- if only one task needs rework, send only that task back with `return_a` or `return_b`
- if you are waiting on another thread or more evidence, report it once and stop instead of waiting or polling
- if the repository still uses deprecated protocol, skill, or config paths, tell the user to run `./codex-composer migrate`
- if the user asks for the actual merge, stop at the checklist and hand control back to the human operator

## Minimal example

```text
Recommended prompt:
"Use the repo's integrator-reviewer skill for run `login`. Inspect status, verify reports, commit snapshots, required artifacts, and merge prerequisites, then tell me whether to record `allow_manual_merge`, `return_a`, or `return_b`."

Expected behavior:
1. Review status, verify evidence, task commit snapshots, App review readiness, and merge prerequisites
2. State a clear allow / no-go judgment
3. If no-go, say exactly which task or evidence is missing and point the user to:
   ./codex-composer checkpoint --run login --checkpoint merge-review --decision return_a|return_b
4. If go, point the user to:
   ./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
5. End with the manual merge runbook, merge order guidance, stop conditions, `verify --target main`, and `summarize`
```
