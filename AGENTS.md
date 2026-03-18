# Codex Composer Protocol

Codex Composer is a protocol-first, worktree-first workflow template for using Codex inside an existing repository. The current Codex thread is the planner/control thread by default.

## Setup / Dev Commands

- Install dependencies: `npm install`
- Run unit and protocol tests: `npm test`
- Alternate test entrypoint: `make test`
- Run the local smoke validation: `make validate-tmp`
- Override the default tmp location on repeated runs: `BASE_DIR=/tmp/codex-composer-<suffix> make validate-tmp`
- Opt-in live smoke reminder: `make live-smoke`
- Lint / format / typecheck: not defined in this repository today. Do not invent extra validation commands in automation, docs, or reviews.

## How To Work On This Repository

- Prefer canonical assets under `.agents/skills/`, `.codex/protocol/`, and `.codex/local/`.
- Treat root `scripts/` and `tools/` as compatibility wrappers for source-repo maintenance, not as the primary user-facing workflow.
- Keep `README.md`, `AGENTS.md`, repo-native skills, state-machine docs, and merge guidance aligned when changing workflow wording.
- Before considering a change polished, run `npm test` and `make validate-tmp`. Use a custom `BASE_DIR` if the default tmp path is already populated from an earlier smoke run.

## Core Rules

1. Do not skip checkpoints.
2. Do not choose `parallel_ab` on the user's behalf.
3. If information is missing, ask questions before generating a plan.
4. If task boundaries match no repository files, do not recommend blind parallel work.
5. If the user approves a split, the current repository root becomes task `A`. Create only the optional `B` worktree.
6. Do not use subagents as the default execution model.
7. Do not merge branches automatically. Only move toward manual merge after tasks are complete, verified, and committed.
8. If verification fails, stop and return to the current Codex thread. Do not loop autonomously.

## Canonical Layout

- Root-visible control surface:
  - `AGENTS.md`
  - repository launcher: `./codex-composer` or, if occupied, `./composer-next`
- Codex-native discovery layer:
  - `.agents/skills/codex-composer/planner/`
  - `.agents/skills/codex-composer/task-owner/`
  - `.agents/skills/codex-composer/integrator-reviewer/`
- Internal protocol layer:
  - `.codex/protocol/templates/`
  - `.codex/protocol/schemas/`
  - `.codex/protocol/tools/`
- Runtime state:
  - `.codex/local/config.toml`
  - `.codex/local/runs/<run-id>/`
  - `.codex/local/worktrees/<run-id>/`

## Checkpoints

- `clarify`: gather acceptance criteria, boundaries, non-goals, risks, and compatibility constraints.
- `plan-review`: present `serial` and `parallel_ab`, explain the recommendation, and wait for the user's choice.
- `merge-review`: summarize whether A and B are actually ready for a human merge.

## Working Model

- `A`: the current repository root and the current Codex thread.
- `B`: an optional git worktree created by `split`; the user may open a separate Codex thread there.
- Default Codex app roles:
  - `planner` in the current thread
  - `task-owner` in the current thread for A and, if needed, in a separate B thread
  - `integrator-reviewer` back in the current thread for merge readiness
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

## Skills And Templates

- Repo-native skills:
  - planner: `.agents/skills/codex-composer/planner/SKILL.md`
  - task-owner: `.agents/skills/codex-composer/task-owner/SKILL.md`
  - integrator-reviewer: `.agents/skills/codex-composer/integrator-reviewer/SKILL.md`
- Internal runtime templates:
  - `.codex/protocol/templates/planner.md`
  - `.codex/protocol/templates/task-owner.md`
  - `.codex/protocol/templates/integrator-reviewer.md`

## Approval Rules

- `split` requires an approved mode in `status.json`.
- `commit` requires branch verification to pass before it records a commit snapshot.
- `merge-review` only declares manual merge readiness. It never performs the merge.
- `verify --target main` is the final explicit gate after the user merges branches manually.

## Subagents

- Subagents are not the default path.
- Default parallelism is current thread + optional new Codex thread + worktree.
- Experimental subagent usage is limited to future read-only review/research scenarios.
- Subagents must not auto-merge, write to `main`, or close cross-task work on their own.
