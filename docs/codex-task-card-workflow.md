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

The Task Card should record the working mode and artifact set explicitly enough that a fresh Codex thread can tell whether the task is normal implementation work or an active debug investigation. When debug mode is enabled, the card should also record whether root cause is still unconfirmed.

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
- record the current mode and required artifacts, including debug state when applicable
- create or refresh `task-card.md`
- split work into multiple cards when one card stops being reviewable

It should not start coding during the planning pass.

### `implementer`

Responsible for the smallest useful change that advances the current Task Card.

It should:

- stay inside the approved boundary
- stay in experiment mode, or defer back to `debug-investigation`, when debug mode is active and root cause is still unconfirmed
- update direct tests when behavior changes
- keep `journal.md` current after meaningful progress and keep `debug.md` current when the task is still in debug mode

### `resume-work`

Responsible for reconstruction when conversational context is weak or stale.

It should:

- read `AGENTS.md`
- read `task-card.md`, `debug.md` when debug mode is active, and `journal.md`
- inspect the current diff and nearby tests
- reconstruct the current mode, root-cause status, and verification gate
- call out drift between notes and code truth
- propose the next bounded step before editing

### `change-check`

Responsible for evidence, not merge.

It should:

- reconstruct acceptance criteria from the Task Card
- run the narrowest reliable verification path first
- for debug tasks, use `docs/codex-debug-workflow.md` to close the debug loop: confirm which hypothesis became the root cause, which hypotheses were ruled out, and whether the fix targets cause rather than only symptoms
- map each criterion to evidence, a gap, or a residual risk
- write or refresh `acceptance-evidence.md`
- suggest commit messages without taking merge responsibility
- perform structural acceptance checks: function length, file size growth, module boundary clarity

### `task-orchestrator` (optional, for plan mode)

Responsible for global task scheduling, failure budget tracking, and escalation decisions in complex multi-card work.

It should:

- read Epic Card and all Task Cards to identify currently executable tasks
- check dependencies and determine which tasks are ready to execute
- verify tasks stay within their assigned failure budget
- recommend model class based on complexity score
- decide transitions between implement, check, debug, replan, or ask-user states
- escalate to `blocked-needs-user` when information is missing or failure budget is exceeded

## Plan mode (optional enhancement)

For complex tasks that span multiple reviewable changes, use plan mode to coordinate work through a task graph.

### Task graph structure

Plan mode represents work as a directed graph of tasks rather than a linear sequence:

- **Task nodes**: Individual reviewable units with clear acceptance criteria
- **Dependency edges**: Which tasks must complete before others start
- **Complexity scores**: 1-10 estimate used for model selection and split decisions
- **Model class**: `cheap`, `standard`, or `strong` recommendation
- **Failure budget**: Maximum attempts and retry rules before escalation

### Extended Task Card fields (plan mode)

When operating in plan mode, Task Cards should include:

- `task_type`: `decision` | `execution` | `verification` | `question` | `investigation`
- `dependencies`: List of Task Card IDs that must complete first
- `complexity_score`: 1-10 (1-3 = cheap, 4-6 = standard, 7+ = strong or split)
- `model_class`: `cheap` | `standard` | `strong`
- `failure_budget`: Object with `max_attempts`, `max_same_direction_retries`, `stop_if_no_new_evidence_after`
- `blocker_policy`: Escalation rules when blocked
- `structure_impact`: Notes on module boundaries, file responsibilities, test structure

### Task states

Tasks in plan mode move through states:

```
planned -> in-progress -> verifying -> done
   |           |              |
   v           v              v
blocked-needs-user  replanning  abandoned
```

Transitions to `blocked-needs-user` occur when:
- Acceptance criteria cannot be determined from context
- Multiple valid implementations exist with different tradeoffs
- Missing reproduction case or real response samples
- External system permissions or credentials needed
- Cross-module refactoring required without authorization
- Root cause unconfirmed and continued patching would expand diff

### Failure budget rules

Each Task Card has a failure budget that limits speculative attempts:

- Track `attempt_count`, `failed_attempt_count`, `same_direction_retry_count`
- Stop conditions:
  - 2 consecutive changes fail verification with no new evidence → escalate
  - 3 retries in same direction without progress → block and replan
  - Root cause unconfirmed but implementation started → force investigation mode

"New evidence" means: narrowed scope, ruled out hypothesis, obtained real fixture/response, discovered new error boundary. Not: same test fails again, same patch produces same result, only logging added.

### Epic Card (for multi-task work)

Complex requirements use an Epic Card to coordinate multiple Task Cards:

- Goal, non-goals, scope
- Global acceptance criteria
- Task list with IDs
- Dependency graph (text or diagram)
- User decision points
- Global blockers
- Progress summary

Epic Cards live at `docs/_codex/<epic-slug>/epic-card.md` alongside their Task Cards.

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
5. If root cause is still unconfirmed, switch to the debug workflow and keep `debug.md` current.
6. Resume from artifacts when needed.
7. Verify with `change-check`.
8. Materialize `acceptance-evidence.md`.
9. Keep commit and merge manual.

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

Plan mode adds these optional assets:

- `.agents/skills/codex-template/planner/EPIC-CARD-TEMPLATE.md`
- `.agents/skills/codex-template/planner/BLOCKER-TEMPLATE.md`
- `.agents/skills/codex-template/task-orchestrator/SKILL.md`

Debug-specific operating rules live in `docs/codex-debug-workflow.md` and should extend this spec rather than replace it.

Repositories that diverge from this spec should update their local `AGENTS.md`, skills, and docs together instead of changing only one surface.
