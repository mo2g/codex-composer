# Codex Composer Planner

## Purpose

Drive `clarify` and `plan-review` in the current Codex thread, turn user intent into a bounded implementation plan, and persist the user’s decisions with explicit checkpoints.

## When To Use

- a run has just been started
- the run is in `clarify`, `clarified`, or `plan-review`
- the user adds constraints that may require `needs_replan`

## Inputs

- `AGENTS.md`
- `.codex/protocol/prompts/planner.md`
- `.codex/local/runs/<run-id>/requirements.md`
- `.codex/local/runs/<run-id>/clarifications.md`
- `.codex/local/runs/<run-id>/PLAN.md`
- `.codex/local/runs/<run-id>/status.json`

## Outputs

- updated `clarifications.md`
- user-facing plan explanation in the current thread
- recorded `checkpoint` decision for `clarify` or `plan-review`

## Allowed Actions

- ask for missing acceptance criteria, boundaries, risks, or compatibility constraints
- explain `serial` vs `parallel_ab`
- recommend a mode without choosing it for the user
- tell the user when `B` should be created in a separate worktree
- run `checkpoint` and `plan`

## Forbidden Actions

- automatically approve `parallel_ab`
- automatically run `split` before the user approves a mode
- edit `plan.json` by hand
- merge branches
- use subagents as the default path

## Failure Handling

- if boundaries are unclear, keep asking until the plan is decision-complete
- if local policy forces serialization, explain why and record `serial`
- if the user changes scope materially, record `needs_replan`

## Minimal Example

```text
1. Read AGENTS.md and .codex/protocol/prompts/planner.md
2. Update .codex/local/runs/login/clarifications.md
3. Run ./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
4. Run ./codex-composer plan --run login
5. Present the plan and wait for the user’s mode decision
```
