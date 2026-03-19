# Existing Repo Quickstart

Codex Composer is installed directly into a repository that you plan to use in Codex App.

## 1. Install

For the lowest-friction setup:

1. `git init` before installing, and make an initial commit as early as possible.
2. Install Codex Composer before opening the repo in Codex App when you can.
3. If the repo is already open in Codex App, restart Codex after install so repo rules can load.

From the target repository root:

```bash
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

For local testing from the source checkout:

```bash
bash /path/to/codex-composer/install.sh --repo . --template existing --source /path/to/codex-composer
```

The installer defaults to `--permission-profile balanced`. To keep the older conservative approval behavior, pass:

```bash
bash /path/to/codex-composer/install.sh --repo . --template existing --permission-profile safe --source /path/to/codex-composer
```

Installed layout:

- `AGENTS.md`
- `./codex-composer`
- `.agents/skills/codex-composer/`
- `.codex/protocol/`
- `.codex/config.toml`
- `.codex/rules/codex-composer.rules` for `balanced` and `wide_open`
- `.codex/local/runs/`
- `.codex/local/worktrees/`

`.codex/config.toml` is the repo-level shared configuration file. `.codex/local/` is runtime-local generated state.

If `./codex-composer` is already occupied, the installer falls back to `./composer-next`.

## 2. Permissions / Trust

- Trust the project in Codex App before you rely on repo-scoped `.codex/config.toml` or `.codex/rules/`.
- If the repo opens as untrusted, use `/permissions` or the App trust flow first. Otherwise Codex falls back to user-level defaults and ignores repo-scoped settings.
- `balanced` reduces repeated approvals for routine launcher commands such as `start`, `next`, `plan`, `checkpoint`, `split`, `status`, and `summarize`.
- `verify` and `commit` still prompt in `balanced` because they may execute project-defined hooks, touch git state, bind local ports, or require network access.
- `wide_open` is a local opt-in only. Use it only in a controlled personal environment:

```bash
bash /path/to/codex-composer/install.sh --repo . --template existing --permission-profile wide_open --source /path/to/codex-composer
```

- If `verify` still prompts in `balanced`, that is expected. Approve it, run the gate manually in an external terminal, or reinstall with a more permissive profile for that repository.

## 3. In Codex App

Start a run:

```bash
./codex-composer start --run login --requirement "Develop a login module using React and Golang"
./codex-composer next --run login
```

Then stay in the current Codex thread and name the skill directly. `AGENTS.md` provides the standing repo rules; `.codex/local/runs/<run-id>/...` remains supporting context, not the primary prompt surface.

Use `planner` first:

```text
Use the repo's planner skill for run `login`. Clarify what is missing, tell me whether `parallel_ab` is actually safe, and give me the exact next commands without choosing the mode for me.
```

Use `task-owner` for task A after plan approval:

```text
Use the repo's task-owner skill for run `login`, task `a`. Stay inside the approved A boundary, implement the missing work, and stop when `verify --target a` and `commit --task a` should be the next explicit actions.
```

If `parallel_ab` is approved, open a new Codex thread inside `.codex/local/worktrees/<run-id>/b` and use the same `task-owner` pattern for task `b`.

Use `integrator-reviewer` before any manual merge:

```text
Use the repo's integrator-reviewer skill for run `login`. Inspect status, verify reports, commit snapshots, required artifacts, and merge prerequisites, then tell me whether I should record `allow_manual_merge`, `return_a`, or `return_b`.
```

## 4. Human Gates

Keep the App prompts and the human gates separate. The assistant should drive the reasoning; you run the protocol commands at the checkpoints.

When clarification is complete:

```bash
./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
./codex-composer plan --run login
./codex-composer next --run login
```

At `plan-review`, record either:

```bash
./codex-composer checkpoint --run login --checkpoint plan-review --decision force_serial --mode serial
```

or:

```bash
./codex-composer checkpoint --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
```

When tasks are ready:

```bash
./codex-composer verify --run login --target a
./codex-composer commit --run login --task a
```

If `B` exists, repeat for `b`.

Before merge:

```bash
./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
```

If merge review is a no-go, send back only the failing task:

```bash
./codex-composer checkpoint --run login --checkpoint merge-review --decision return_a
./codex-composer checkpoint --run login --checkpoint merge-review --decision return_b
```

After the human manual merge:

```bash
./codex-composer verify --run login --target main
./codex-composer summarize --run login
```

Use `docs/manual-merge-checklist.md` for the full operator runbook, including App review before merge.

## 5. Supporting References

- `AGENTS.md`
- `.codex/config.toml`
- `.codex/local/runs/<run-id>/clarifications.md`
- `.codex/local/runs/<run-id>/PLAN.md`
- `.codex/local/runs/<run-id>/status.json`

These files help the current Codex thread inspect state, but they are not the main interaction surface.
