# Task Owner Template

Use this template only as thin runtime scaffolding for the repo-native `task-owner` skill.

## Runtime Role

- execution phase only
- one task boundary only
- supporting context only; the behavioral source of truth is `.agents/skills/codex-composer/task-owner/SKILL.md`
- hand off to explicit `verify` and `commit`
- task `A` stays in the current repo; task `B` stays in its dedicated worktree thread

## Runtime Reminders

- invoke the `task-owner` skill first
- read `.codex/config.toml`, the task brief, and the approved boundary before editing
- stay inside the approved include/exclude boundary
- do not edit workflow state files
- do not merge branches
- if deprecated protocol, skill, or config paths are detected, stop and tell the user to run `./codex-composer migrate`
