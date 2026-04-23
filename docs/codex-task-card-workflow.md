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

Tasks in plan mode move through these states:

**Primary flow:**
```
planned -> in-progress -> verifying -> done
```

**Exception flows:**
```
planned -> abandoned
in-progress -> blocked-needs-user
in-progress -> blocked-needs-evidence
in-progress -> replanning
verifying -> blocked-needs-user
verifying -> replanning
```

**Recovery flows:**
```
blocked-needs-user -> in-progress (after user provides input)
blocked-needs-evidence -> in-progress (after evidence obtained)
replanning -> planned (after replan complete)
```

**State definitions:**
- `planned`: Task defined, dependencies may or may not be satisfied
- `in-progress`: Actively being implemented
- `verifying`: Implementation complete, undergoing verification
- `done`: All acceptance criteria met with evidence
- `blocked-needs-user`: Cannot proceed without user input (spec, decision, permission)
- `blocked-needs-evidence`: Cannot proceed without additional evidence (fixture, repro, data)
- `replanning`: Task needs restructuring (scope change, complexity too high, structural issues)
- `abandoned`: Task no longer needed

**Transitions to `blocked-needs-user` occur when:**
- Acceptance criteria cannot be determined from context
- Multiple valid implementations exist with different tradeoffs
- Missing reproduction case or real response samples
- External system permissions or credentials needed
- Cross-module refactoring required without authorization
- Root cause unconfirmed and continued patching would expand diff
- Failure budget exceeded

**Transitions to `blocked-needs-evidence` occur when:**
- Missing test fixtures or data
- No reproduction case available
- External API contract unknown
- Environment setup incomplete

**Transitions to `replanning` occur when:**
- Structural checks fail (hard fail)
- Task complexity requires splitting
- Scope changes invalidate current acceptance criteria
- Dependencies change requiring task restructuring

### Failure budget rules (hard constraints)

Each Task Card has a failure budget that acts as a hard stop on speculative attempts.

**Required tracking fields:**
- `attempt_count`: Total implementation attempts made
- `failed_attempt_count`: Attempts that failed verification
- `same_direction_retry_count`: Retries using the same approach without new evidence
- `last_new_evidence`: Timestamp/description of last genuinely new evidence

**Hard stop conditions (mandatory state transitions):**

1. `failed_attempt_count >= max_attempts`
   - **Action**: Transition to `blocked-needs-user`
   - **Required**: Write blocker record explaining what information is missing
   - **Prohibited**: Any further code changes until blocker resolved

2. `same_direction_retry_count >= max_same_direction_retries` without new evidence
   - **Action**: Transition to `replanning`
   - **Required**: Document dead end in journal, propose new approach
   - **Prohibited**: Continue with same approach

3. Root cause unconfirmed AND implementation started
   - **Action**: Force transition to `debug-investigation`
   - **Required**: Create/update `debug.md` with hypothesis table
   - **Prohibited**: Broad speculative fixes

4. No new evidence after `stop_if_no_new_evidence_after` attempts
   - **Action**: Transition to `blocked-needs-evidence`
   - **Required**: Document what evidence is needed
   - **Prohibited**: Further guesses without data

**What counts as "new evidence":**
- ✅ Narrowed scope of issue
- ✅ Ruled out a hypothesis
- ✅ Obtained real fixture/response/sample
- ✅ Discovered new error boundary or call chain
- ❌ Same test fails again
- ❌ Same patch produces same result
- ❌ Only added logging without new insight
- ❌ Rephrasing previous conclusion

**Responsibilities:**
- `implementer`: Must check failure budget before each change, update attempt counts
- `change-check`: Must verify attempt history is current, flag if budget exceeded
- `resume-work`: Must restore attempt history and blocker state, not just goals
- `task-orchestrator`: Enforces hard stops, orchestrates state transitions

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

### Plan Mode Walkthrough (End-to-End Example)

**Scenario**: Add a new authentication system with login, logout, and session refresh.

**Step 1: Create Epic and Task Cards**

