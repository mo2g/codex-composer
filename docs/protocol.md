# Codex Composer Protocol

Codex Composer treats Codex as a planning and implementation engine, not as an always-on autonomous orchestrator.

## Goals

- keep sessions short and stage-bounded
- preserve explicit user approval at high-risk transitions
- make A/B parallel work possible without hiding the git mechanics
- persist enough state to resume after a failed or interrupted step

## Bootstrap

The intended v1 UX is repo-local:

1. Run `scripts/composer-init-repo.sh --repo <path> --template empty|react-go-minimal` from the source repository.
2. Move into the target repository.
3. Review the bootstrapped files and create a baseline commit before the first run.
4. Use `./scripts/...` from the target repository root.

After bootstrap, the target repository contains its own `AGENTS.md`, `prompts/`, `skills/`, `schemas/`, `scripts/`, and `tools/`.

## Run Layout

Each run lives in `.codex-composer/runs/<run-id>/`.

- `requirements.md`: original requirement or bug report
- `clarifications.md`: accepted answers from checkpoint 1
- `PLAN.md`: human-readable plan review
- `plan.json`: machine-readable plan
- `decisions.md`: checkpoint history
- `status.json`: machine-readable state machine
- `sessions.json`: session ids and thread markers
- `tasks/`: per-task prompt material
- `verify/`: hook results
- `logs/`: command output and raw Codex JSONL streams

New runs automatically add `.codex-composer/` to `.git/info/exclude` so the state directory does not block clean-worktree checks.

## Control Session

The control session is the main interactive Codex thread. It is responsible for:

- asking for missing acceptance criteria
- presenting planning alternatives
- recording plan approval or re-plan requests
- gating A/B integration and publish readiness

The session is identified with a thread marker like `CC:<run-id>:control`. After the interactive `codex` command exits, `scripts/composer-chat-control.sh` binds the latest matching session id from `~/.codex/session_index.jsonl` into the run state.

## Parallel Policy

The planner may recommend `parallel_ab`, but the final mode remains pending until the user approves it. Local policy evaluation can force a downgrade to `serial` when:

- task boundaries overlap on concrete files
- task boundaries map to the same `conflict_group`
- task boundaries touch the same `core=true` component
- task boundaries match no repository files yet, which means the repository does not expose stable evidence for a safe split

## Verification

Codex Composer never treats tests, lint, or builds as an internal hidden loop. Verification is always an explicit script invocation against a configured shell hook. A failed hook moves the run back to a blocked state and requires the user to decide the next action in the control session.

## Integration

`composer-integrate.sh` is phase-aware:

- before `AB` exists, it merges task branches into the integration branch
- after `AB` passes verification and publish is approved, it merges `AB` into the main branch

This keeps verification between `AB` and `main` explicit instead of burying it in one automatic chain.
