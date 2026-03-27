# Codex App Template

A lightweight source template for adding a Codex app workflow to a repository.

## What It Solves

Most Codex-enabled repositories need the same small set of workflow primitives:

- a durable repository contract in `AGENTS.md`
- a few high-value skills for planning, implementation, and change checking
- project defaults plus optional verification hints in `.codex/config.toml`
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
5. Keep `.codex/config.toml` accurate for project defaults, and add verification hooks only if the repository has stable commands worth preserving.
6. Stay in the current thread by default. For non-trivial work, start with `planner`, implement with `implementer`, then use `change-check` before commit or manual merge.

## Recommended Structure

```text
AGENTS.md
.codex/config.toml
.agents/skills/codex-template/
docs/
template/
test/
tools/
install.sh
```

## Why These Pieces Exist

- `AGENTS.md` carries the stable repo-level rules Codex should always know.
- `.codex/config.toml` keeps project defaults stable and can hold optional verification hints or overrides.
- `.agents/skills/codex-template/` holds opt-in workflows for the few tasks that benefit from reusable guidance.
- `template/` contains the files that get installed into target repositories.

## Supported Bootstrap Modes

- `existing`: add Codex workflow files to an existing repository without replacing its README
- `blank`: initialize an empty repository with template defaults

## Default Collaboration Flow

- Start in the current thread.
- Open a new thread only when work can be reviewed independently.
- Add a worktree only when branch or filesystem isolation will reduce merge risk.
- Keep merge manual on purpose.

## Verification And Merge

- `npm test` runs the contract tests for this template repository.
- Target repositories should let `change-check` inspect the repo, the diff, and nearby tests before choosing verification.
- Optional hooks in `.codex/config.toml` can speed up verification, but they are not the only source of truth.
- Human review and merge remain explicit.

## Minimal Task Flow

1. Ask Codex to inspect the repo and plan the work.
2. Use `planner` if the task is ambiguous or spans multiple subsystems.
3. Make the smallest useful implementation with `implementer`.
4. Use `change-check` to decide whether tests should be added or expanded, run the best-fit verification, and summarize the evidence.
5. Use the suggested commit message or adjust it, then let a human decide whether to commit or merge.

## Repository Assets

- `docs/codex-quickstart.md`: quickstart guidance copied into target repositories
- `template/`: installed repository-level files such as `AGENTS.md` and the bootstrap README
- `tools/template-init.mjs`: installer entrypoint used by `install.sh`