```
docs/_codex/auth-epic/
├── epic-card.md
├── auth-01-login/
│   ├── task-card.md
│   ├── journal.md
│   └── acceptance-evidence.md
├── auth-02-logout/
│   ├── task-card.md
│   ├── journal.md
│   └── acceptance-evidence.md
└── auth-03-refresh/
    ├── task-card.md
    ├── journal.md
    └── acceptance-evidence.md
```

**Epic Card excerpt**:
```yaml
Goal: Add authentication system
Task List:
  - auth-01-login (decision+execution): Design and implement login endpoint
  - auth-02-logout (execution): Implement logout endpoint  
  - auth-03-refresh (execution): Implement session refresh
Dependency Graph:
  auth-01-login -> auth-02-logout
  auth-01-login -> auth-03-refresh
```

**Task Card excerpt (auth-01-login)**:
```yaml
Status: planned
Task Type: decision | execution
Dependencies: none
Complexity Score: 6
Failure Budget:
  Max attempts: 4
  Max same-direction retries: 2
Verification commands:
  - npm test -- auth/login.test.ts
  - npm run typecheck
```

**Step 2: Orchestrator Schedules First Task**

Invoke `task-orchestrator`:
- Reads Epic Card, finds `auth-01-login` has no dependencies → ready
- Checks failure budget (unused) → can proceed
- Dispatches to `implementer`

**Step 3: Implement First Task**

Invoke `implementer`:
- Checks failure budget → OK
- Implements login endpoint
- Updates `journal.md` with decisions and attempt count
- Completes → status becomes `verifying`

**Step 4: Verify and Complete First Task**

Invoke `change-check`:
- Runs `npm test -- auth/login.test.ts`
- Runs `npm run typecheck`
- Performs structural checks
- Writes `acceptance-evidence.md`
- Passes → status becomes `done`

**Step 5: Orchestrator Schedules Next Tasks**

Invoke `task-orchestrator`:
- `auth-01-login` is `done`
- Both `auth-02-logout` and `auth-03-refresh` dependencies satisfied → ready
- Selects `auth-02-logout` (lower complexity)
- Dispatches to `implementer`

**Step 6: Handle a Blocked Task**

During `auth-03-refresh`, discovers session store API is undocumented:

Invoke `task-orchestrator`:
- Status becomes `blocked-needs-evidence`
- Writes `blockers.md`:
  ```yaml
  Blocker ID: B01
  Type: missing-contract
  Blocks: auth-03-refresh
  Required: Session store API documentation or sample responses
  ```
- Stops scheduling until resolved

**Step 7: Resume After User Provides Input**

User adds API documentation to ticket. Invoke `task-orchestrator`:
- Reads `blockers.md`, sees B01 resolved
- Transitions `auth-03-refresh` from `blocked-needs-evidence` → `in-progress`
- Dispatches to `implementer`

**Step 8: Epic Complete**

All tasks `done`. Invoke `task-orchestrator`:
- Updates Epic progress: 3/3 complete, 0 blocked
- Epic status → `done`

## Strong constraints

### One card = one reviewable change

Split into another card when any of these differs:

- acceptance criteria
- verification gate
- isolation boundary
- expected reviewer surface area

### Structural checks are hard gates

**Hard fail (must transition to `replanning`):**
- Function exceeds 100 lines without clear decomposition
- Single file grows by >200 lines without architectural justification
- Introduction of circular dependencies
- UI/domain/infra layers mixed without explicit architecture decision
- New "god" function/hook/util that violates single responsibility

**Soft fail (must document residual risk):**
- Module boundary clarity questionable but not violated
- New abstraction lacks immediate reuse point but has potential
- Test coverage partial due to external dependencies
- Minor coupling introduced that doesn't block current scope

**Actions on structural issues:**
- `change-check`: Must run structural checks, classify as hard/soft fail
- `planner`: Must document structure impact before implementation
- `implementer`: Must check structure impact before changes, escalate if constraints violated
- `task-orchestrator`: Enforces transition to `replanning` on hard fail

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
