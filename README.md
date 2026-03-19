# Codex Collaboration Minimal Template

## What Is This

A lightweight template for using Codex app in real repositories without adopting a heavy workflow engine.

## What Problem It Solves

It provides a stable collaboration contract so Codex can work consistently across contributors:

- one entry rule file (`AGENTS.md`)
- one repo-level config (`.codex/config.toml`)
- a small skills layer for repeatable high-value tasks
- explicit human merge responsibility

## When To Use This

Use this when you want Codex to work in a practical engineering loop with clear boundaries and low process overhead.

## When Not To Use This

Do not use this if you want autonomous merge orchestration, strict checkpoint state machines, or subagents as the default execution path.

## Design Principles

- Principle-first, not workflow-first
- Keep only stable, reusable constraints
- Prefer Codex app thread + worktree for parallel changes
- Keep runtime artifacts out of the core mental model
- Manual merge only

## Quickstart (3 Minutes)

1. Open this repo in Codex app.
2. Read `AGENTS.md` first.
3. Confirm `.codex/config.toml` matches your repository's real test/verify commands.
4. Ask Codex to plan first for complex work, then implement in bounded steps.
5. If work can be isolated, open a new thread (and a worktree when needed).
6. Run verification, then perform merge manually.

## Minimal Structure

- `AGENTS.md` (main rules)
- `.codex/config.toml` (repo-shared Codex config)
- `.agents/skills/codex-composer/` (small capability extensions)
- `docs/codex-quickstart.md` (app usage)
- `docs/manual-merge-checklist.md` (human merge gate)

`.codex/local/` is runtime state. It may exist, but it is not a template core concept.

## Validation Commands Are Repo-Specific

Define verification in `.codex/config.toml` using the target stack:

- Node: `npm/pnpm/yarn test`
- Go: `go test ./...`
- Rust: `cargo test`
- Polyglot: prefer one unified entrypoint like `make test` or `make verify`
