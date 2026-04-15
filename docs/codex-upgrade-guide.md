# Codex App Template Upgrade Guide

Use upgrade mode when a repository was already bootstrapped with this template and you want to refresh the managed template assets.

## Commands

Preview the upgrade without changing files:

```bash
bash install.sh --repo /path/to/repo --template existing --source . --upgrade --dry-run
````

Apply the upgrade:

```bash
bash install.sh --repo /path/to/repo --template existing --source . --upgrade
```

`--upgrade` only supports `--template existing`.

## Upgrade Policy

### Overwrite

Upgrade mode overwrites the template-managed docs and `codex-template` skills:

- `docs/codex-quickstart.md`
- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`
- `docs/codex-upgrade-guide.md`
- `.agents/skills/codex-template/**`

### Upsert

Upgrade mode upserts the managed block inside:

- `AGENTS.md`

Repo-owned content outside the managed block is preserved.

### Skip

Upgrade mode does not modify:

- `README.md`
- `.codex/config.toml`
- `docs/_codex/` task artifacts

These are treated as repo-owned or task-owned state.

## Why This Stays Lightweight

Upgrade mode refreshes only the managed template surface. It does not introduce a repo-local protocol or state machine, and it does not force durable artifacts on repositories that do not want them.

## Recommended Upgrade Flow

1. Run `--upgrade --dry-run`.
2. Review the reported `create`, `overwrite`, `upsert`, and `skip` actions.
3. Run `--upgrade`.
4. Review the diff.
5. Run repository tests.
6. Commit the upgrade manually.