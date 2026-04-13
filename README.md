# Codex App Template

A lightweight source template for adding a practical Codex App workflow to a repository.

## What It Installs

- a short repository contract in `AGENTS.md`
- canonical workflow docs in `docs/`
- reusable `planner`, `implementer`, `resume-work`, `change-check`, and `debug-investigation` skills
- optional repository artifacts under `docs/_codex/<task-slug>/` when work needs durable state

The template keeps those capabilities without adding a repo-local protocol or state machine.

## Source Of Truth

- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`
- `docs/workflow-sync-rules.md`

## Bootstrap

1. Run `npm install`.
2. Run `npm test`.
3. Bootstrap a target repository with `existing` to add the workflow to an existing repo, or `blank` to initialize an empty repo:

   ```bash
   bash install.sh --repo /path/to/repo --template existing --source .
   ```

4. In the target repo, read `AGENTS.md` first, then `docs/codex-quickstart.md`.

## Verification

- `npm test` validates the source template contract.
- Installed repositories stay lightweight by default and do not receive `.codex/config.toml` automatically.
- Optional repo-owned config can be added later when it provides real value.
- Keep merge manual.
