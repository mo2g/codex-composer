# Acceptance Evidence Template

Use this template when `change-check` needs to show exactly how each acceptance criterion was proven, where evidence is missing, and which risks remain.

## Rules

- Map evidence to acceptance criteria directly.
- Prefer the narrowest reliable verification first.
- Mark gaps honestly instead of inferring success from unrelated output.
- Keep residual risks separate from verified evidence.

## Template

```md
# Acceptance Evidence: <task-slug>

## Verification summary

- Scope checked: <what was inspected>
- Commands run:
  - <command>
  - <command>

## Debug closure (debug tasks only)

- Confirmed root cause: <cause or n/a>
- Ruled-out hypotheses: <hypothesis list or n/a>
- Cause-targeting check: <how the fix targets cause rather than symptoms>

## Criteria map

| Acceptance criterion | Evidence | Gap or risk |
| --- | --- | --- |
| <criterion 1> | <test, diff, or inspection evidence> | <none / remaining gap> |
| <criterion 2> | <test, diff, or inspection evidence> | <none / remaining gap> |

## Tests added or updated

- <test file or command>

## Residual risks

- <risk>

## Recommended commit message

- `<type>: <summary>`
```

## Notes For Change Check

- Do not collapse multiple criteria into one generic statement.
- If no reliable command exists, say that explicitly and recommend the smallest missing test or check.
- For debug tasks, fill the debug-closure section before claiming the fix is complete.
- Keep this artifact aligned with the Task Card so humans can audit the evidence trail quickly.
