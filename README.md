# Codex Composer

Codex Composer is a protocol-first workflow template for using Codex inside an existing repository. It is built for Codex app users who want explicit planning, optional worktree-based parallelism, and auditable human gates before anything lands on `main`.

The default model is deliberately conservative:

- the current Codex thread is the planner/control thread
- optional parallel work happens through a user-opened B thread inside a git worktree
- `verify` and `commit` stay explicit
- merge stays manual

## Design Principles

- `protocol-first`: skills, protocol assets, repo config, runtime state, and command behavior stay inspectable and versioned
- `non-subagent-default`: the main path does not depend on subagents
- `thread/worktree-first parallelism`: A stays in the current thread; B is an optional second Codex thread in a worktree
- `explicit gates`: `verify`, `commit`, and `merge-review` are deliberate checkpoints
- `manual merge only`: the framework prepares merge readiness; it never merges for the user

## How This Maps To Codex App Usage

- In the current Codex thread, use the repo-native `planner` skill to clarify scope and review the plan.
- Task `A` usually continues in the same thread with the `task-owner` skill.
- If `parallel_ab` is approved, `next` creates only the optional B worktree. You then open a second Codex thread there and use the same `task-owner` skill for B.
- When A and B are verified and committed, return to the current thread and use `integrator-reviewer` for merge readiness.
- The actual merge still happens manually in git, followed by `verify --target main` and `summarize`.

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
- Repo-level shared config:
  - `.codex/config.toml`
- Runtime-local generated state:
  - `.codex/local/runs/`
  - `.codex/local/worktrees/`

The source repository still keeps root `scripts/` and `tools/` as thin compatibility wrappers for maintenance and legacy installs. The canonical implementation lives under `.agents/` and `.codex/`.

## Why `.agents/skills` And `.codex/protocol`

- `.agents/skills` is the discoverable repo-native layer Codex can match against directly
- `.codex/protocol` is the internal workflow layer for templates, schemas, and tooling
- `.codex/config.toml` stores repo-level shared Codex Composer configuration
- `.codex/local` keeps runtime-local generated state separate from both discoverable skills and reusable protocol assets
- This split keeps role discovery, orchestration logic, shared configuration, and runtime state from blurring together

## Repo Config Vs Runtime State

- `.codex/config.toml` is the canonical repo-level shared configuration file. It is part of the installed template layout and is the only active config input.
- `.codex/local/runs/` and `.codex/local/worktrees/` are runtime-scoped local state generated as runs execute.
- `.codex/local/` is not the repo-level config layer. Older `.codex/local/config.toml` installs should be upgraded with `./codex-composer migrate`.

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

Start a run:

```bash
./codex-composer start --run login --requirement "Develop a login module using React and Golang"
./codex-composer next --run login
```

Then keep the current Codex thread in the `planner` role:

```bash
./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
./codex-composer plan --run login
./codex-composer checkpoint --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
./codex-composer next --run login
```

Recommended role flow:

1. Current thread uses `planner` for `clarify` and `plan-review`.
2. After approval, `next` prepares A in the current repo and creates B only if `parallel_ab` was approved.
3. Current thread uses `task-owner` for A.
4. If B exists, open a new Codex thread in `.codex/local/worktrees/<run-id>/b` and use `task-owner` there for B.
5. Verify and commit each enabled task explicitly.
6. Return to the current thread and use `integrator-reviewer` for `merge-review`.
7. Follow `docs/manual-merge-checklist.md`, merge manually, then verify `main` and generate the final handoff text.

Verification and commit remain explicit:

```bash
./codex-composer verify --run login --target a
./codex-composer commit --run login --task a
./codex-composer verify --run login --target b
./codex-composer commit --run login --task b
./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
./codex-composer verify --run login --target main
./codex-composer summarize --run login
```

For realistic prompt examples, see `docs/skill-invocation-examples.md`.

## Why Subagents Are Not The Default

- Worktree-first parallelism is easier to inspect, recover, and explain than hidden agent orchestration.
- Current-thread control makes approval boundaries obvious.
- Explicit `verify`, `commit`, and manual merge keep the workflow auditable.
- Subagents remain a future experimental option for read-only review or research, not for default implementation or merge flow.

## When To Use This

- You want Codex to work inside an existing multi-language repository
- You want optional A/B parallel development without making subagents the main model
- You care about explicit review, reproducibility, and interruption recovery
- You want a shareable open-source workflow template instead of a private prompt bundle

## When Not To Use This

- You want automatic merge or autonomous branch integration
- You want subagents to be the primary implementation path
- You want Codex to make irreversible decisions without human checkpoints
- Your repository cannot tolerate launcher scripts or repo-local workflow state

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

## Contributor Notes

- Canonical files live under `.agents/` and `.codex/`. Root `scripts/` and `tools/` exist for compatibility and source-repo maintenance.
- Use `npm test` or `make test` for the repository test suite.
- Use `make validate-tmp` for the local smoke validation.
- If `/tmp/codex-composer` is already populated, rerun smoke with `BASE_DIR=/tmp/codex-composer-<suffix> make validate-tmp`.
- `make live-smoke` is opt-in only after real Codex auth is configured.
- The repository does not currently define separate lint, format, or typecheck commands.

## Migration / Compatibility Notes

- New installs write only:
  - `.agents/skills/codex-composer/*`
  - `.codex/protocol/*`
  - `.codex/config.toml`
  - `.codex/local/*`
- Existing `.codex-composer` repos, intermediate `.codex/skills/*` repos, and repositories that still keep shared config at `.codex/local/config.toml` should run:

```bash
./codex-composer migrate
```

- Compatibility with `.codex-composer`, `.codex/skills`, and `.codex/local/config.toml` is deprecated and only kept long enough for migration.
- Once `.agents`, `.codex/config.toml`, and `.codex/local` exist, new writes go only to the canonical layout.

## Docs

- `docs/new-project.md`
- `docs/protocol.md`
- `docs/state-machine.md`
- `docs/manual-merge-checklist.md`
- `docs/skill-invocation-examples.md`
- `docs/experimental-subagents.md`
- `docs/codex-native-mvp.md`
