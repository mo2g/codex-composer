# Current-Thread MVP

The Codex Composer MVP is current-thread first and launcher first.

## What Codex Does

- current thread: clarify requirements, review the plan, continue task `A`, and review merge readiness
- optional B thread: only if the user approves a split and `split` creates a `B` worktree

## What The Installed Repository Provides

- `AGENTS.md`: defines checkpoints and guardrails
- `.codex/protocol/`: prompts, schemas, and tools
- `.codex/skills/`: namespaced Codex Composer skills
- `./codex-composer start`: creates a run
- `./codex-composer next`: recommends the next human action and auto-runs `split` after approval
- `./codex-composer status`: prints the current run state, worktrees, and verify/commit readiness
- `./codex-composer verify`, `./codex-composer commit`, `./codex-composer summarize`: keep verification, commit, and handoff explicit

## Recommended Flow

1. Install Codex Composer into the target repository.
2. Run `./codex-composer start`.
3. Use the current Codex thread to finish `clarify` and `plan-review`.
4. If the user approves a split, run `./codex-composer next`; it will execute `split` and print the updated status.
5. Continue `A` in the current repository.
6. If `B` exists, open a second Codex thread manually in the `B` worktree.
7. Verify and commit each task explicitly.
8. Use the current thread plus the integrator-reviewer skill to decide whether the run is ready for manual merge.
9. Merge manually, verify `main`, and generate the summary.
