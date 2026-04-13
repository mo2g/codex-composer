# Workflow Sync Rules

Keep the Codex workflow description consistent across the repository.

## Files that should stay aligned

- `README.md`
- `AGENTS.md`
- `docs/codex-quickstart.md`
- `docs/codex-task-card-workflow.md`
- `docs/codex-debug-workflow.md`
- `.agents/skills/codex-template/WORKFLOW.md`
- `.agents/skills/codex-template/EXTERNAL-MEMORY.md`
- skill docs and templates for `planner`, `implementer`, `resume-work`, and `change-check`
- skill docs and templates for `debug-investigation`
- installer tests that prove these files are copied into target repositories

## Canonical source

Use `docs/codex-task-card-workflow.md` as the main workflow spec.
Use `docs/codex-debug-workflow.md` as the debug-mode workflow spec.

Other files should either:

- summarize it
- point to it
- apply it to a narrower context

## Update together when these change

- Task Card structure
- Task Card debug metadata such as mode, required artifacts, and root-cause status
- task journal structure
- acceptance evidence structure
- split rules
- external memory rules
- debug artifact layout, hypothesis rules, and debug-closure rules
- human review boundary

## Drift to avoid

- one file says planning is optional while another says it is required
- one file assumes conversational memory is enough after compression
- verification rules differ across quickstart, skills, and AGENTS
- installed docs mention debugging but the installed skill list omits `debug-investigation`
