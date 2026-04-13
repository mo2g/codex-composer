# Codex App Template

A lightweight source template for adding a practical Codex App workflow to a repository.

## What It Installs

- a short repository contract in `AGENTS.md`
- reusable `planner`, `implementer`, `resume-work`, `change-check`, and `debug-investigation` skills
- canonical workflow docs in `docs/`
- repository artifacts for task cards, journals, debug records, and acceptance evidence when work needs them

The template keeps those capabilities without adding a repo-local protocol or state machine.

## Quickstart

1. Run `npm install`.
2. Run `npm test`.
3. Bootstrap a target repository:

   ```bash
   bash install.sh --repo /path/to/repo --template existing --source .
   ```

4. In the target repo, read `AGENTS.md` and treat these as the source of truth:
   - `docs/codex-task-card-workflow.md`
   - `docs/codex-debug-workflow.md`

## Default Workflow

For non-trivial work:

1. Use `planner` to lock scope and emit a Task Card.
2. Use `implementer` for the approved bounded change.
3. Keep repository artifacts under `docs/_codex/<task-slug>/` when the task needs durable state.
4. Use `debug-investigation` when root cause is still unconfirmed.
5. Use `resume-work` when the task must be reconstructed from artifacts, diff, and nearby tests.
6. Use `change-check` before commit or manual merge.

Keep one thread by default. Split only when the work is independently reviewable. Keep merge manual.

## Repository Layout

```text
AGENTS.md
.agents/skills/codex-template/
docs/
template/
tools/
test/
install.sh
```

## Bootstrap Modes

- `existing`: add Codex workflow files to an existing repository
- `blank`: initialize an empty repository with template defaults

## Verification

- `npm test` validates the source template contract.
- Installed repositories stay lightweight by default and do not receive `.codex/config.toml` automatically.
- Optional repo-owned config can be added later when it provides real value.
