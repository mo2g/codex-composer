# Codex App Template

A lightweight source template for adding a practical Codex App workflow to a repository.

## Map

- `AGENTS.md`: short source-repo map and maintenance rules
- `docs/codex-quickstart.md`: installed-repo first-pass and default loop
- `docs/codex-task-card-workflow.md`: canonical task-card and external-memory spec
- `docs/codex-debug-workflow.md`: canonical debug-mode spec
- `.agents/skills/codex-template/`: reusable execution skills
- `template/`: installed entrypoint files
- `test/`: installer and workflow contract tests

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
- Installed repositories stay lightweight by default.
- `docs/_codex/<task-slug>/` stays optional and is only for work that needs durable state.
- Merge stays manual after verification and review.
