# Codex Composer

Codex Composer is a protocol-first workflow for running Codex in short, reviewable phases instead of one long autonomous thread. It is designed around four ideas:

- Keep planning, coding, verification, and integration as separate stages.
- Let Codex propose a plan, but keep final decisions with the user.
- Use `git worktree` to isolate A/B task execution when parallel work is safe.
- Move test, lint, build, and benchmark loops into explicit shell hooks.

## Bootstrap A New Repo

Initialize a target project from this repository:

```bash
scripts/composer-init-repo.sh --repo /path/to/project --template react-go-minimal
cd /path/to/project
git add .
git commit -m "chore: bootstrap codex composer"
```

After bootstrap, the target repository is self-contained. You run `./scripts/...` from the target repo root and Codex uses the repo-local `AGENTS.md`, `prompts/`, `skills/`, `schemas/`, `scripts/`, and `tools/`.

## What This Repository Contains

- `AGENTS.md`: rules for Codex behavior inside a Codex Composer repo
- `prompts/`: reusable prompt templates for control-session planning, task execution, and integration review
- `skills/`: Codex skill packs mirroring the prompt templates
- `scripts/`: user-facing entrypoints for runs, planning, splitting, verification, integration, and summaries
- `schemas/`: JSON schemas for `plan.json` and `status.json`
- `tools/`: internal helpers used by the public scripts
- `examples/react-go-login/`: a React + Go example showing a `parallel_ab` split

## Workflow

1. Create a run with `./scripts/composer-new-run.sh`.
2. Start or resume the control session with `./scripts/composer-chat-control.sh`.
3. Generate a structured plan with `./scripts/composer-plan.sh`.
4. Review the plan in the control session. Codex records the user's decision in the run state.
5. Split the repo into A/B/AB worktrees with `./scripts/composer-split.sh`.
6. Execute A and B with `./scripts/composer-run-task.sh`.
7. Run branch verification with `./scripts/composer-verify.sh`.
8. Commit verified task branches with `./scripts/composer-commit.sh`.
9. Return to the control session for the pre-integrate gate.
10. Merge into `AB`, verify, then merge to the main branch with `./scripts/composer-integrate.sh`.
11. Generate summaries with `./scripts/composer-summarize.sh`.

## Requirements

- `bash`
- `git`
- `node >= 20`
- `codex`

## Quick Start

```bash
./scripts/composer-new-run.sh --run demo-login --requirement "Implement a React + Go login module"
./scripts/composer-chat-control.sh --run demo-login --checkpoint clarify
./scripts/composer-plan.sh --run demo-login
./scripts/composer-chat-control.sh --run demo-login --checkpoint plan-review
./scripts/composer-split.sh --run demo-login
./scripts/composer-run-task.sh --run demo-login --task a
./scripts/composer-run-task.sh --run demo-login --task b
./scripts/composer-verify.sh --run demo-login --target a
./scripts/composer-verify.sh --run demo-login --target b
./scripts/composer-commit.sh --run demo-login --task a
./scripts/composer-commit.sh --run demo-login --task b
./scripts/composer-chat-control.sh --run demo-login --checkpoint pre-integrate
./scripts/composer-integrate.sh --run demo-login
./scripts/composer-verify.sh --run demo-login --target ab
./scripts/composer-chat-control.sh --run demo-login --checkpoint publish
./scripts/composer-integrate.sh --run demo-login
./scripts/composer-summarize.sh --run demo-login
```

## Design Notes

- `parallel_ab` is a recommendation, not an automatic choice.
- The control session is interactive and long-lived.
- Task A and task B default to single-shot `codex exec`.
- All machine state lives under `.codex-composer/runs/<run-id>/`.
- New runs automatically add `.codex-composer/` to `.git/info/exclude`.
- Human decisions are stored in both `status.json` and `decisions.md`.

More detail lives in [docs/protocol.md](/Volumes/dev/web/mo2g/codex-composer/docs/protocol.md).
New-project instructions live in [docs/new-project.md](/Volumes/dev/web/mo2g/codex-composer/docs/new-project.md).
