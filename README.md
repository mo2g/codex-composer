# Codex App Template

A lightweight, reusable, and verifiable template for teams that use Codex app as part of everyday software development.

## What It Solves

Most Codex-enabled repositories need the same small set of workflow primitives:

- a durable repository contract in `AGENTS.md`
- stable verification commands in `.codex/config.toml`
- a few high-value skills for planning, implementation, and merge readiness
- explicit human review and merge responsibility

This template packages those pieces without adding a repo-local protocol or command-state machine.

## Five-Minute Quickstart

1. Clone this repository and run `npm install`.
2. Run `npm run verify` to confirm the template source repository is healthy.
3. Bootstrap a target repository:

   ```bash
   bash install.sh --repo /path/to/repo --template existing --source .
   ```

4. Open the target repository in Codex app and read `AGENTS.md`.
5. Confirm `.codex/config.toml` matches the real test and verify commands for that repository.
6. For non-trivial work, start with `planner`, implement with `implementer`, then use `merge-check` before manual merge.

## Recommended Structure

```text
AGENTS.md
.codex/config.toml
.agents/skills/codex-template/
docs/
template/
examples/
scripts/
test/
```

## Why These Pieces Exist

- `AGENTS.md` carries the stable repo-level rules Codex should always know.
- `.codex/config.toml` keeps verification commands and branch defaults consistent across sessions.
- `.agents/skills/codex-template/` holds opt-in workflows for the few tasks that benefit from reusable guidance.
- `template/` contains the files that get installed into target repositories.
- `examples/` stores canonical scaffold content used by the installer and smoke validation.

## Supported Bootstrap Modes

- `existing`: add Codex workflow files to an existing repository without replacing its README
- `blank`: initialize an empty repository with template defaults
- `fullstack-example`: initialize a blank repository with template defaults plus a minimal frontend and Go backend example

## Parallel Collaboration

Use one Codex thread when the change is tightly coupled. Open a new thread when work can be reviewed independently, and add a worktree when branch or filesystem isolation will reduce merge risk. The template keeps merge manual on purpose.

## Verification And Merge

- `npm test` runs the contract tests for this template repository.
- `npm run verify` runs the contract tests plus a disposable install smoke test.
- Target repositories should keep their real verification commands in `.codex/config.toml`.
- `merge-check` is the final gate before human review and manual merge.

## Minimal Task Flow

1. Ask Codex to inspect the repo and plan the work.
2. Use `planner` if the task is ambiguous or spans multiple subsystems.
3. Make the smallest useful implementation with `implementer`.
4. Run the verification commands from `.codex/config.toml`.
5. Use `merge-check` when the diff is ready for manual review and merge.

## Repository Assets

- `docs/codex-quickstart.md`: quickstart guidance copied into target repositories
- `docs/manual-merge-checklist.md`: manual merge checklist copied into target repositories
- `MIGRATION.md`: naming and workflow changes from the earlier template shape
- `examples/fullstack-example/`: canonical scaffold used by `--template fullstack-example`
