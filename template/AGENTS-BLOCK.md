## Codex App Template

- Skills: `planner`, `implementer`, `resume-work`, `change-check`, `debug-investigation`.
- Start complex work with `planner`, let it emit a Task Card, and only then write the plan.
- Stay in the current thread by default. Split only when work is independently reviewable and isolation helps.
- Keep workflow state in `docs/_codex/<task-slug>/` so paused work can resume from repository artifacts, including `debug.md` when active.
- Use `debug-investigation` and `docs/_codex/<task-slug>/debug.md` for flaky, timing-sensitive, or unclear-root-cause bugs.
- Use `docs/codex-task-card-workflow.md` and `docs/codex-debug-workflow.md` as the workflow source of truth.
- Use `change-check` to build verification evidence and map acceptance criteria to evidence or gaps.
- Merge stays manual.
