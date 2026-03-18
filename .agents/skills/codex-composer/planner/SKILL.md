# Codex Composer Planner

## Description / Scope

Repo-native planning skill for Codex Composer. Use it in the current Codex thread when a raw request needs to become a clear `clarify` or `plan-review` outcome, when the user wants help choosing `serial` vs `parallel_ab`, or when scope changed enough to require a re-plan.

## When To Use

- a run has just been started and the user is still shaping the requirement
- the run is in `clarify`, `clarified`, or `plan-review`
- the user says things like "plan this", "clarify the requirement", "should this split into A and B?", or "scope changed, re-plan it"
- the repository needs a judgment about whether `B` should exist as a separate worktree
- the user needs exact next commands for `checkpoint`, `plan`, or `needs_replan`

## When Not To Use

- task `A` or `B` is already being implemented inside `execute`
- the question is only whether verified tasks are merge-ready
- the user wants coding work rather than planning work
- the user is asking for an automatic split, automatic merge, or autonomous repair loop

## Inputs

- the active run id
- `AGENTS.md`
- `.codex/local/runs/<run-id>/requirements.md`
- `.codex/local/runs/<run-id>/clarifications.md`
- `.codex/local/runs/<run-id>/PLAN.md`
- `.codex/local/runs/<run-id>/status.json`
- repository structure and path rules from `.codex/local/config.toml`
- optional runtime scaffolding from `.codex/protocol/templates/planner.md`

## Outputs

- clarified questions, assumptions, and missing constraints in the current thread
- a user-facing explanation of mode, task boundaries, risks, and open questions
- a recommendation for `serial` or `parallel_ab` without taking the decision away from the user
- exact next commands for `checkpoint`, `plan`, or `needs_replan`

## Allowed Actions

- ask for missing acceptance criteria, boundaries, risks, non-goals, or compatibility constraints
- inspect repository structure to see whether task boundaries map to real files
- explain the tradeoff between `serial` and `parallel_ab`
- recommend a mode without choosing it for the user
- tell the user when `B` should be created in a separate worktree
- tell the user when the current plan is invalid and should go back through `needs_replan`
- run `checkpoint` and `plan`

## Forbidden Actions

- start implementing feature code
- automatically approve `parallel_ab`
- automatically run `split` before the user approves a mode
- edit `plan.json` by hand
- merge branches
- use subagents as the default path
- hide uncertainty or skip missing clarifications just to keep the flow moving

## Failure Handling

- if the run does not exist yet, tell the user to start one with `./codex-composer start --run <id> --requirement "..."`
- if boundaries are unclear, keep asking until the plan is decision-complete
- if repository structure does not support a clean split, explain why and recommend `serial`
- if local policy forces serialization, explain why and tell the user to record `serial`
- if the user changes scope materially, route back through `needs_replan`
- if repo-native skills have not been migrated into `.agents/skills/codex-composer`, tell the user to run `./codex-composer migrate` before continuing

## Minimal Example

```text
Recommended prompt:
"Use the repo's planner skill for run `login`. Clarify what is missing, decide whether `parallel_ab` is actually safe, and give me the exact next commands without choosing the mode for me."

Expected behavior:
1. Review AGENTS.md, the active run files, and the repository structure
2. Ask only for missing information that materially changes the plan
3. Explain `serial` vs `parallel_ab` in user-facing language
4. Point the user to:
   ./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
   ./codex-composer plan --run login
5. Wait for the user to choose the `plan-review` decision
```
