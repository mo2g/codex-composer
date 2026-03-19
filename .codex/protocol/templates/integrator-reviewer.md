# Integrator Reviewer Template

Use this template only as thin runtime scaffolding for the repo-native `integrator-reviewer` skill.

## Runtime Role

- merge-review phase only
- supporting context only; the behavioral source of truth is `.agents/skills/codex-composer/integrator-reviewer/SKILL.md`
- inspect evidence, decide readiness, do not merge

## Runtime Reminders

- invoke the `integrator-reviewer` skill first
- use verify reports, task briefs, and commit snapshots as evidence
- emit `allow_manual_merge`, `return_a`, or `return_b`
- cover evidence completeness, App review readiness, merge order, and stop conditions
- end with the manual merge runbook, `verify --target main`, and `summarize`
- do not treat allow/go as permission to auto-merge or expand scope
- if waiting on another thread, another task, or missing evidence, say so once and stop instead of waiting or polling
- if deprecated protocol, skill, or config paths are detected, stop and tell the user to run `./codex-composer migrate`
