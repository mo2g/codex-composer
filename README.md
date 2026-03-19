# Codex Composer

Codex Composer is a protocol-first workflow template for using Codex inside an existing repository. It is built for Codex app users who want explicit planning, optional worktree-based parallelism, and auditable human gates before anything lands on `main`.

## In Codex App

Treat the current Codex thread as the planner/control thread. Name the skill directly, let `AGENTS.md` provide the standing repo rules, and use commands only at the explicit human gates.

For the lowest-friction setup in a new repository:

1. `git init` first and create an initial commit as early as possible.
2. Install Codex Composer before opening the repo in Codex App when you can.
3. Trust the project in Codex App, or use `/permissions` if the repo opened as untrusted.
4. If the repo was already open during install, restart Codex so repo rules can load.

Start a run:

```bash
./codex-composer start --run login --requirement "Develop a login module using React and Golang"
./codex-composer next --run login
```

Say this in the current Codex thread for planning:

```text
Use the repo's planner skill for run `login`. Clarify what is missing, tell me whether `parallel_ab` is actually safe, and give me the exact next commands without choosing the mode for me.
```

Say this for task A after plan approval:

```text
Use the repo's task-owner skill for run `login`, task `a`. Stay inside the approved A boundary, implement the missing work, and stop when `verify --target a` and `commit --task a` should be the next explicit actions.
```

If `parallel_ab` is approved, open a new Codex thread in `.codex/local/worktrees/<run-id>/b` and use the same `task-owner` pattern for task `b`.

Say this before any manual merge:

```text
Use the repo's integrator-reviewer skill for run `login`. Inspect status, verify reports, commit snapshots, required artifacts, and merge prerequisites, then tell me whether I should record `allow_manual_merge`, `return_a`, or `return_b`.
```

Human gates remain explicit:

```bash
./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
./codex-composer plan --run login
./codex-composer checkpoint --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
./codex-composer verify --run login --target a
./codex-composer commit --run login --task a
./codex-composer verify --run login --target b
./codex-composer commit --run login --task b
./codex-composer verify --run login --target main
./codex-composer summarize --run login
```

If `integrator-reviewer` returns go, record:

```bash
./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
```

If merge review sends one task back, record:

```bash
./codex-composer checkpoint --run login --checkpoint merge-review --decision return_a
./codex-composer checkpoint --run login --checkpoint merge-review --decision return_b
```

For full operator playbooks, see `docs/skill-invocation-examples.md`. For the human merge runbook, see `docs/manual-merge-checklist.md`.

## Relationship To Codex App

- Codex Composer leans into the App's skill, review, and worktree mental model.
- It intentionally keeps repo-local worktrees, protocol files, and explicit human gates instead of relying on hidden orchestration or auto-merge.
- Supporting files under `.codex/local/` and `.codex/protocol/` remain available for inspection, but they are not the primary prompt surface.
- The protocol source of truth is the run directory under `.codex/local/runs/<run-id>/`, especially `status.json`, `plan.json`, and `logs/`. App narration is convenience text, not the authoritative workflow state.
- App messages such as "planner started" or "still waiting" are not evidence of hidden subagents. The default model remains the current thread for `A` plus an optional `B` worktree thread only after explicit `parallel_ab` approval and `split`.

## Plan Failure Triage

1. Check whether `./codex-composer plan --run <id>` failed during local schema preflight. If it did, fix `.codex/protocol/schemas/plan.schema.json` first. A preflight failure stops before `codex exec` starts.
2. Only after preflight passes should you inspect `.codex/local/runs/<run-id>/logs/plan.meta.json`, `plan.stdout.log`, and `plan.stderr.log`.
3. If App text and local artifacts disagree, trust `status.json` and the run logs. App narration does not override the protocol state on disk.

## Permissions And Trust

- The installer now defaults to `--permission-profile balanced`.
- `balanced` generates `.codex/rules/codex-composer.rules` so routine launcher commands like `start`, `next`, `plan`, `checkpoint`, `split`, `status`, and `summarize` can avoid repeated approvals in a trusted project.
- `verify` and `commit` remain explicit in `balanced` because they may run project-defined hooks or mutate git state.
- `safe` skips generated rules and keeps the more conservative approval flow:

```bash
bash install.sh --repo . --template existing --permission-profile safe
```

- `wide_open` is an explicit local opt-in that allows the main launcher workflow, including `verify` and `commit`, without repeated prompts:

```bash
bash install.sh --repo . --template existing --permission-profile wide_open
```

- Project-scoped `.codex/config.toml` and `.codex/rules/` only take effect when Codex trusts the repo. If the project is untrusted, Codex ignores those layers and falls back to user defaults.
- `.codex/local/` remains a protected path under the default `workspace-write` sandbox. Composer reduces repeated approvals for its own launcher workflow, but it cannot make all project-defined tests, network access, or local port binding silent by default.
- If `verify` still prompts in `balanced`, that is expected. Either approve the action, run the gate manually in an external terminal, or reinstall with a more permissive profile in a controlled local environment.

## Design Principles

- `protocol-first`: skills, protocol assets, repo config, runtime state, and command behavior stay inspectable and versioned
- `non-subagent-default`: the main path does not depend on subagents
- `thread/worktree-first parallelism`: A stays in the current thread; B is an optional second Codex thread in a worktree
- `explicit gates`: `verify`, `commit`, and `merge-review` are deliberate checkpoints
- `manual merge only`: the framework prepares merge readiness; it never merges for the user

## Architecture

- Root-visible control surface:
  - `AGENTS.md`
  - `./codex-composer`
  - `./composer-next` only if the primary launcher name is already occupied
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
  - `.codex/rules/`
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

## Install

From the target repository root:

```bash
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

For local development of this repository:

```bash
bash /path/to/codex-composer/install.sh --repo /path/to/your-repo --template existing --source /path/to/codex-composer
```

To keep the old conservative behavior:

```bash
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing --permission-profile safe
```

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

## Docs

- `docs/new-project.md`
- `docs/protocol.md`
- `docs/state-machine.md`
- `docs/manual-merge-checklist.md`
- `docs/skill-invocation-examples.md`
- `docs/experimental-subagents.md`
- `docs/codex-native-mvp.md`
