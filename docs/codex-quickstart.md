# Codex App Quickstart

## First Pass In A Repository

1. Read `AGENTS.md`.
2. Inspect the repo manifests, nearby tests, and `.codex/config.toml` if the repository already keeps one.
3. Check whether the repository keeps extra skills under `.agents/skills/`.
4. If the task is not trivial, start with `planner`.

Use these docs as the workflow source of truth:

- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`

Typical verification signals:

- `package.json` and lockfiles
- `go.mod`
- `Cargo.toml`
- `pyproject.toml`
- test configs, scripts, CI entrypoints, and nearby test files
- optional hooks in `.codex/config.toml`

## When To Plan First

Use `planner` when:

- scope is ambiguous
- multiple subsystems are involved
- regression risk is meaningful
- you may need to split work into another thread or worktree

`planner` should:

- clarify the goal, success criteria, in-scope and out-of-scope behavior
- choose whether the work stays in the current thread or needs isolation
- emit a Task Card before implementation starts
- only then write the bounded implementation plan and `change-check` gate

A minimal Task Card should capture:

- `Mode` (`implementation` by default; `debug` when root cause is not yet confirmed)
- `Required artifacts`
- `Root-cause status` for debug work
- `Goal`
- `In scope`
- `Out of scope`
- `Files likely involved`
- `Acceptance criteria`
- `Verification gate`
- `Isolation`
- `Risks`

Use `implementer` once the intent is locked and the change is bounded and ready to code.
If debug mode is active and root cause is still unconfirmed, `implementer` should stay in minimal experiment mode or hand the task back to `debug-investigation` instead of making a broad fix.

## When To Use Debug Mode

Use `debug-investigation` when:

- root cause is not yet confirmed
- the issue is flaky, intermittent, timing-sensitive, or race-like
- previous fix attempts changed symptoms without proving cause

In debug mode, keep `docs/_codex/<task-slug>/debug.md` and follow the canonical rules in `docs/codex-debug-workflow.md`:

- list hypotheses before patching
- run one experiment per hypothesis
- keep experiments minimal and attributable
- externalize evidence after every experiment
- re-rank hypotheses after two failed attempts in one direction without new support

## When To Keep A Task Journal

- the task is likely to span multiple sessions
- multiple bounded steps are expected
- a worktree or branch handoff happened
- important decisions or verification evidence would be costly to rediscover

A task journal can live at `docs/_codex/<task-slug>/journal.md` and should stay small:

- current Task Card
- decisions made
- files changed
- verification evidence
- next smallest step

Use `resume-work` to reconstruct the task from the Task Card, `debug.md` when present, journal, diff, and nearby tests before coding resumes.

## When To Split Work

- Keep one thread by default.
- Use a new Codex thread when the work can be reviewed independently.
- Add a worktree when filesystem or branch isolation will reduce merge risk.

## Final Change Check

Use `change-check` when:

- implementation is complete or close enough for a final evidence pass
- the diff may need new or stronger tests
- a human needs verification evidence and commit guidance before commit or manual merge

`change-check` should:

- inspect the diff and nearby tests
- reconstruct the acceptance criteria and verification gate
- add or update direct tests when behavior changed
- detect the stack and choose the best-fit verification commands
- treat `.codex/config.toml` hooks as hints or overrides, not the only truth
- for debug tasks, confirm the root cause, ruled-out hypotheses, and whether the fix targets cause rather than only symptoms
- map each acceptance criterion to evidence, a gap, or an explicit risk
- report evidence, remaining risk, and a recommended commit message

If no reliable verification path can be inferred, stop and say why instead of claiming the change was fully verified.

When workflow wording is ambiguous, defer to `docs/codex-task-card-workflow.md` and `docs/codex-debug-workflow.md`.
