# Codex App Playbooks

These playbooks are written for Codex App usage in a repository that already has Codex Composer installed.

The main interaction is direct skill invocation in the current Codex thread. `AGENTS.md` carries the standing repo rules automatically. Run files under `.codex/local/runs/<run-id>/` are supporting references when the assistant needs to inspect state, not the primary prompt surface.

Before using these playbooks in a new repository:

- trust the project in Codex App or use `/permissions`
- restart Codex if the repo was already open when Composer was installed
- expect `verify` and some project-defined hooks to still prompt in the default `balanced` permission profile
- run `verify` manually in an external terminal if local ports, network access, or project-specific hooks still create too much friction

## Script 1: New Run To `plan-review`

Use this when a new requirement has just been started and the current thread should act as the planner/control thread.

Human gate before prompting:

```bash
./codex-composer start --run login --requirement "Develop a login module using React and Golang"
./codex-composer next --run login
```

Say this in Codex App:

```text
Use the repo's planner skill for run `login`. Clarify what is missing, tell me whether `parallel_ab` is actually safe, and give me the exact next commands without choosing the mode for me.
```

Expected assistant behavior:

1. Review `AGENTS.md`, `.codex/config.toml`, and the active run files
2. Ask only for missing information that materially changes the plan
3. Explain `serial` vs `parallel_ab` in user-facing language
4. Give the exact next checkpoint or plan commands without choosing the mode for the user

Next human gate:

```bash
./codex-composer checkpoint --run login --checkpoint clarify --decision clarified --note "..."
./codex-composer plan --run login
./codex-composer checkpoint --run login --checkpoint plan-review --decision force_serial --mode serial
```

or:

```bash
./codex-composer checkpoint --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
```

## Script 2: Serial Execution

Use this when `plan-review` ended in `serial` and all work stays in the current repository and current Codex thread.

Human gate before prompting:

```bash
./codex-composer next --run login
./codex-composer status --run login
```

Say this in Codex App:

```text
Use the repo's task-owner skill for run `login`, task `a`. Stay inside the approved A boundary, implement the missing work, and stop when `verify --target a` and `commit --task a` should be the next explicit actions.
```

Expected assistant behavior:

1. Review the approved task brief and plan boundary
2. Implement only the approved A scope
3. Call out blockers instead of expanding scope or inventing a B task
4. Stop when explicit `verify` and `commit` are the next human actions

Next human gate:

```bash
./codex-composer verify --run login --target a
./codex-composer commit --run login --task a
```

## Script 3: Parallel A/B Execution

Use this when `plan-review` approved `parallel_ab`, task `A` stays in the current repo, and task `B` moves to a separate Codex thread in the B worktree.

Human gate before prompting:

```bash
./codex-composer next --run login
./codex-composer status --run login
```

Say this in the current Codex thread for task A:

```text
Use the repo's task-owner skill for run `login`, task `a`. Stay inside the approved A boundary, implement the missing work, and stop when `verify --target a` and `commit --task a` should be the next explicit actions.
```

Then open a new Codex thread in `.codex/local/worktrees/<run-id>/b` and say this for task B:

```text
Use the repo's task-owner skill for run `login`, task `b`, in the B worktree. Stay inside the approved B boundary, implement the missing work, and stop when `verify --target b` and `commit --task b` should be the next explicit actions.
```

Expected assistant behavior:

1. The current thread stays focused on A
2. The B thread stays focused on B
3. Neither thread crosses task boundaries or resolves overlap silently
4. Both threads stop when explicit `verify` and `commit` are the next human actions

Next human gate:

```bash
./codex-composer verify --run login --target a
./codex-composer commit --run login --task a
./codex-composer verify --run login --target b
./codex-composer commit --run login --task b
```

## Script 4: Verify Failure And `return_a` / `return_b` Recovery

Use this when `verify` fails for one task or merge review sends one task back for rework.

Human gate before prompting:

```bash
./codex-composer status --run login
```

Say this in the thread that owns the failing task:

```text
Use the repo's task-owner skill for run `login`, task `a`. `verify --target a` failed. Fix only the approved A scope and stop once the branch is ready for another explicit verify.
```

If the failing task is `b`, use the same pattern with task `b` in the B worktree thread.

Expected assistant behavior:

1. Read the verification failure or return reason
2. Fix only the approved task scope
3. Report blockers instead of crossing into the other task
4. Stop when another explicit `verify` is the next human action

Next human gate:

```bash
./codex-composer verify --run login --target a
./codex-composer commit --run login --task a
```

or, for task B:

```bash
./codex-composer verify --run login --target b
./codex-composer commit --run login --task b
```

## Script 5: `merge-review` To Manual Merge Handoff

Use this when all enabled tasks are verified and committed and the current thread should decide whether the run is actually ready for human merge.

Human gate before prompting:

```bash
./codex-composer status --run login
```

Say this in Codex App:

```text
Use the repo's integrator-reviewer skill for run `login`. Inspect status, verify reports, commit snapshots, required artifacts, and merge prerequisites, then tell me whether I should record `allow_manual_merge`, `return_a`, or `return_b`.
```

Expected assistant behavior:

1. Review verification evidence, commit snapshots, task briefs, and merge prerequisites
2. State a clear go / no-go judgment
3. If go, provide evidence completeness, App review readiness, merge order guidance, stop conditions, and post-merge gates
4. If no-go, say exactly which task or artifact blocks the merge and whether to use `return_a`, `return_b`, or stay in `merge-review`

Next human gate if merge-ready:

```bash
./codex-composer checkpoint --run login --checkpoint merge-review --decision allow_manual_merge
```

If merge review is a no-go:

```bash
./codex-composer checkpoint --run login --checkpoint merge-review --decision return_a
./codex-composer checkpoint --run login --checkpoint merge-review --decision return_b
```

Then use the App review surface and the human merge runbook:

- open the review pane or run an equivalent human diff review before merge
- follow `docs/manual-merge-checklist.md`
- after the manual merge, run:

```bash
./codex-composer verify --run login --target main
./codex-composer summarize --run login
```

## Prompting Guidance

- Name the skill directly: `planner`, `task-owner`, or `integrator-reviewer`
- Mention the run id every time
- Mention the task id for execution work
- Keep commands and prompts separate: the assistant reasons inside the thread, the human runs the gates
- Keep merge actions explicit even after a go / allow review
