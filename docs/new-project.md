# New Project Usage

This repository now supports bootstrapping a target project into a self-contained Codex Composer repo.

## Bootstrap

From the source repository:

```bash
scripts/composer-init-repo.sh --repo /path/to/project --template react-go-minimal
```

Supported templates:

- `empty`: protocol files only, no frontend/backend scaffold
- `react-go-minimal`: protocol files plus a minimal `frontend/` and `backend/` layout

After bootstrap:

```bash
cd /path/to/project
git add .
git commit -m "chore: bootstrap codex composer"
```

The baseline commit is important because `composer-split.sh` requires a clean worktree before creating A/B/AB worktrees.

## Running In Codex

Inside the target repo:

```bash
./scripts/composer-new-run.sh --run login --requirement "做一个前后端分离的项目，前端用react，后端用golang,实现登录模块"
./scripts/composer-chat-control.sh --run login --checkpoint clarify
./scripts/composer-plan.sh --run login
./scripts/composer-chat-control.sh --run login --checkpoint plan-review
```

Then continue with:

```bash
./scripts/composer-split.sh --run login
./scripts/composer-run-task.sh --run login --task a
./scripts/composer-run-task.sh --run login --task b
./scripts/composer-verify.sh --run login --target a
./scripts/composer-verify.sh --run login --target b
./scripts/composer-commit.sh --run login --task a
./scripts/composer-commit.sh --run login --task b
./scripts/composer-chat-control.sh --run login --checkpoint pre-integrate
./scripts/composer-integrate.sh --run login
./scripts/composer-verify.sh --run login --target ab
./scripts/composer-chat-control.sh --run login --checkpoint publish
./scripts/composer-integrate.sh --run login
./scripts/composer-verify.sh --run login --target main
./scripts/composer-summarize.sh --run login
```

## Checkpoint Expectations For The Login Example

Requirement:

`做一个前后端分离的项目，前端用react，后端用golang,实现登录模块`

Expected behavior in `empty`:

- `clarify` asks whether the repository should first establish a frontend/backend scaffold
- `plan-review` should not blindly approve `parallel_ab`
- local policy should downgrade to `serial` because task boundaries do not match repository files yet

Expected behavior in `react-go-minimal`:

- `clarify` should ask for acceptance criteria such as token shape and login flow expectations
- `plan-review` should recommend `parallel_ab`
- task A should own `frontend/**`
- task B should own `backend/**`
- `pre-integrate` should gate the `AB` branch after A/B verification
- `publish` should gate the final merge back to `main`

## Automated Validation

For reproducible filesystem-level validation with the fake Codex harness, run:

```bash
scripts/validate-tmp-examples.sh
```

That script bootstraps:

- `/tmp/codex-composer/empty-login`
- `/tmp/codex-composer/react-go-login`

and writes a report to `/tmp/codex-composer/validation-report.md`.
