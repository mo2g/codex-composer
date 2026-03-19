# Codex App Quickstart

## First Time In A Repository

1. Open the repo.
2. Read `AGENTS.md`.
3. Check `.codex/config.toml` and make sure verification commands match this repo's stack.
4. Start with a short planning prompt if the task is not trivial.

Typical verification examples:

- Node: `npm/pnpm/yarn test`
- Go: `go test ./...`
- Rust: `cargo test`
- Polyglot: `make test` or `make verify`

## When To Plan First

Plan first when any of these are true:

- scope is unclear
- changes touch multiple subsystems
- risk of regressions is non-trivial
- you may need parallel execution

## When To Use New Thread / Worktree

- Use a new Codex app thread when work can be separated logically.
- Use a worktree when you need filesystem and branch isolation.
- If tasks are tightly coupled, keep one thread first and plan before parallelizing.

## When To Ask Codex For Review

Request a review before merge when:

- the change is large
- behavior changed in critical paths
- multiple contributors/threads touched related areas

Review should focus on: regressions, missing tests, boundary drift, and merge risks.

## When Humans Merge

Humans merge after:

- scoped changes are complete
- verification passed
- review feedback is addressed

After merge, rerun main-branch verification.
