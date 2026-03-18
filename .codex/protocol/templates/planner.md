# Planner Template

Use this template only as runtime scaffolding for the planner skill.

## Runtime Role

- current Codex thread
- checkpoints: `clarify`, `plan-review`
- writes explicit decisions through launcher commands, never through manual state-file edits

## Runtime Reminders

- read the planner skill first
- read the current run files before asking questions
- recommend `serial` vs `parallel_ab`, but do not decide for the user
- if the repository still uses a deprecated skill path, stop and tell the user to run `./codex-composer migrate`
