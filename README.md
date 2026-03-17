# Codex Composer

Codex Composer is a protocol-first workflow for using Codex inside an existing repository. The default MVP keeps planning in the current Codex thread, uses skills and prompts for consistency, and only creates an optional `B` worktree when the user explicitly approves a parallel split.

## What The MVP Optimizes For

- existing repositories, not greenfield demos only
- the current Codex thread as planner/control
- optional `A/B` parallel work without subagents
- explicit verification and commit gates
- manual merge, never hidden auto-merge

## Install Into An Existing Repository

From the target repository root:

```bash
curl -fsSL https://raw.githubusercontent.com/<owner>/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

During local development of this repository, the same bootstrap works without GitHub:

```bash
bash /path/to/codex-composer/install.sh --repo /path/to/your-repo --template existing --source /path/to/codex-composer
```

## Main Flow

1. In the target repo, create a run:

```bash
./scripts/composer-start.sh --run login --requirement "做一个前后端分离的项目，前端用react，后端用golang,实现登录模块"
```

2. Stay in the current Codex thread and use the planner guidance from:
   - `AGENTS.md`
   - `skills/planner/SKILL.md`

3. Record clarify and plan-review decisions with:

```bash
./scripts/composer-checkpoint.sh --run login --checkpoint clarify --decision clarified --note "..."
./scripts/composer-plan.sh --run login
./scripts/composer-checkpoint.sh --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
```

4. Prepare execution:

```bash
./scripts/composer-split.sh --run login
./scripts/composer-status.sh --run login
```

5. Execution model:
   - `A`: keep working in the current repository and current Codex thread.
   - `B`: if enabled, open a new Codex thread manually in the printed `B` worktree path.

6. After each task is implemented:

```bash
./scripts/composer-verify.sh --run login --target a
./scripts/composer-commit.sh --run login --task a
./scripts/composer-verify.sh --run login --target b
./scripts/composer-commit.sh --run login --task b
```

7. When status reaches `merge-review`, use `skills/integrator-reviewer/SKILL.md` in the current thread, then record:

```bash
./scripts/composer-checkpoint.sh --run login --checkpoint merge-review --decision allow_manual_merge
```

8. Merge branches manually, then verify main and generate the handoff text:

```bash
./scripts/composer-verify.sh --run login --target main
./scripts/composer-summarize.sh --run login
```

## Key Scripts

- `install.sh`: one-command bootstrap into an existing repository
- `scripts/composer-start.sh`: create a run and print the current-thread planner instructions
- `scripts/composer-plan.sh`: generate `plan.json` and `PLAN.md`
- `scripts/composer-split.sh`: keep the current repo as `A`, and create `B` worktree only when needed
- `scripts/composer-status.sh`: print the next step, worktree paths, task prompt paths, and verify/commit status
- `scripts/composer-verify.sh`: run explicit verification hooks
- `scripts/composer-commit.sh`: commit only after verification passes
- `scripts/composer-summarize.sh`: generate `SUMMARY.md` and `PR_BODY.md`

## Compatibility Helpers

These remain available but are not the primary path:

- `scripts/composer-chat-control.sh`
- `scripts/composer-run-task.sh`
- `scripts/composer-integrate.sh`

## Documents

- `docs/new-project.md`
- `docs/protocol.md`
- `docs/codex-native-mvp.md`
