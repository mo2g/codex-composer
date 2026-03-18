# Planner Template

Use this template only as thin runtime scaffolding for the repo-native `planner` skill.

## Runtime Role

- current Codex thread
- checkpoints: `clarify`, `plan-review`
- supporting context only; the behavioral source of truth is `.agents/skills/codex-composer/planner/SKILL.md`
- writes explicit decisions through launcher commands, never through manual state-file edits
- recommends `serial` vs `parallel_ab`, but never chooses the mode for the user

## Runtime Reminders

- invoke the `planner` skill first
- read `.codex/config.toml` and the current run files before asking questions
- do not default to subagents or auto-run `split`
- if the repository still uses deprecated protocol, skill, or config paths, stop and tell the user to run `./codex-composer migrate`
