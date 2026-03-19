# Codex Composer Protocol

Codex Composer treats Codex as a planning and implementation engine, not as an always-on autonomous orchestrator.

## Canonical Layout

- Root-visible control surface:
  - `AGENTS.md`
  - `./codex-composer`
- Codex-native discovery layer:
  - `.agents/skills/codex-composer/`
- Internal protocol layer:
  - `.codex/protocol/`
- Repo-level shared config:
  - `.codex/config.toml`
  - `.codex/rules/`
- Runtime-local generated state:
  - `.codex/local/runs/`
  - `.codex/local/worktrees/`

The source repository keeps root `scripts/` and `tools/` as thin compatibility wrappers. The canonical implementation lives under `.codex/` and `.agents/`.

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

## Repo Config Vs Runtime State

- `.codex/config.toml` is the canonical repo-level shared configuration for branch naming, hooks, path rules, and other install-time defaults
- `.codex/local/runs/` and `.codex/local/worktrees/` are runtime-local generated state for active runs

## Discovery Layer Vs Protocol Layer

- `.agents/skills/codex-composer/*/SKILL.md` defines reusable, discoverable Codex-native skills
- `.codex/config.toml` defines repo-level shared Codex Composer configuration
- `.codex/protocol/templates/*` defines internal workflow templates consumed by launcher/tooling
- `.codex/protocol/schemas/*` defines structured protocol outputs
- `.codex/protocol/tools/*` implements the workflow

Skills define role behavior. Templates provide thin runtime scaffolding. They are intentionally not the same layer.

Users should primarily think in terms of roles:

- `planner`
- `task-owner`
- `integrator-reviewer`

File paths remain useful for inspection and contributor maintenance, but they are not the primary user-facing entrypoint.

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

## Protocol Truth Vs App Narration

The protocol source of truth lives on disk under `.codex/local/runs/<run-id>/`.

- `status.json` is the authoritative state machine snapshot
- `plan.json` and `PLAN.md` are the authoritative plan artifacts
- `logs/plan.meta.json`, `logs/plan.stdout.log`, and `logs/plan.stderr.log` are the authoritative `codex exec` traces when exec actually ran

Codex App messages are useful operator hints, but they are not the protocol state. If App narration says planning is still running, waiting, or resuming, confirm the actual state in the run directory before inferring hidden orchestration or subagents.

## Plan Failure Triage

`plan` validates the local `.codex/protocol/schemas/plan.schema.json` before it launches `codex exec`.

1. If schema preflight fails, treat that as a local protocol/template error. In that case, `codex exec` never started and there should be no `logs/plan.meta.json`, `logs/plan.stdout.log`, or `logs/plan.stderr.log` for that attempt.
2. If schema preflight passes, inspect `logs/plan.meta.json` first to confirm the executed command and exit code.
3. Then inspect `logs/plan.stdout.log` and `logs/plan.stderr.log` for schema rejection, sandbox or approval failures, or Codex local state warnings.
4. If neither `split` nor `status.json` shows prepared parallel work, do not interpret App waiting text as proof that Composer enabled hidden subagents. The default model is still current thread `A` plus the optional `B` worktree thread after explicit approval.

## Verification And Commit

Verification is always explicit. `verify` runs the configured shell hooks for task `a`, task `b`, or `main`.

`commit` only succeeds after the corresponding task verification passes. At commit time, Codex Composer stores task snapshots in `status.json`:

- `commit_sha`
- `commit_message`
- `changed_files`
- `committed_at`
- `commit_history[]` with the full append-only task commit history

The top-level snapshot fields always reflect the latest task commit. `summarize` uses those snapshots instead of recomputing branch diffs after merge.

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
- `migrate`: move deprecated layouts into `.codex` + `.agents`
