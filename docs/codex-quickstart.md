# Codex App Quickstart

## First Pass

1. Read `AGENTS.md`.
2. Inspect repo manifests, nearby tests, repo-local skills under `.agents/skills/`, and `.codex/config.toml` only if the repo already keeps one.
3. If the task is non-trivial, start with `planner`.

## Default Loop

1. Use `planner` to bound one reviewable change and define the verification gate.
2. Use `docs/_codex/<task-slug>/` only when the task needs durable state.
3. Stay in the current thread by default; split to another thread or worktree only when isolation or recovery cost justifies it.
4. Use `implementer` for the approved step, `resume-work` for recovery, and `change-check` before commit or manual merge.
5. If root cause is still unconfirmed, switch to `debug-investigation`, keep `debug.md`, and keep `implementer` in minimal experiment mode until the cause is confirmed.

## Source Of Truth

- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`

When wording conflicts, defer to the canonical workflow docs instead of this quickstart.
