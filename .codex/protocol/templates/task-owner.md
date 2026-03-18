# Task Owner Template

Use this template only as thin runtime scaffolding for the repo-native `task-owner` skill.

## Runtime Role

- execution phase only
- one task boundary only
- supporting context only; the behavioral source of truth is `.agents/skills/codex-composer/task-owner/SKILL.md`
- hand off to explicit `verify` and `commit`

## Runtime Reminders

- invoke the `task-owner` skill first
- stay inside the approved include/exclude boundary
- do not edit workflow state files
- do not merge branches
