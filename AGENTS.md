# Codex Composer Protocol

Codex Composer defines a worktree-first workflow for using Codex inside an existing repository. The current Codex thread is the planner/control thread by default.

## Core Rules

1. Do not skip checkpoints.
2. Do not choose `parallel_ab` on the user's behalf.
3. If information is missing, ask questions before generating a plan.
4. If task boundaries match no repository files, do not recommend blind parallel work.
5. If the user approves a split, the current repository root becomes task `A`. Create only the optional `B` worktree.
6. Do not use subagents as the default execution model for this MVP.
7. Do not merge branches automatically. Only move toward manual merge after tasks are complete, verified, and committed.
8. If verification fails, stop and return to the current Codex thread. Do not loop autonomously.

## Checkpoints

- `clarify`: gather acceptance criteria, boundaries, non-goals, risks, and compatibility constraints.
- `plan-review`: present `serial` and `parallel_ab`, explain the recommendation, and wait for the user's choice.
- `merge-review`: summarize whether A and B are actually ready for a human merge.

## Hybrid Install Layout

- Root files kept visible to Codex:
  - `AGENTS.md`
  - repository launcher: `./codex-composer` or, if occupied, `./composer-next`
- Hidden managed protocol:
  - `.codex-composer/protocol/prompts/`
  - `.codex-composer/protocol/skills/`
  - `.codex-composer/protocol/schemas/`
  - `.codex-composer/protocol/tools/`
- Runtime state:
  - `.codex-composer/runs/<run-id>/`
  - `.codex-composer/worktrees/<run-id>/`

## State Persistence

- Human-readable files:
  - `requirements.md`
  - `clarifications.md`
  - `PLAN.md`
  - `decisions.md`
  - `SUMMARY.md`
  - `PR_BODY.md`
- Machine-readable files:
  - `plan.json`
  - `status.json`
  - `sessions.json`
  - `verify/*.json`

Persist decisions with the repository launcher, for example:

- `./codex-composer checkpoint --run <run-id> --checkpoint clarify --decision clarified --note "<summary>"`

If this repository had to fall back to `./composer-next`, use that launcher name instead.

## Working Model

- `A`: the current repository root and the current Codex thread.
- `B`: an optional git worktree created by `split`; the user may open a separate Codex thread there.
- Compatibility helpers such as `composer-chat-control`, `composer-run-task`, and `composer-integrate` exist, but they are not the primary path.

## Task Boundaries

- `parallel_ab` is allowed only when task boundaries are disjoint and do not collide on:
  - the same concrete files
  - the same `conflict_group`
  - the same `core=true` component
- `parallel_ab` is commonly safe for:
  - frontend vs backend
  - docs vs implementation
  - tests or styles vs isolated feature work
- `parallel_ab` is not safe for:
  - shared auth/core state
  - tightly coupled refactors in one subsystem
  - work that requires simultaneous edits in the same critical directory

## Prompt Sources

- Planner: `.codex-composer/protocol/prompts/planner.md` or `.codex-composer/protocol/skills/planner/SKILL.md`
- Task execution: `.codex-composer/protocol/prompts/task-owner.md` or `.codex-composer/protocol/skills/task-owner/SKILL.md`
- Merge readiness review: `.codex-composer/protocol/prompts/integrator-reviewer.md` or `.codex-composer/protocol/skills/integrator-reviewer/SKILL.md`

In the source repository, the same files also exist at the flat root for maintenance and testing.

## Approval Rules

- `split` requires an approved mode in `status.json`.
- `commit` requires branch verification to pass before it records a commit snapshot.
- `merge-review` only declares manual merge readiness. It never performs the merge.
- `verify --target main` is the final explicit gate after the user merges branches manually.
