# Codex Composer Protocol

Codex Composer treats Codex as a planning and implementation engine, not as an always-on autonomous orchestrator.

## Canonical Layout

- Root-visible control surface:
  - `AGENTS.md`
  - `./codex-composer`
- Canonical managed assets:
  - `.codex/protocol/`
  - `.codex/skills/`
- Runtime-only state:
  - `.codex/local/config.toml`
  - `.codex/local/runs/`
  - `.codex/local/worktrees/`

The source repository keeps root `scripts/` and `tools/` as thin compatibility wrappers. The canonical implementation lives under `.codex/`.

## Runtime Resolution

Resolution order is fixed:

1. `.codex/protocol` + `.codex/skills` + `.codex/local/config.toml`
2. flat root fallback only for source-repo development compatibility

Once `.codex` exists, new writes go only to `.codex`.

## Run Layout

Each run lives in `.codex/local/runs/<run-id>/`.

- `requirements.md`
- `clarifications.md`
- `PLAN.md`
- `plan.json`
- `decisions.md`
- `status.json`
- `sessions.json`
- `tasks/`
- `verify/`
- `logs/`
- `SUMMARY.md`
- `PR_BODY.md`

## Current-Thread Control

The current Codex thread is the planner/control thread by default. That thread is responsible for:

- asking for missing acceptance criteria
- presenting `serial` vs `parallel_ab`
- recording plan approval or re-plan requests
- reviewing merge readiness after A/B verification and commit

## Execution Model

- `A`: the current repository root and current Codex thread
- `B`: an optional git worktree created by `split`

If the user approves `parallel_ab`, Codex Composer creates only the `B` worktree. The user then opens a separate Codex thread manually in that worktree.

## Verification And Commit

Verification is always explicit. `verify` runs the configured shell hooks for task `a`, task `b`, or `main`.

`commit` only succeeds after the corresponding task verification passes. At commit time, Codex Composer stores task snapshots in `status.json`:

- `commit_sha`
- `commit_message`
- `changed_files`
- `committed_at`

`summarize` uses those snapshots instead of recomputing branch diffs after merge.

## Commands

- `start`: create a run
- `next`: print the recommended next human step and auto-run approved `split`
- `plan`: generate `plan.json` and `PLAN.md`
- `checkpoint`: persist user decisions
- `split`: prepare A in the current repo and optionally create B
- `status`: print the current state and next steps
- `verify`: run branch or main verification
- `commit`: record a verified task commit snapshot
- `summarize`: generate `SUMMARY.md` and `PR_BODY.md`
- `migrate`: move a deprecated `.codex-composer` install into `.codex`
