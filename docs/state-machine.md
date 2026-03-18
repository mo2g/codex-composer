# State Machine

If `start`, `status`, or `next` warns that the repository is still using a deprecated layout, run `./codex-composer migrate` first and then resume the state machine.

## `clarify`

- Entry conditions:
  - `start` created the run
  - no accepted clarify decision yet
- Recommended skill:
  - `planner` in the current Codex thread
- Allowed commands:
  - `checkpoint --checkpoint clarify --decision clarified`
  - `status`
  - `next`
- Exit conditions:
  - clarify decision recorded
- Recovery notes:
  - if the repository still uses deprecated workflow assets, migrate first
  - edit `clarifications.md`, then re-run `checkpoint`

## `clarified`

- Entry conditions:
  - clarify decision recorded
- Recommended skill:
  - `planner` in the current Codex thread
- Allowed commands:
  - `plan`
  - `next`
  - `status`
- Exit conditions:
  - `plan` writes `plan.json` and moves state to `plan-review`
- Recovery notes:
  - if status warns about deprecated skill or protocol paths, migrate first
  - if clarification changed, update `clarifications.md` before rerunning `plan`

## `plan-review`

- Entry conditions:
  - `plan.json` and `PLAN.md` exist
- Recommended skill:
  - `planner` in the current Codex thread
- Allowed commands:
  - `checkpoint --decision approve_parallel --mode parallel_ab`
  - `checkpoint --decision force_serial --mode serial`
  - `checkpoint --decision needs_replan`
  - `status`
  - `next`
- Exit conditions:
  - approved mode moves to `plan-approved`
  - `needs_replan` moves back to `clarify`
- Recovery notes:
  - if status warns about deprecated paths, migrate first
  - re-open the planner skill in the current thread and record a new decision

## `plan-approved`

- Entry conditions:
  - a plan-review decision approved `serial` or `parallel_ab`
- Recommended skill:
  - `planner` in the current Codex thread until `split` is done
- Allowed commands:
  - `split`
  - `next`
  - `status`
- Exit conditions:
  - `split` moves to `execute`
- Recovery notes:
  - if `split` was not run yet, `next` is the safest continuation path

## `execute`

- Entry conditions:
  - A is prepared in the current repo
  - B worktree exists only if `parallel_ab` was approved
- Recommended skill:
  - `task-owner` in the current thread for A
  - `task-owner` in a separate B worktree thread for B, if enabled
- Allowed commands:
  - `verify --target a|b`
  - `commit --task a|b`
  - `status`
  - `next`
- Exit conditions:
  - verified and committed tasks advance to `merge-review` when all enabled tasks are ready
- Recovery notes:
  - `return_a` or `return_b` sends the flow back here
  - B recovery is manual: reopen the B worktree thread yourself

## `merge-review`

- Entry conditions:
  - all enabled tasks are verified and committed
- Recommended skill:
  - `integrator-reviewer` in the current Codex thread
- Allowed commands:
  - `checkpoint --decision allow_manual_merge`
  - `checkpoint --decision return_a`
  - `checkpoint --decision return_b`
  - `status`
  - `next`
- Exit conditions:
  - allow moves to `ready-to-merge`
  - return moves back to `execute`
- Recovery notes:
  - use the integrator-reviewer skill before recording the decision

## `ready-to-merge`

- Entry conditions:
  - integrator-reviewer has allowed manual merge
- Recommended skill:
  - no new execution skill; the user performs the merge manually
- Allowed commands:
  - manual `git merge`
  - `verify --target main`
  - `summarize`
  - `status`
  - `next`
- Exit conditions:
  - `verify --target main` passing moves to `completed`
- Recovery notes:
  - if merge is delayed, state remains stable here

## `completed`

- Entry conditions:
  - `verify --target main` passed
- Recommended skill:
  - no required role; `integrator-reviewer` may be revisited only if handoff text needs another review pass
- Allowed commands:
  - `summarize`
  - `status`
  - `next`
- Exit conditions:
  - terminal state
- Recovery notes:
  - rerun `summarize` if the summary or PR body needs regeneration
