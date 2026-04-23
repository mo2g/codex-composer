# Workflow Sync Rules

Keep the Codex workflow description consistent across the repository.

## Canonical Ownership

| Rule/Policy | Canonical Home | Others Should |
|-------------|----------------|---------------|
| Workflow spec | `docs/codex-task-card-workflow.md` | Reference, not duplicate |
| Debug mode | `docs/codex-debug-workflow.md` | Reference, not duplicate |
| Structural checks | `ACCEPTANCE-EVIDENCE-TEMPLATE.md` | Summarize + link |
| Task states | `STATE-MACHINE.md` | Use exact enum |
| Source-of-truth order | `workflow-sync-rules.md` (this file) | Brief pointer |
| Entry path | `AGENTS.md` → `codex-quickstart.md` | Keep minimal |
| Verification | `.codex/config.toml` hooks | Reference command |

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
- skill docs and templates for `task-orchestrator` (plan mode)
- `EPIC-CARD-TEMPLATE.md` and `BLOCKER-TEMPLATE.md` (plan mode)
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
- task journal structure and resumability fields (recovery priority, required logging fields)
- acceptance evidence structure
- split rules
- external memory rules
- debug artifact layout, hypothesis rules, and debug-closure rules
- human review boundary
- plan mode state definitions and transitions
- failure budget tracking fields
- structural check hard/soft fail rules
- verification commands and done criteria (for Codex execution)
- review expectations and reviewer guidance
- AGENTS.md / AGENTS-BLOCK.md content (root and template must stay aligned)

## Drift to avoid

- one file says planning is optional while another says it is required
- one file assumes conversational memory is enough after compression
- verification rules differ across quickstart, skills, and AGENTS
- installed docs mention debugging but the installed skill list omits `debug-investigation`
