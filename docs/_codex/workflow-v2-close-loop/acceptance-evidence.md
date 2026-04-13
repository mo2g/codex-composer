# Acceptance Evidence: workflow-v2-close-loop

## Verification summary

- Scope checked: canonical docs, core skills, installed templates, and contract tests for the v2 task-card/debug workflow.
- Commands run:
  - `rtk npm test`

## Debug closure (debug tasks only)

- Confirmed root cause: n/a
- Ruled-out hypotheses: n/a
- Cause-targeting check: n/a

## Criteria map

| Acceptance criterion | Evidence | Gap or risk |
| --- | --- | --- |
| Task-card, resume, and acceptance-evidence guidance stays lightweight while explicitly handling debug mode and root-cause state. | `docs/codex-task-card-workflow.md`, `docs/codex-debug-workflow.md`, `docs/codex-quickstart.md`, and the Task Card / journal / evidence templates now describe lightweight debug metadata and recovery behavior without requiring all artifacts for trivial work. | Small metadata increase for non-trivial cards; acceptable tradeoff for clearer recovery. |
| `planner`, `implementer`, `resume-work`, and `change-check` describe one coherent debug-aware loop that matches the canonical docs. | Updated skill docs and installed workflow assets align on mode tracking, `debug.md` recovery, confirmed-cause gating, and debug closure. Contract tests assert those strings in installed repos. | None. |
| Installed templates and tests enforce the updated workflow contract. | `template/AGENTS.md`, `template/AGENTS-BLOCK.md`, and `template/README.md` reflect the new recovery/evidence loop. `test/workflow-entrypoints.test.mjs`, `test/task-card-assets.test.mjs`, `test/debug-workflow.test.mjs`, and `test/template.test.mjs` cover the new contract. | None. |
| `npm test` passes and the branch can be committed with a clean final `git status`. | `rtk npm test` passed. The branch is ready for commit after review. | Commit and final clean-status check are pending because you deferred staging until after your review. |

## Tests added or updated

- `test/workflow-entrypoints.test.mjs`
- `test/task-card-assets.test.mjs`
- `test/debug-workflow.test.mjs`
- `test/template.test.mjs`

## Residual risks

- The workflow now relies on small metadata fields in non-trivial Task Cards; teams that remove those fields locally must keep their docs and skills aligned.

## Recommended commit message

- `docs: close debug-mode workflow gaps`
