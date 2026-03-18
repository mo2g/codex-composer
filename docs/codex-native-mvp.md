# Current-Thread MVP

The Codex Composer MVP is current-thread first, launcher first, and manual-merge only.

## In Codex App

- current thread: use `planner`, then `task-owner` for A, then `integrator-reviewer`
- optional B thread: only if the user approves a split and `split` creates a `B` worktree
- `AGENTS.md` provides the standing repo rules; the run files are supporting context

Recommended prompts:

```text
Use the repo's planner skill for run `login`. Clarify what is missing, tell me whether `parallel_ab` is actually safe, and give me the exact next commands without choosing the mode for me.
```

```text
Use the repo's task-owner skill for run `login`, task `a`. Stay inside the approved A boundary, implement the missing work, and stop when `verify --target a` and `commit --task a` should be the next explicit actions.
```

```text
Use the repo's integrator-reviewer skill for run `login`. Inspect status, verify reports, commit snapshots, required artifacts, and merge prerequisites, then tell me whether I should record `allow_manual_merge`, `return_a`, or `return_b`.
```

## What The Installed Repository Provides

- `AGENTS.md`: defines checkpoints and guardrails
- `.agents/skills/codex-composer/`: repo-native skills discoverable by Codex
- `.codex/config.toml`: repo-level shared Codex Composer configuration
- `.codex/protocol/`: internal templates, schemas, and tools
- `.codex/local/`: runtime-local run state and worktrees
- `./codex-composer start`: creates a run
- `./codex-composer next`: recommends the next human action and auto-runs `split` after approval
- `./codex-composer status`: prints the current run state, worktrees, and verify/commit readiness
- `./codex-composer verify`, `./codex-composer commit`, `./codex-composer summarize`: keep verification, commit, and handoff explicit

## Human Gates

1. Install Codex Composer into the target repository.
2. Run `./codex-composer start`.
3. Use `planner` in the current thread to finish `clarify` and `plan-review`.
4. If the user approves a split, run `./codex-composer next`; it will execute `split` and print the updated status.
5. Continue `A` in the current repository with `task-owner`.
6. If `B` exists, open a second Codex thread manually in the `B` worktree and use `task-owner` there.
7. Verify and commit each task explicitly.
8. Use `integrator-reviewer` in the current thread to decide whether the run is ready for manual merge.
9. Review the branch in the Codex App review surface, merge manually, verify `main`, and generate the summary.

For full operator playbooks, see `docs/skill-invocation-examples.md`. For the human merge runbook, see `docs/manual-merge-checklist.md`.
