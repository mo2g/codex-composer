# Task Card: workflow-v2-close-loop

- Status: ready-for-check
- Owner thread: current-thread
- Branch/worktree: codex/task-card-resume-workflow
- Last updated: 2026-04-13 21:22 CST
- Mode: implementation
- Required artifacts: task-card.md, journal.md, acceptance-evidence.md
- Root-cause status: n/a

## Goal

Refine the v2 workflow draft into a lightweight, daily-usable Codex App Template by closing the remaining execution-layer gaps without redesigning the workflow.

## In scope

- Align docs, skills, templates, and tests around the current task-card and debug workflow.
- Make debug-mode behavior explicit across planning, implementation, resume, and change-check flows.
- Keep installed repository guidance lightweight and artifact-driven.

## Out of scope

- Replacing the task-card workflow with a new process model.
- Adding required artifacts for trivial tasks.
- Broad installer or bootstrap redesign unrelated to workflow consistency.

## Files likely involved

- README.md
- AGENTS.md
- docs/codex-quickstart.md
- docs/codex-task-card-workflow.md
- docs/codex-debug-workflow.md
- docs/workflow-sync-rules.md
- .agents/skills/codex-template/
- template/
- test/

## Acceptance criteria

1. Task-card, resume, and acceptance-evidence guidance stays lightweight while explicitly handling debug mode and root-cause state.
2. `planner`, `implementer`, `resume-work`, and `change-check` describe one coherent debug-aware loop that matches the canonical docs.
3. Installed templates and tests enforce the updated workflow contract.
4. `npm test` passes and the branch can be committed with a clean final `git status`.

## Verification gate

- `npm test`
- Diff review against the acceptance criteria and workflow docs

## Isolation

- Stay in current thread
- Reason: this is one reviewable workflow-alignment change on a dedicated branch.

## Risks

- Making the Task Card heavier than the template philosophy allows.
- Fixing one surface while leaving the installed contract or tests behind.

## Decisions

- Keep debug-specific fields lightweight and optional enough for daily use.
- Prefer canonical detail in `docs/` and shorter summaries elsewhere.

## Evidence log

- Planning pass completed after reading docs, skills, templates, contract files, and tests.
- Canonical docs, installed templates, and core skills were updated to encode lightweight debug metadata and debug-aware execution boundaries.
- `npm test` passed after the contract tests were extended to cover the new workflow expectations.

## Next smallest step

- User review, then stage and commit the verified workflow change.
