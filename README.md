# Codex App Template

A lightweight source template for adding a Codex app workflow to a repository.

## What It Solves

Most Codex-enabled repositories need the same small set of workflow primitives:

- a durable repository contract in `AGENTS.md`
- a few high-value skills for planning, implementation, resume, change checking, and debugging
- repository-owned workflow artifacts instead of chat-history-only state
- an optional place for repo-owned defaults or verification hints when a repository truly needs them
- explicit human review and merge responsibility

This template packages those pieces without adding a repo-local protocol or command-state machine.

## Quickstart

1. Clone this repository and run `npm install`.
2. Run `npm test` to confirm the template source repository is healthy.
3. Bootstrap a target repository:

   ```bash
   bash install.sh --repo /path/to/repo --template existing --source .
   ```

4. Open the target repository in Codex app and read `AGENTS.md`.
5. Stay in the current thread by default.
6. Treat `docs/codex-task-card-workflow.md` and `docs/codex-debug-workflow.md` as the workflow source of truth.
7. For non-trivial work, use `planner` to clarify the intent, emit a Task Card, and then write the implementation plan.
8. Implement with `implementer`.
9. For long-running work, keep repository artifacts such as `docs/_codex/<task-slug>/journal.md` and use `resume-work` when context needs to be reconstructed from the Task Card, journal, and `debug.md` when present.
10. For unclear-root-cause bugs, use `debug-investigation` and keep `docs/_codex/<task-slug>/debug.md`.
11. Use `change-check` before commit or manual merge.

## Recommended Structure

```text
AGENTS.md
.agents/skills/codex-template/
docs/
template/
test/
tools/
install.sh
```

## Why These Pieces Exist

- `AGENTS.md` carries the stable repo-level rules Codex should always know.
- `.agents/skills/codex-template/` holds opt-in workflows for the few tasks that benefit from reusable guidance.
- `docs/codex-task-card-workflow.md` and `docs/codex-debug-workflow.md` are the canonical workflow specs copied into target repositories.
- `template/` contains the files that get installed into target repositories.
- `.codex/config.toml` stays available in the source repository, and target repositories can add it later if they need repo-owned defaults or verification hints.

## Supported Bootstrap Modes

- `existing`: add Codex workflow files to an existing repository without replacing its README
- `blank`: initialize an empty repository with template defaults

## Default Collaboration Flow

- Start in the current thread.
- Open a new thread only when work can be reviewed independently.
- Add a worktree only when branch or filesystem isolation will reduce merge risk.
- For non-trivial work, shape it into a bounded Task Card before coding.
- Keep workflow state in repository artifacts under a path such as `docs/_codex/<task-slug>/`.
- For debugging with an unclear root cause, add `debug.md` and use hypothesis-driven investigation before broad fixes.
- Keep merge manual on purpose.

## Verification And Merge

- `npm test` runs the contract tests for this template repository.
- Target repositories should let `change-check` inspect the repo, the diff, nearby tests, and any Task Card, journal, or debug record before choosing verification.
- Optional hooks in `.codex/config.toml` can speed up verification, but they are not the only source of truth.
- Human review and merge remain explicit.

## Minimal Task Flow

1. Ask Codex to inspect the repo and clarify the task.
2. Use `planner` if the task is ambiguous or spans multiple subsystems. Let it lock the intent, emit a Task Card, and then write the plan.
3. Make the smallest useful implementation with `implementer`.
4. If the root cause is unclear, use `debug-investigation`, write `docs/_codex/<task-slug>/debug.md`, and confirm the cause before broad fixes.
5. If the task pauses or moves across sessions, update `docs/_codex/<task-slug>/journal.md` and use `resume-work` to recover from the Task Card, journal, and `debug.md` when present.
6. Use `change-check` to decide whether tests should be added or expanded, run the best-fit verification, and summarize the evidence against the acceptance criteria and debug closure when applicable.
7. Use the suggested commit message or adjust it, then let a human decide whether to commit or merge.

## Repository Assets

- `docs/codex-quickstart.md`: quickstart guidance copied into target repositories
- `docs/codex-task-card-workflow.md`: canonical task-card and external-memory workflow
- `docs/codex-debug-workflow.md`: canonical hypothesis-driven debug workflow
- `template/`: installed repository-level files such as `AGENTS.md` and the bootstrap README
- `tools/template-init.mjs`: installer entrypoint used by `install.sh`
