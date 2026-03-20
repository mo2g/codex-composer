# Codex App Template Source Repository

This repository is the source template for installing a low-friction Codex app workflow into other repositories.

## Repository Map

- `README.md`: human-facing explanation of the template and bootstrap flow
- `AGENTS.md`: source-repo collaboration rules
- `.codex/config.toml`: verification contract for this source repository
- `.agents/skills/codex-template/`: the only skills maintained by this template
- `template/`: files installed into target repositories
- `docs/`: workflow docs copied into target repositories
- `tools/`: installer entrypoints and bootstrap logic
- `test/`: contract and installer tests

## Commands

- Install dependencies: `npm install`
- Run contract tests: `npm test`

## Skill Selection

- Use `planner` when scope or acceptance criteria are unclear, or the change spans multiple subsystems.
- Use `implementer` when scope is approved and the task is ready to edit.
- Use `merge-check` for final merge-readiness review after verification.

## Constraints

1. Keep the terminology `Codex App Template` and `codex-template` consistent across docs, scripts, config, tests, and installed assets.
2. Keep the installable workflow in `template/`, `docs/`, and `.agents/skills/codex-template/` synchronized with the installer and tests.
3. Keep verification commands aligned: source-repo defaults belong in `.codex/config.toml`, and target-repo defaults are generated into the installed `.codex/config.toml`.
4. Do not reintroduce bundled example scaffolds, disposable smoke wrappers, or repo-local protocol/state-machine concepts as the primary workflow.
5. Do not edit unrelated files or broaden scope to opportunistic cleanup.
6. Merge stays manual after verification and review.

## Documentation Sync

When the workflow changes, update all affected surfaces in the same change:

- `README.md`
- `AGENTS.md`
- `template/`
- `docs/`
- `.agents/skills/codex-template/`
- installer logic and tests

## Definition Of Done

- Changes stay within approved scope.
- `npm test` passes.
- Installed assets, docs, config, and tests use one consistent vocabulary.
- Risks, tradeoffs, and follow-ups are called out.
- Merge remains a human action.
