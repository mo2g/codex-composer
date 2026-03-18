# Codex Composer

Codex Composer is a protocol-first workflow template for using Codex inside an existing repository. It keeps planning in the current Codex thread, treats worktrees as the primary parallelism mechanism, and forces explicit verification and commit gates before any human merge.

## Design Principles

- `protocol-first`: workflow assets, prompts, state, and command behavior stay inspectable and versioned
- `non-subagent-default`: the main path does not depend on subagents
- `thread/worktree-first parallelism`: parallel work means current thread for A and an optional new thread in a B worktree
- `explicit gates`: `verify`, `commit`, and `merge-review` are always deliberate
- `manual merge only`: the framework prepares branches for merge readiness; it never merges for the user

## Design Tradeoffs

- More explicit checkpoints adds ceremony, but removes hidden agent behavior
- Worktree-first parallelism is less automatic than subagents, but easier to audit and recover
- Splitting Codex-native discovery from internal protocol assets adds structure, but makes the repository semantics much clearer
- Migration is handled explicitly through `migrate`, not through permanent multi-path writes

## Architecture

- Root-visible control surface:
  - `AGENTS.md`
  - `./codex-composer`
  - `./composer-next` only if the primary launcher name is already taken
- Codex-native discovery layer:
  - `.agents/skills/codex-composer/planner/`
  - `.agents/skills/codex-composer/task-owner/`
  - `.agents/skills/codex-composer/integrator-reviewer/`
- Internal protocol layer:
  - `.codex/protocol/templates/`
  - `.codex/protocol/schemas/`
  - `.codex/protocol/tools/`
- Runtime-only state:
  - `.codex/local/config.toml`
  - `.codex/local/runs/`
  - `.codex/local/worktrees/`

The root `scripts/` and `tools/` directories remain as compatibility wrappers in the source repository. The canonical implementation lives under `.codex/` and `.agents/`.

## Why `.agents/skills` And `.codex/protocol`

- `.agents/skills` is the Codex-native discovery layer for repo-local skills
- `.codex/protocol` is the internal workflow layer for templates, schemas, and tooling
- This split keeps skill discovery separate from runtime orchestration
- It avoids teaching users that internal workflow assets and discoverable skills live in the same directory tree

## When To Use This

- You want Codex to work inside an existing multi-language repository
- You want optional A/B parallel development without making subagents the default model
- You care about explicit review, reproducibility, and interruption recovery
- You want a shareable open-source template instead of a private prompt bundle

## When Not To Use This

- You want automatic merge or autonomous branch integration
- You want subagents to be the primary implementation path
- You want Codex to make irreversible decisions without human checkpoints
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
./codex-composer start --run login --requirement "Develop a login module using React and Golang"
./codex-composer next --run login
```

Then stay in the current Codex thread:

1. Read `AGENTS.md` and `.agents/skills/codex-composer/planner/SKILL.md`
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

When status reaches `merge-review`, use `.agents/skills/codex-composer/integrator-reviewer/SKILL.md` in the current thread, then record:

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

- New installs write:
  - `.agents/skills/codex-composer/*`
  - `.codex/protocol/*`
  - `.codex/local/*`
- Existing `.codex-composer` repos should run:

```bash
./codex-composer migrate
```

- Existing intermediate repos with `.codex/skills/*` should also run:

```bash
./codex-composer migrate
```

- Compatibility with `.codex-composer` and `.codex/skills` is deprecated and only kept long enough for migration
- Once `.agents` and `.codex/local` exist, new writes go only to the new layout

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
