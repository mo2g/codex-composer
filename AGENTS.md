# Codex App Template Source Repository

This repository is the source template for installing a low-friction Codex app workflow into other repositories.

## Repository Map

- `README.md`: human-facing explanation of the template and bootstrap flow
- `AGENTS.md`: source-repo collaboration rules
- `.codex/config.toml`: source-repo project defaults plus optional verification hints
- `.agents/skills/codex-template/`: the only skills maintained by this template
- `template/`: files installed into target repositories
- `docs/`: workflow docs copied into target repositories
- `tools/`: installer entrypoints and bootstrap logic
- `test/`: contract and installer tests

## Commands

- Install dependencies: `npm install`
- Run contract tests: `npm test`

## Skill Selection

- Use `planner` when scope or acceptance criteria are unclear, or the change spans multiple subsystems. It should clarify intent, produce a Task Card, and only then write the implementation plan.
- Use `implementer` when scope is approved and the task is ready to edit.
- Use `resume-work` when a non-trivial task is being continued across sessions, threads, or worktrees.
- Use `change-check` for the final evidence pass before commit or manual merge.

## Constraints

1. Keep the terminology `Codex App Template` and `codex-template` consistent across docs, scripts, config, tests, and installed assets.
2. Keep the installable workflow in `template/`, `docs/`, and `.agents/skills/codex-template/` synchronized with the installer and tests.
3. Keep configuration responsibilities aligned: this source repo may keep stable verification hints in `.codex/config.toml`, but installed target repos should stay light by default and only add `.codex/config.toml` later when repo-owned defaults or verification hints are actually worth keeping.
4. Prefer bounded task shaping over repo-local orchestration: use Task Cards, optional task journals, threads, and worktrees instead of adding a command-state machine.
5. Do not reintroduce bundled example scaffolds, disposable smoke wrappers, or repo-local protocol/state-machine concepts as the primary workflow.
6. Do not edit unrelated files or broaden scope to opportunistic cleanup.
7. Merge stays manual after verification and review.

## Task Shaping And Resume Rules

- For non-trivial work, `planner` should emit a Task Card before implementation starts.
- Keep one thread by default, and split only when the work is independently reviewable.
- For long-running or cross-session work, keep a small task journal in a repo-owned path such as `docs/_codex/<task-slug>.md`.
- A task journal should be minimal and current: accepted goal, key decisions, files changed, verification evidence, and the next smallest step.
- Use `resume-work` to reconstruct intent from the Task Card, task journal, diff, and nearby tests before implementation resumes.

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
- Installed assets, docs, config, and tests use one consistent lightweight, dynamic-verification vocabulary.
- Risks, tradeoffs, and follow-ups are called out.
- Merge remains a human action.
