# Codex Collaboration Template

This repository is a minimal collaboration template for Codex app.

## Repository Map

- `AGENTS.md`: the stable collaboration rules (main entry)
- `.codex/config.toml`: repo-level Codex settings shared by contributors
- `.agents/skills/codex-composer/`: small set of reusable skills
- `README.md`: template overview
- `docs/codex-quickstart.md`: practical app workflow
- `docs/manual-merge-checklist.md`: human merge gate checklist

## Setup / Run / Validate (This Repository)

- Install dependencies: `npm install`
- Run tests: `npm test` (or `make test`)
- Run local smoke check: `make validate-tmp`
- If `/tmp/codex-composer` already exists: `BASE_DIR=/tmp/codex-composer-<suffix> make validate-tmp`

## Integrating Into Other Repositories

Do not hardcode `npm test` for every project.

Set verification commands to the target repository stack:

- Node: `npm test`, `pnpm test`, or `yarn test`
- Go: `go test ./...`
- Rust: `cargo test`
- Polyglot repos: prefer one unified gate like `make test` or `make verify`

Keep these checks in `.codex/config.toml` under `[hooks]` so the repo can share one agreed verification contract.

## Core Behavior Rules

1. For non-trivial tasks, propose a short plan before implementation.
2. Prefer the repo skills when they fit: `planner`, `implementer`, and `merge-check`.
3. For large changes, split work into clear, reviewable chunks.
4. For parallel work, prefer a new Codex app thread and use a worktree when edits need isolation.
5. Do not commit before relevant verification passes.
6. Never auto-merge into `main`; merge stays a human action.
7. Do not edit unrelated files.
8. Subagents are optional and non-default.

## Definition Of Done

A task is done only when all are true:

- Changes stay within approved scope.
- Relevant verification passed.
- Risks, tradeoffs, and follow-ups are explicitly called out.
- Merge is still performed manually by a human.
