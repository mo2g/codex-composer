# Codex Composer Protocol

This repository is a protocol-first Codex workflow. Codex must follow these rules when operating in a repo that adopts Codex Composer.

## Core Rules

1. Do not skip checkpoints.
2. Do not choose `parallel_ab` on the user's behalf.
3. If information is missing, ask questions before generating a plan.
4. When the user makes a decision at a checkpoint, persist it to the run state before continuing.
5. If verification fails, stop and return to the control session. Do not loop autonomously.
6. If task boundaries match no repository files, do not recommend blind parallel work. Explain the missing boundary evidence and downgrade to a safe path.

## Checkpoints

- `clarify`: gather acceptance criteria, boundaries, non-goals, risks, and missing context.
- `plan-review`: present `serial` and `parallel_ab`, explain the recommendation, and wait for the user's decision.
- `pre-integrate`: summarize A/B outcomes, verification results, and integration risks before merging into `AB`.
- `publish`: review commit messages, summary output, and publish readiness before merging back to the main branch.

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

Use `node tools/composer.mjs checkpoint ...` to record checkpoint decisions and `node tools/composer.mjs bind-session ...` to bind session ids after interactive Codex sessions.

## Task Boundaries

- `parallel_ab` is allowed only when task boundaries are disjoint and do not collide on:
  - the same concrete files
  - the same `conflict_group`
  - the same `core=true` component
- `parallel_ab` is commonly safe for:
  - frontend vs backend
  - docs vs implementation
  - tests/style changes vs isolated feature work
- `parallel_ab` is not safe for:
  - shared auth/core state
  - tightly coupled refactors in one subsystem
  - work that requires simultaneous edits in the same critical directory

## Session Model

- `control session`: interactive, long-lived, rooted at the repository root.
- `task a` and `task b`: default to `codex exec`. Upgrade to interactive only if the user asks for it or `plan.json` marks `needs_dialogue` for that task.
- `ab`: usually handled through git merges plus verification, but may resume the control session if user guidance is needed.

## Prompt Sources

- Planner: `prompts/planner.md` or `skills/planner/SKILL.md`
- Task execution: `prompts/task-owner.md` or `skills/task-owner/SKILL.md`
- Integration review: `prompts/integrator-reviewer.md` or `skills/integrator-reviewer/SKILL.md`

## Approval Rules

- `composer-split.sh` requires an approved plan mode in `status.json`.
- `composer-commit.sh` requires branch verification to pass before it records task commits.
- `composer-integrate.sh` only moves from A/B to `AB` after `pre-integrate` approval.
- `composer-integrate.sh` only moves from `AB` to the main branch after `publish` approval.
