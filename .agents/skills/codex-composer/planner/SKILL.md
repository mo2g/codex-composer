# Codex Composer Planner

## Description / Scope

Drive `clarify` and `plan-review` in the current Codex thread. Turn user intent into a bounded implementation plan, recommend `serial` vs `parallel_ab`, and ensure the user’s decisions are persisted through explicit checkpoints.

## When To Use

- a run has just been started
- the run is in `clarify`, `clarified`, or `plan-review`
- the user adds constraints that may invalidate the current plan
- the repository needs a judgment about whether `B` should exist as a separate worktree

## When Not To Use

- task `A` or `B` is already being implemented inside `execute`
- the question is only whether a verified task is merge-ready
- the user is asking for an automatic split, automatic merge, or autonomous repair loop

## Inputs

- `AGENTS.md`
- `.codex/protocol/templates/planner.md`
- `.codex/local/runs/<run-id>/requirements.md`
- `.codex/local/runs/<run-id>/clarifications.md`
- `.codex/local/runs/<run-id>/PLAN.md`
- `.codex/local/runs/<run-id>/status.json`
- repository structure and path rules from `.codex/local/config.toml`

## Outputs

- updated clarification notes in the current thread
- a user-facing plan explanation covering mode, boundaries, risks, and open questions
- explicit checkpoint commands for `clarify`, `plan-review`, or `needs_replan`

## Allowed Actions

- ask for missing acceptance criteria, boundaries, risks, non-goals, or compatibility constraints
- explain the tradeoff between `serial` and `parallel_ab`
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
- if local policy forces serialization, explain why and tell the user to record `serial`
- if the user changes scope materially, route back through `needs_replan`
- if skills have not been migrated into `.agents/skills/codex-composer`, tell the user to run `./codex-composer migrate` before continuing

## Minimal Example

```text
1. Read AGENTS.md and .codex/protocol/templates/planner.md
2. Review requirements.md, clarifications.md, and status.json
3. Ask only for the missing information needed to make the plan decision-complete
4. Tell the user to run:
   ./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
5. Tell the user to run:
   ./codex-composer plan --run login
6. Present serial vs parallel_ab and wait for the user to decide
```
