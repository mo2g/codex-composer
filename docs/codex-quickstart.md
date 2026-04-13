# Codex App Quickstart

## First Pass

1. Read `AGENTS.md`.
2. Inspect the repo manifests, nearby tests, and `.codex/config.toml` if the repo already keeps one.
3. Check for repo-local skills under `.agents/skills/`.
4. If the task is non-trivial, start with `planner`.

Use these docs as the source of truth:

- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`

Typical verification signals include manifests, lockfiles, test configs, CI entrypoints, nearby tests, and optional hints in `.codex/config.toml`.

## Default Loop

1. Use `planner` to lock scope, acceptance criteria, verification gate, and isolation, then emit a Task Card.
2. Use `implementer` for the approved bounded change.
3. Keep repository artifacts under `docs/_codex/<task-slug>/` when the task is long-running or likely to outlive the thread.
4. Use `resume-work` when context must be reconstructed from the Task Card, `debug.md` when present, the journal, the diff, and nearby tests.
5. Use `change-check` for the final evidence pass before commit or manual merge.

## Debug Mode

Use `debug-investigation` when root cause is still unconfirmed, especially for flaky, intermittent, timing-sensitive, or repeated-failed-fix bugs.

While debug mode is active:

- keep `docs/_codex/<task-slug>/debug.md`
- list hypotheses before broad fixes
- run one attributable experiment per hypothesis
- keep `implementer` in minimal experiment mode until root cause is confirmed
- let `change-check` close the debug evidence before claiming the bug is fixed

## Isolation

- Keep one thread by default.
- Split into another thread only when the work is independently reviewable.
- Add a worktree only when branch or filesystem isolation reduces risk.

When wording conflicts, defer to the canonical workflow docs instead of this quickstart.
