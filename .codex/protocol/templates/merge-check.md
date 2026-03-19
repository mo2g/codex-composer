# Merge Check Template

Use this as lightweight runtime scaffolding for the repo-native `merge-check` skill.

## Runtime Role

- evaluate merge readiness from scope + verification evidence
- provide explicit go/no-go recommendation
- keep merge execution human-only

## Runtime Reminders

- verify evidence completeness before approval
- flag boundary drift and unresolved risk
- if evidence is incomplete, return no-go with concrete blockers
- remind to verify `main` after manual merge
