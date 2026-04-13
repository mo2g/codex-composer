# Codex App Template Source Repository

This repository is the source template for installing a low-friction Codex app workflow into other repositories.

## Repository Map

- `README.md`: human-facing explanation of the template and bootstrap flow
- `AGENTS.md`: source-repo collaboration rules
- `.codex/config.toml`: source-repo project defaults plus optional verification hints
- `.agents/skills/codex-template/`: reusable workflow skills and templates
- `template/`: files installed into target repositories
- `docs/`: workflow docs copied into target repositories
- `tools/`: installer entrypoints and bootstrap logic
- `test/`: contract and installer tests

## Commands

- Install dependencies: `npm install`
- Run contract tests: `npm test`

## Canonical Workflow Specs

Use these documents as the workflow source of truth:

* `docs/codex-task-card-workflow.md`: canonical task-card workflow
* `docs/codex-debug-workflow.md`: canonical debug workflow
* `docs/workflow-sync-rules.md`: rules for keeping workflow surfaces aligned

`AGENTS.md` should stay short. Put detailed operating rules in `docs/` and skill assets, then keep this file aligned with them.

## Skill Selection

- Use `planner` when scope or acceptance criteria are unclear, or the change spans multiple subsystems. It should clarify intent, produce a Task Card, and only then write the implementation plan.
- Use `implementer` when scope is approved and the task is ready to edit.
- Use `resume-work` when a non-trivial task is being continued across sessions, threads, or worktrees.
- Use `change-check` for the final evidence pass before commit or manual merge.
- Use `debug-investigation` for race conditions, flaky tests, intermittent failures, timing bugs, or any bug where the root cause is still unconfirmed.

## Core Workflow Model

For non-trivial work, treat the repository workflow as artifact-driven rather than chat-history-driven.

Recommended artifact layout:

```text
docs/_codex/<task-slug>/
  task-card.md
  journal.md
  acceptance-evidence.md
```

For debugging work, extend the artifact set to:

```text
docs/_codex/<task-slug>/
  task-card.md
  debug.md
  journal.md
  acceptance-evidence.md
```

## Constraints

1. Keep the terminology `Codex App Template` and `codex-template` consistent across docs, scripts, config, tests, and installed assets.
2. Keep the installable workflow in `template/`, `docs/`, and `.agents/skills/codex-template/` synchronized with the installer and tests.
3. Keep configuration responsibilities aligned: this source repo may keep stable verification hints in `.codex/config.toml`, but installed target repos should stay light by default and only add `.codex/config.toml` later when repo-owned defaults or verification hints are actually worth keeping.
4. Prefer bounded task shaping over repo-local orchestration: use Task Cards, journals, debug records, threads, and worktrees instead of adding a command-state machine.
5. Do not reintroduce bundled example scaffolds, disposable smoke wrappers, or repo-local protocol/state-machine concepts as the primary workflow.
6. Do not edit unrelated files or broaden scope to opportunistic cleanup.
7. Merge stays manual after verification and review.

## Task Shaping And Resume Rules

- For non-trivial work, `planner` should emit a Task Card before implementation starts.
- Keep one thread by default, and split only when the work is independently reviewable.
- For long-running or cross-session work, keep a small journal in a repo-owned path such as `docs/_codex/<task-slug>/journal.md`.
- Use `resume-work` to reconstruct intent from the Task Card, `debug.md` when present, journal, diff, and nearby tests before implementation resumes.
- Use `change-check` to map acceptance criteria to evidence, remaining gaps, explicit risks, and debug closure when applicable.
- Use `docs/codex-task-card-workflow.md` as the canonical description when workflow wording elsewhere is ambiguous.

## Debug Rules

For debugging work where the root cause is not yet confirmed:

- create `docs/_codex/<task-slug>/debug.md`
- list hypotheses before patching
- run one experiment per hypothesis
- keep each experiment attributable and as small as possible
- externalize every observation, experiment result, and conclusion into `debug.md`
- if the same direction fails twice without new supporting evidence, stop and re-rank hypotheses
- do not call the bug fixed unless the fix targets a confirmed cause and is verified against acceptance criteria

Use `docs/codex-debug-workflow.md` as the canonical description for debug-mode behavior.

## Documentation Sync

When the workflow changes, update all affected surfaces in the same change:

- `README.md`
- `AGENTS.md`
- `docs/codex-quickstart.md`
- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`
- `docs/workflow-sync-rules.md`
- `template/`
- `.agents/skills/codex-template/`
- installer logic and tests

## Definition Of Done

- Changes stay within approved scope.
- `npm test` passes.
- Installed assets, docs, skills, and tests use one consistent task-card and debug-workflow vocabulary.
- Risks, tradeoffs, and follow-ups are called out.
- Merge remains a human action.
