# Codex Composer Protocol

Codex Composer treats Codex as a planning and implementation engine, not as an always-on autonomous orchestrator. The current MVP is optimized for an existing repository that is already open in Codex.

## Bootstrap

Preferred path:

1. Open the target repository in Codex.
2. Bootstrap the protocol files into that repository.
3. Stay in the current Codex thread for `clarify` and `plan-review`.

Example bootstrap:

```bash
curl -fsSL https://raw.githubusercontent.com/<owner>/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

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

New runs automatically add `.codex-composer/` to `.gitignore` and `.git/info/exclude`.

## Current-Thread Control

The current Codex thread is the control/planner thread by default. That thread is responsible for:

- asking for missing acceptance criteria
- presenting `serial` vs `parallel_ab`
- recording plan approval or re-plan requests
- reviewing merge readiness after A/B verification and commit

`composer-chat-control.sh` still exists, but it is fallback-only.

## Execution Model

- `A`: the current repository root and current Codex thread
- `B`: an optional git worktree created by `composer-split.sh`

If the user approves `parallel_ab`, Codex Composer creates only the `B` worktree. The user then opens a separate Codex thread manually in that worktree.

## Parallel Policy

The planner may recommend `parallel_ab`, but the final mode remains pending until the user approves it. Local policy evaluation can force a downgrade to `serial` when:

- task boundaries overlap on concrete files
- task boundaries map to the same `conflict_group`
- task boundaries touch the same `core=true` component
- task boundaries match no repository files yet

## Verification And Commit

Verification is always explicit. `composer-verify.sh` runs the configured shell hooks for task `a`, task `b`, or `main`.

`composer-commit.sh` only succeeds after the corresponding task verification passes.

## Merge Review

Codex Composer does not merge branches automatically in the main MVP path. Instead:

1. A and B finish implementation.
2. A and B each pass verification.
3. A and B are committed.
4. The current Codex thread uses the integrator-reviewer prompt/skill to decide whether the run is ready for a manual merge.
5. The user merges manually, then runs `composer-verify.sh --target main`.
