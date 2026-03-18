# Existing Repo Quickstart

Codex Composer is installed directly into a repository that is already open in Codex.

## 1. Install

From the target repository root:

```bash
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

For local testing from the source checkout:

```bash
bash /path/to/codex-composer/install.sh --repo . --template existing --source /path/to/codex-composer
```

Installed layout:

- `AGENTS.md`
- `./codex-composer`
- `.agents/skills/codex-composer/`
- `.codex/protocol/`
- `.codex/local/config.toml`
- `.codex/local/runs/`
- `.codex/local/worktrees/`

If `./codex-composer` is already occupied, the installer falls back to `./composer-next`.

## 2. Start A Run

```bash
./codex-composer start --run login --requirement "Develop a login module using React and Golang"
./codex-composer next --run login
```

The current Codex thread remains the planner/control thread.

## 3. Clarify And Plan

Use the current Codex thread in the `planner` role. The main supporting files are:

- `AGENTS.md`
- `.codex/local/runs/<run-id>/clarifications.md`
- `.codex/local/runs/<run-id>/PLAN.md`

When the user has clarified enough:

```bash
./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
./codex-composer plan --run login
./codex-composer next --run login
```

At `plan-review`, record either:

```bash
./codex-composer checkpoint --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
```

or:

```bash
./codex-composer checkpoint --run login --checkpoint plan-review --decision force_serial --mode serial
```

## 4. Split Only If Needed

After plan approval:

```bash
./codex-composer next --run login
./codex-composer status --run login
```

- `A` stays in the current repository root.
- `B` is created only when `parallel_ab` is approved.

Use `task-owner` for A in the current thread. If B exists, open a new Codex thread inside the B worktree and use `task-owner` there.

## 5. Verify And Commit

After task implementation:

```bash
./codex-composer verify --run login --target a
./codex-composer commit --run login --task a
```

If `B` exists, repeat for `b`.

## 6. Manual Merge Readiness

When status reaches `merge-review`, use:

- the `integrator-reviewer` role in the current Codex thread

Then record the result:

```bash
./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
```

The merge itself is manual. After merging, run:

```bash
./codex-composer verify --run login --target main
./codex-composer summarize --run login
```

## Migration

If the repository still uses a deprecated layout:

```bash
./codex-composer migrate
```

This applies to both:

- `.codex-composer/...`
- `.codex/skills/...`

For realistic prompt phrasing, see `docs/skill-invocation-examples.md`.
