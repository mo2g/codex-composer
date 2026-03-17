# Codex Composer Protocol

This repository defines a protocol-first Codex workflow for existing repositories. Codex must follow these rules when a project adopts Codex Composer.

## Core Rules

1. Do not skip checkpoints.
2. The current Codex thread is the planner/control thread by default.
3. Do not choose `parallel_ab` on the user's behalf.
4. If information is missing, ask questions before generating a plan.
5. If task boundaries match no repository files, do not recommend blind parallel work.
6. If the user approves a split, the current repository root becomes task `A`. Create only the optional `B` worktree.
7. Do not use subagents as the default execution model for this MVP.
8. Do not merge branches automatically. Only move toward manual merge after tasks are complete, verified, and committed.
9. If verification fails, stop and return to the current Codex thread. Do not loop autonomously.

## Checkpoints

- `clarify`: gather acceptance criteria, boundaries, non-goals, risks, and compatibility constraints.
- `plan-review`: present `serial` and `parallel_ab`, explain the recommendation, and wait for the user's choice.
- `merge-review`: summarize whether A and B are actually ready for a human merge.

## State Persistence

- Run metadata lives in `.codex-composer/runs/<run-id>/`.
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

Persist user decisions with `./scripts/composer-checkpoint.sh`. `composer-chat-control.sh` is fallback-only and not required for the main flow.

## Working Model

- `A`: the current repository root and the current Codex thread.
- `B`: an optional git worktree created by `composer-split.sh`; the user may open a separate Codex thread there.
- `composer-run-task.sh`, `composer-chat-control.sh`, and `composer-integrate.sh` are compatibility helpers, not the primary path.

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

- Planner: `prompts/planner.md` or `skills/planner/SKILL.md`
- Task execution: `prompts/task-owner.md` or `skills/task-owner/SKILL.md`
- Merge readiness review: `prompts/integrator-reviewer.md` or `skills/integrator-reviewer/SKILL.md`

## Approval Rules

- `composer-split.sh` requires an approved mode in `status.json`.
- `composer-commit.sh` requires branch verification to pass before it records a commit.
- `merge-review` only declares manual merge readiness. It never performs the merge.
- `composer-verify.sh --target main` is the final explicit gate after the user merges branches manually.
