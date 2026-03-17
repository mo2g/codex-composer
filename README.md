# Codex Composer

Codex Composer is a protocol-first workflow for using Codex inside an existing repository. The MVP keeps planning in the current Codex thread, uses explicit checkpoints, and only creates an optional `B` worktree when the user approves a parallel split.

## What It Optimizes For

- existing repositories, not only demos
- the current Codex thread as planner/control
- optional `A/B` parallel work without subagents
- explicit verify and commit gates
- manual merge, never hidden auto-merge

## Install Into An Existing Repository

From the target repository root:

```bash
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

For local development of this repository:

```bash
bash /path/to/codex-composer/install.sh --repo /path/to/your-repo --template existing --source /path/to/codex-composer
```

The installed layout is:

- root `AGENTS.md`
- root launcher `./codex-composer`
- hidden `.codex-composer/`
  - `protocol/`
  - `runs/`
  - `worktrees/`
  - `config.toml`

If the target repository already has a `codex-composer` file, the installer falls back to `./composer-next`.

## Happy Path

```bash
./codex-composer start --run login --requirement "做一个前后端分离的项目，前端用react，后端用golang,实现登录模块"
./codex-composer next --run login
```

Then stay in the current Codex thread:

1. Read `AGENTS.md` and `.codex-composer/protocol/skills/planner/SKILL.md`.
2. Update `.codex-composer/runs/login/clarifications.md`.
3. Record decisions and advance the run with the launcher:

```bash
./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
./codex-composer plan --run login
./codex-composer checkpoint --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
./codex-composer next --run login
```

After `next` performs the approved split:

- `A` stays in the current repository and current Codex thread.
- `B` is an optional worktree under `.codex-composer/worktrees/<run-id>/b`; open a new Codex thread there manually.

When each task is ready:

```bash
./codex-composer verify --run login --target a
./codex-composer commit --run login --task a
./codex-composer verify --run login --target b
./codex-composer commit --run login --task b
```

When status reaches `merge-review`, use `.codex-composer/protocol/skills/integrator-reviewer/SKILL.md` in the current thread, then record:

```bash
./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
```

Merge branches manually, then finish with:

```bash
./codex-composer verify --run login --target main
./codex-composer summarize --run login
```

## Main Commands

- `./codex-composer start`
- `./codex-composer next`
- `./codex-composer plan`
- `./codex-composer checkpoint`
- `./codex-composer split`
- `./codex-composer status`
- `./codex-composer verify`
- `./codex-composer commit`
- `./codex-composer summarize`

## What `next` Does

- `clarify` / `clarified`: prints what to edit and which checkpoint/plan command to run
- `plan-review`: prints the approval commands
- `plan-approved`: runs `split` automatically, then prints the new status
- `execute`: prints A/B worktree locations and verify/commit commands
- `merge-review`: prints the merge-readiness checklist
- `ready-to-merge`: prints the manual merge checklist plus `verify main` / `summarize`
- `completed`: prints the summary and PR body paths

## Summary Snapshots

`commit` stores task snapshots in `status.json`:

- `commit_sha`
- `commit_message`
- `changed_files`
- `committed_at`

`SUMMARY.md` and `PR_BODY.md` are generated from those snapshots, so they remain useful even after the user has already merged A and B back to `main`.

## Compatibility Helpers

These still exist in the source repository for compatibility and testing, but they are not the recommended onboarding path:

- `scripts/composer-chat-control.sh`
- `scripts/composer-run-task.sh`
- `scripts/composer-integrate.sh`

## Docs

- `docs/new-project.md`
- `docs/protocol.md`
- `docs/codex-native-mvp.md`
