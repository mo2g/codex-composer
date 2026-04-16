# Codex App Template Upgrade Guide

Use upgrade mode when a repository was already bootstrapped with this template and you want to refresh the managed template assets.

## Preconditions

Upgrade mode is only valid for an **existing Git repository**.

If the target path is not already a Git repository, upgrade mode should fail instead of initializing a new repository. This keeps upgrade behavior explicit and prevents accidental writes to the wrong directory.

## Commands

Preview the upgrade without changing files:

```bash
bash install.sh --repo /path/to/repo --template existing --source . --upgrade --dry-run
```

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

Important clarification:

- `README.md` is skipped even when it is missing
- upgrade mode must not recreate or restore a template README into a repository that intentionally removed or renamed it

## Dry Run

Use `--dry-run` before a real upgrade when you want to inspect the planned actions first.

Dry run reports actions such as:

- `create`
- `overwrite`
- `upsert`
- `skip`

Dry run should not write files.

## Why This Stays Lightweight

Upgrade mode refreshes only the managed template surface. It does not introduce a repo-local protocol or state machine, and it does not force durable artifacts on repositories that do not want them.

## Recommended Upgrade Flow

1. Confirm the target path is the correct existing Git repository.
2. Run `--upgrade --dry-run`.
3. Review the reported `create`, `overwrite`, `upsert`, and `skip` actions.
4. Run `--upgrade`.
5. Review the diff.
6. Run repository tests.
7. Commit the upgrade manually.
