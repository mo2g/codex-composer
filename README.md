# Codex App Template

A lightweight source template for adding a Codex app workflow to a repository.

## What It Solves

Most Codex-enabled repositories need the same small set of workflow primitives:

- a durable repository contract in `AGENTS.md`
- a few high-value skills for planning, implementation, resume, and change checking
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
6. For non-trivial work, use `planner` to clarify the intent, emit a Task Card, and then write the implementation plan.
7. Implement with `implementer`.
8. For long-running work, keep an optional task journal and use `resume-work` when context needs to be reconstructed.
9. Use `change-check` before commit or manual merge.

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
- For long-running work, keep an optional task journal in a repo-owned path.
- Keep merge manual on purpose.

## Verification And Merge

- `npm test` runs the contract tests for this template repository.
- Target repositories should let `change-check` inspect the repo, the diff, nearby tests, and any Task Card or task journal before choosing verification.
- Optional hooks in `.codex/config.toml` can speed up verification, but they are not the only source of truth.
- Human review and merge remain explicit.

## Minimal Task Flow

1. Ask Codex to inspect the repo and clarify the task.
2. Use `planner` if the task is ambiguous or spans multiple subsystems. Let it lock the intent, emit a Task Card, and then write the plan.
3. Make the smallest useful implementation with `implementer`.
4. If the task pauses or moves across sessions, update the task journal and use `resume-work` before continuing.
5. Use `change-check` to decide whether tests should be added or expanded, run the best-fit verification, and summarize the evidence against the acceptance criteria.
6. Use the suggested commit message or adjust it, then let a human decide whether to commit or merge.

## Repository Assets

- `docs/codex-quickstart.md`: quickstart guidance copied into target repositories
- `template/`: installed repository-level files such as `AGENTS.md` and the bootstrap README
- `tools/template-init.mjs`: installer entrypoint used by `install.sh`
