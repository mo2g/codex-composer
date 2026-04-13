# Workflow Sync Rules

Keep the Codex workflow description consistent across the repository.

## Files that should stay aligned

- `README.md`
- `AGENTS.md`
- `docs/codex-quickstart.md`
- `docs/codex-task-card-workflow.md`
- `.agents/skills/codex-template/WORKFLOW.md`
- `.agents/skills/codex-template/EXTERNAL-MEMORY.md`
- skill docs and templates for `planner`, `implementer`, `resume-work`, and `change-check`
- installer tests that prove these files are copied into target repositories

## Canonical source

Use `docs/codex-task-card-workflow.md` as the main workflow spec.

Other files should either:

- summarize it
- point to it
- apply it to a narrower context

## Update together when these change

- Task Card structure
- task journal structure
- acceptance evidence structure
- split rules
- external memory rules
- human review boundary

## Drift to avoid

- one file says planning is optional while another says it is required
- one file assumes conversational memory is enough after compression
- verification rules differ across quickstart, skills, and AGENTS
