# Codex Task-Card Workflow Specification

This document is the canonical workflow spec for repositories bootstrapped from this template branch.

It defines one consistent model for:

- task shaping
- external memory
- resume behavior
- acceptance evidence
- human review boundaries

## Core model

A non-trivial task should be represented as **one reviewable Task Card** plus **one external memory set**.

Recommended artifact layout:

```text
docs/_codex/<task-slug>/
  task-card.md
  journal.md
  acceptance-evidence.md
```

## Roles in the workflow

### `planner`

Responsible for shaping work before coding.

It should:

- inspect the current code and nearby tests
- lock goal, scope, acceptance criteria, verification gate, and isolation choice
- create or refresh `task-card.md`
- split work into multiple cards when one card stops being reviewable

It should not start coding during the planning pass.

### `implementer`

Responsible for the smallest useful change that advances the current Task Card.

It should:

- stay inside the approved boundary
- update direct tests when behavior changes
- keep `journal.md` current after meaningful progress

### `resume-work`

Responsible for reconstruction when conversational context is weak or stale.

It should:

- read `AGENTS.md`
- read `task-card.md` and `journal.md`
- inspect the current diff and nearby tests
- call out drift between notes and code truth
- propose the next bounded step before editing

### `change-check`

Responsible for evidence, not merge.

It should:

- reconstruct acceptance criteria from the Task Card
- run the narrowest reliable verification path first
- map each criterion to evidence, a gap, or a residual risk
- write or refresh `acceptance-evidence.md`
- suggest commit messages without taking merge responsibility

## Strong constraints

### One card = one reviewable change

Split into another card when any of these differs:

- acceptance criteria
- verification gate
- isolation boundary
- expected reviewer surface area

### Code truth beats note truth

When notes disagree with the diff or tests:

- trust the code and tests
- repair the notes
- do not continue implementation from stale notes

### External memory is required for long-running work

Use external memory when the task is likely to:

- span multiple sessions
- survive context compression
- cross thread or worktree boundaries
- require auditable acceptance evidence later

## Minimal operating loop

1. Plan with `planner`.
2. Materialize or refresh `task-card.md`.
3. Implement the next bounded step.
4. Update `journal.md`.
5. Resume from artifacts when needed.
6. Verify with `change-check`.
7. Materialize `acceptance-evidence.md`.
8. Keep commit and merge manual.

## Human review boundary

A reviewer should be able to determine all of the following without reading the full Codex conversation:

- what the task intended to change
- what was explicitly out of scope
- what code truth currently exists
- what evidence proves each acceptance criterion
- what remains risky or unverified

## Relationship to installed skill assets

This spec is implemented by these installed assets:

- `.agents/skills/codex-template/WORKFLOW.md`
- `.agents/skills/codex-template/EXTERNAL-MEMORY.md`
- `.agents/skills/codex-template/planner/TASK-CARD-TEMPLATE.md`
- `.agents/skills/codex-template/resume-work/TASK-JOURNAL-TEMPLATE.md`
- `.agents/skills/codex-template/change-check/ACCEPTANCE-EVIDENCE-TEMPLATE.md`

Repositories that diverge from this spec should update their local `AGENTS.md`, skills, and docs together instead of changing only one surface.
