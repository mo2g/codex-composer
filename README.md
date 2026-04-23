# Codex App Template

A lightweight source template for adding a practical Codex App workflow to a repository.

## Documentation Map

**Start here:**
- `AGENTS.md` — Quick reference for this source repository
- `docs/codex-quickstart.md` — 5-step default loop for installed repos

**Workflow specs (canonical):**
- `docs/codex-task-card-workflow.md` — Task Card workflow + Plan Mode spec
- `docs/codex-debug-workflow.md` — Debug mode spec
- `docs/workflow-sync-rules.md` — What must stay synchronized

**Templates:**
- `.agents/skills/codex-composer/planner/TASK-CARD-TEMPLATE.md` — Single task template
- `.agents/skills/codex-composer/planner/EPIC-CARD-TEMPLATE.md` — Multi-task Epic template
- `.agents/skills/codex-composer/task-orchestrator/` — Plan mode scheduler

**Operations:**
- `docs/codex-upgrade-guide.md` — Upgrade behavior for installed repositories
- `test/` — Contract tests (run `npm test` after any template/skill change)
- `template/` — Files installed into target repositories

## Bootstrap

1. Run `npm install`.
2. Run `npm test`.
3. Bootstrap a target repository with `existing` to add the workflow to an existing repo, or `blank` to initialize an empty repo:

```bash
bash install.sh --repo /path/to/repo --template existing --source .
```

4. In the target repo, read `AGENTS.md` first, then `docs/codex-quickstart.md`.

## Upgrade Installed Repositories

For repositories already bootstrapped with this template:

```bash
# Preview
bash install.sh --repo /path/to/repo --template existing --source . --upgrade --dry-run

# Apply
bash install.sh --repo /path/to/repo --template existing --source . --upgrade
```

See `docs/codex-upgrade-guide.md` for the full policy.

## Verification

- `npm test` validates the source template contract
- See `docs/workflow-sync-rules.md` for maintenance policy
