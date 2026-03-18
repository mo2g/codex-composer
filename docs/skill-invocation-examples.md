# Skill Invocation Examples

These examples are written for Codex app usage in a repository that already has Codex Composer installed.

Recommended phrasing names the role directly. Compatible phrasing can still work, but is more likely to produce extra back-and-forth or file-path-driven behavior.

## 1. New Requirement With `planner`

Recommended:

```text
Use the repo's planner skill for run `login`. I want a React frontend and a Go backend for a login module. Clarify what is missing, tell me whether `parallel_ab` is actually safe, and give me the exact next commands without choosing the mode for me.
```

Compatible but less clear:

```text
Help me plan this new login feature and tell me what files I should read first.
```

## 2. Clarify Or Replan With `planner`

Recommended:

```text
Use the planner skill for run `login`. The scope changed: the login flow now has to stay compatible with the legacy token format. Re-check the current plan and tell me whether I should record `needs_replan`.
```

Compatible but less clear:

```text
The requirement changed. Can you revisit the plan?
```

## 3. Advance Task A With `task-owner`

Recommended:

```text
Use the repo's task-owner skill for run `login`, task `a`. Stay inside the approved A boundary, implement the frontend login flow, and stop when `verify --target a` and `commit --task a` should be the next explicit actions.
```

Compatible but less clear:

```text
Continue task A and get it ready.
```

## 4. Fix A Verify Failure With `task-owner`

Recommended:

```text
Use the task-owner skill for run `login`, task `a`. `verify --target a` failed because the frontend form validation path is incomplete. Fix only the approved A scope and stop once the branch is ready for another explicit verify.
```

Compatible but less clear:

```text
The A verification failed. Please fix it.
```

## 5. Merge Readiness With `integrator-reviewer`

Recommended:

```text
Use the repo's integrator-reviewer skill for run `login`. Inspect status, verify reports, and commit snapshots, then tell me whether I should record `allow_manual_merge`, `return_a`, or `return_b`.
```

Compatible but less clear:

```text
Are A and B ready to merge yet?
```

## 6. Manual Parallel Flow With A Current Thread And B Worktree

Recommended:

```text
In this current repository, use the planner skill for run `login` and help me finish `plan-review`. If I approve `parallel_ab`, I will open a new Codex thread in `.codex/local/worktrees/login/b`. In that second thread, use only the task-owner skill for task `b`.
```

Compatible but less clear:

```text
Split this into two tasks and tell me what to do in the other thread.
```

## 7. Continue Task B After `return_b`

Recommended:

```text
Use the task-owner skill for run `login`, task `b`, in the B worktree. The run came back through `return_b`. Fix only the backend token/session scope and stop when B is ready for `verify --target b` again.
```

Compatible but less clear:

```text
Continue the backend task from the B worktree.
```

## Prompting Guidance

- Prefer naming the skill directly: `planner`, `task-owner`, or `integrator-reviewer`.
- Mention the run id and, for execution work, the task id.
- Say whether you want planning, implementation, verify-fix follow-up, or merge readiness.
- Keep merge actions explicit. Even after an allow/go review, the merge itself remains manual.
