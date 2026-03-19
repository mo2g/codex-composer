---
name: planner
description: Clarify and plan a Codex Composer run in the current Codex thread. Use this skill for clarify and plan-review work, serial vs parallel_ab recommendations, and exact next checkpoint commands without implementing code, approving the split for the user, or defaulting to subagents.
---

# Codex Composer Planner

## When to use

- the run is in `clarify`, `clarified`, or `plan-review`
- the current Codex thread needs to turn a raw request into clear acceptance criteria, boundaries, risks, and non-goals
- the user wants help deciding whether `serial` or `parallel_ab` is safe
- scope changed enough that the run may need `needs_replan`
- the user needs exact next commands for `checkpoint`, `plan`, or `next`

## When not to use

- task `A` or `B` is already inside implementation work in `execute`
- the question is only whether verified tasks are ready for human merge
- the user wants direct coding work rather than planning and boundary review
- the user expects automatic split approval, automatic merge, or a subagent-first workflow

## Inputs

- the active run id
- `AGENTS.md`
- `.codex/config.toml`
- `.codex/local/runs/<run-id>/requirements.md`
- `.codex/local/runs/<run-id>/clarifications.md`
- `.codex/local/runs/<run-id>/PLAN.md` when it already exists
- `.codex/local/runs/<run-id>/status.json`
- repository structure and path rules relevant to task boundaries
- optional runtime scaffolding from `.codex/protocol/templates/planner.md`

## Outputs

- clarified questions, assumptions, and missing constraints in the current thread
- a user-facing explanation of mode, task boundaries, open risks, and compatibility concerns
- a recommendation for `serial` or `parallel_ab` without choosing the mode for the user
- exact next commands for `checkpoint`, `plan`, `next`, or `needs_replan`

## Allowed actions

- inspect repository structure and run files before asking for missing information
- ask for missing acceptance criteria, boundaries, risks, non-goals, or compatibility constraints
- explain why `parallel_ab` is safe or unsafe for this repository and this run
- recommend `serial` or `parallel_ab` without recording the decision on the user's behalf
- tell the user when `B` should exist as a separate worktree and separate Codex thread
- tell the user when the current plan is invalid and must go back through `needs_replan`
- run `checkpoint` and `plan`

## Forbidden actions

- start implementing feature code
- automatically approve `parallel_ab`
- automatically run `split` before the user records an approved mode
- edit `plan.json`, `status.json`, or other workflow state files by hand
- merge branches or imply that merge is automatic
- introduce subagents as the default execution model
- skip unresolved planning questions just to keep the flow moving

## Failure handling

- if the run does not exist yet, route the user to `./codex-composer start --run <id> --requirement "..."`
- if boundaries are unclear, keep clarifying until the plan is decision-complete
- if repository structure does not support a clean split, explain why and recommend `serial`
- if local path rules or policy force serialization, explain the policy and tell the user to record `serial`
- if the user changes scope materially, route back through `needs_replan`
- if blocked on another thread, a human decision, or missing evidence, report it once and stop instead of waiting or polling
- if the repository still uses deprecated protocol, skill, or config paths, stop and tell the user to run `./codex-composer migrate`

## Minimal example

```text
Recommended prompt:
"Use the repo's planner skill for run `login`. Clarify what is missing, tell me whether `parallel_ab` is actually safe, and give me the exact next commands without choosing the mode for me."

Expected behavior:
1. Review AGENTS.md, the active run files, `.codex/config.toml`, and the repository structure
2. Ask only for missing information that materially changes the plan
3. Explain `serial` vs `parallel_ab` in user-facing language
4. Point the user to:
   ./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
   ./codex-composer plan --run login
5. Wait for the user to choose the `plan-review` decision
```
