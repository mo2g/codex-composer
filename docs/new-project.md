# Existing Repo Quickstart

Codex Composer is intended to be installed directly into an existing git repository.

## 1. Install

From the repository you already opened in Codex:

```bash
curl -fsSL https://raw.githubusercontent.com/<owner>/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

If you are testing locally from the source checkout:

```bash
bash /path/to/codex-composer/install.sh --repo . --template existing --source /path/to/codex-composer
```

This installs:

- `AGENTS.md`
- `prompts/`
- `skills/`
- `schemas/`
- `scripts/`
- `tools/`
- `.codex-composer.toml`

## 2. Start A Run

```bash
./scripts/composer-start.sh --run login --requirement "做一个前后端分离的项目，前端用react，后端用golang,实现登录模块"
```

Then stay in the current Codex thread and follow the printed instructions.

## 3. Clarify And Plan

Use:

- `AGENTS.md`
- `skills/planner/SKILL.md`
- `.codex-composer/runs/<run-id>/clarifications.md`

When the user has clarified enough:

```bash
./scripts/composer-checkpoint.sh --run login --checkpoint clarify --decision clarified --note "..."
./scripts/composer-plan.sh --run login
```

At `plan-review`, record either:

```bash
./scripts/composer-checkpoint.sh --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
```

or:

```bash
./scripts/composer-checkpoint.sh --run login --checkpoint plan-review --decision force_serial --mode serial
```

## 4. Split Only If Needed

```bash
./scripts/composer-split.sh --run login
./scripts/composer-status.sh --run login
```

- `A` stays in the current repository root.
- `B` is created only when `parallel_ab` is approved.

## 5. Verify And Commit

After task implementation:

```bash
./scripts/composer-verify.sh --run login --target a
./scripts/composer-commit.sh --run login --task a
```

If `B` exists, repeat for `b`.

## 6. Manual Merge Readiness

When status reaches `merge-review`, use:

- `skills/integrator-reviewer/SKILL.md`

Then record the result:

```bash
./scripts/composer-checkpoint.sh --run login --checkpoint merge-review --decision allow_manual_merge
```

Merge branches manually, run:

```bash
./scripts/composer-verify.sh --run login --target main
./scripts/composer-summarize.sh --run login
```

## Compatibility Helpers

These are not the default onboarding path anymore:

- `composer-chat-control.sh`
- `composer-run-task.sh`
- `composer-integrate.sh`
