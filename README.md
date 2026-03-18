# Codex Composer

Codex Composer is a protocol-first workflow template for using Codex inside an existing repository. It keeps planning in the current Codex thread, treats worktrees as the primary parallelism mechanism, and forces verification and commit gates before any human merge.

## Design Principles

- `protocol-first`: prompts, skills, state files, and CLI behavior should be inspectable and versioned
- `non-subagent-default`: the main path does not depend on subagents
- `thread/worktree-first parallelism`: parallel work means current thread for A, optional new thread in a B worktree
- `explicit gates`: `verify`, `commit`, and `merge-review` are never implicit
- `manual merge only`: the framework prepares branches for merge; it never merges them for the user

## Design Tradeoffs

- More explicit checkpoints means slightly more ceremony, but far less hidden agent behavior
- Worktree-first parallelism is slower to automate than subagents, but easier to audit and recover
- A launcher plus state files is less magical than a fully autonomous agent, but much more predictable for Codex app users
- Compatibility is handled by an explicit migration command, not by permanent dual-write logic

## Architecture

- Root-visible control surface:
  - `AGENTS.md`
  - `./codex-composer`
  - `./composer-next` only when the primary launcher name is already taken
- Canonical managed assets:
  - `.codex/protocol/prompts/`
  - `.codex/protocol/schemas/`
  - `.codex/protocol/tools/`
  - `.codex/skills/codex-composer-planner/`
  - `.codex/skills/codex-composer-task-owner/`
  - `.codex/skills/codex-composer-integrator-reviewer/`
- Runtime-only state:
  - `.codex/local/config.toml`
  - `.codex/local/runs/`
  - `.codex/local/worktrees/`

The root `scripts/` and `tools/` directories remain as compatibility wrappers in the source repository. The canonical implementation lives under `.codex/`.

## Why `.codex` Instead Of `.codex-composer`

- It is closer to Codex’s native ecosystem shape
- It makes repo-local protocol assets feel like first-class Codex assets, not an external add-on
- It separates canonical Codex assets from runtime-local state more cleanly
- It avoids teaching users a parallel hidden directory convention that differs from the broader Codex mental model

## When To Use This

- You want Codex to work inside an existing multi-language repository
- You want optional A/B parallel development without adopting subagents as the default model
- You care about explicit review, reproducibility, and recovery after interruption
- You want a shareable open-source template rather than a private prompt bundle

## When Not To Use This

- You want fully autonomous branch integration or auto-merge
- You want subagents to be the primary implementation model
- Your workflow depends on Codex making irreversible decisions without human checkpoints
- Your repository cannot tolerate launcher scripts or repo-local workflow state

## Install

From the target repository root:

```bash
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

For local development of this repository:

```bash
bash /path/to/codex-composer/install.sh --repo /path/to/your-repo --template existing --source /path/to/codex-composer
```

## Happy Path

```bash
./codex-composer start --run login --requirement "做一个前后端分离的项目，前端用react，后端用golang,实现登录模块"
./codex-composer next --run login
```

Then stay in the current Codex thread:

1. Read `AGENTS.md` and `.codex/skills/codex-composer-planner/SKILL.md`
2. Update `.codex/local/runs/login/clarifications.md`
3. Advance the run with explicit commands:

```bash
./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
./codex-composer plan --run login
./codex-composer checkpoint --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
./codex-composer next --run login
```

After `next` performs the approved split:

- `A` stays in the current repository and current Codex thread
- `B` is an optional worktree under `.codex/local/worktrees/<run-id>/b`; open a new Codex thread there manually

When each task is ready:

```bash
./codex-composer verify --run login --target a
./codex-composer commit --run login --task a
./codex-composer verify --run login --target b
./codex-composer commit --run login --task b
```

When status reaches `merge-review`, use `.codex/skills/codex-composer-integrator-reviewer/SKILL.md` in the current thread, then record:

```bash
./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
```

The user merges manually. The required post-merge finish is:

```bash
./codex-composer verify --run login --target main
./codex-composer summarize --run login
```

## Commands

- `./codex-composer start`
- `./codex-composer next`
- `./codex-composer plan`
- `./codex-composer checkpoint`
- `./codex-composer split`
- `./codex-composer status`
- `./codex-composer verify`
- `./codex-composer commit`
- `./codex-composer summarize`
- `./codex-composer migrate`

## State Model

- `clarify`
- `clarified`
- `plan-review`
- `plan-approved`
- `execute`
- `merge-review`
- `ready-to-merge`
- `completed`

`next` never decides checkpoints, never runs `verify`, never runs `commit`, and never merges. It only performs the already-approved `split` step automatically.

## Migration Notes

- New installs only write `.codex`
- Existing `.codex-composer` repos should run:

```bash
./codex-composer migrate
```

- Compatibility with `.codex-composer` is deprecated and only kept as a transition path
- Once `.codex` exists, new writes go only to `.codex`

## Subagents

- Subagents are **not** the default execution model
- Default parallelism is current thread + optional new Codex thread + git worktree
- Experimental subagents are documented separately and limited to future read-only review/research scenarios
- Subagents must not auto-merge, must not write to `main`, and must not independently close cross-task work

## Docs

- `docs/new-project.md`
- `docs/protocol.md`
- `docs/state-machine.md`
- `docs/manual-merge-checklist.md`
- `docs/experimental-subagents.md`
- `docs/codex-native-mvp.md`
