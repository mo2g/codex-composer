# Codex Composer Protocol

Codex Composer treats Codex as a planning and implementation engine, not as an always-on autonomous orchestrator. The current MVP is optimized for an existing repository that is already open in Codex.

## Bootstrap

Preferred path:

1. Open the target repository in Codex.
2. Install Codex Composer into that repository.
3. Stay in the current Codex thread for `clarify` and `plan-review`.

Example bootstrap:

```bash
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

## Hybrid Layout

Installed repositories keep only three top-level protocol affordances:

- `AGENTS.md`
- `./codex-composer`
- `.codex-composer/`

Managed protocol content lives under `.codex-composer/protocol/`. Runtime state lives under `.codex-composer/runs/` and `.codex-composer/worktrees/`.

The source repository keeps its flat layout for maintenance and tests. Runtime resolution prefers the installed hybrid layout and falls back to the flat source layout for compatibility.

## Run Layout

Each run lives in `.codex-composer/runs/<run-id>/`.

- `requirements.md`: original requirement or issue text
- `clarifications.md`: accepted answers from checkpoint 1
- `PLAN.md`: human-readable plan review
- `plan.json`: machine-readable plan
- `decisions.md`: checkpoint history
- `status.json`: machine-readable state
- `sessions.json`: optional control-session metadata
- `tasks/`: per-task prompt material
- `verify/`: hook results
- `logs/`: raw Codex command output
- `SUMMARY.md`: handoff summary generated from commit snapshots
- `PR_BODY.md`: PR draft generated from commit snapshots

The installer and runtime ignore only `.codex-composer/runs/` and `.codex-composer/worktrees/`, not the entire `.codex-composer/` directory.

## Current-Thread Control

The current Codex thread is the control/planner thread by default. That thread is responsible for:

- asking for missing acceptance criteria
- presenting `serial` vs `parallel_ab`
- recording plan approval or re-plan requests
- reviewing merge readiness after A/B verification and commit

`composer-chat-control` still exists in the source repository, but it is fallback-only.

## Execution Model

- `A`: the current repository root and current Codex thread
- `B`: an optional git worktree created by `split`

If the user approves `parallel_ab`, Codex Composer creates only the `B` worktree. The user then opens a separate Codex thread manually in that worktree.

## Parallel Policy

The planner may recommend `parallel_ab`, but the final mode remains pending until the user approves it. Local policy evaluation can force a downgrade to `serial` when:

- task boundaries overlap on concrete files
- task boundaries map to the same `conflict_group`
- task boundaries touch the same `core=true` component
- task boundaries match no repository files yet

## Verification And Commit

Verification is always explicit. `verify` runs the configured shell hooks for task `a`, task `b`, or `main`.

`commit` only succeeds after the corresponding task verification passes. At commit time, Codex Composer stores task snapshots in `status.json`:

- `commit_sha`
- `commit_message`
- `changed_files`
- `committed_at`

`summarize` uses those snapshots instead of recomputing branch diffs after merge.

## `next` As Main Entry

`next` is the recommended command for guiding the user through the workflow:

- `clarify` / `clarified`: prints what to edit and which commands to run
- `plan-review`: prints the approval commands
- `plan-approved`: runs `split`, then prints updated status
- `execute`: prints A/B worktree and verify/commit guidance
- `merge-review`: prints the merge-readiness checklist
- `ready-to-merge`: prints the manual merge checklist
- `completed`: prints summary and PR body paths

`next` does not auto-decide checkpoints, verify, commit, or merge.
