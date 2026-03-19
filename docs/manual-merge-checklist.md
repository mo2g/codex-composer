# Manual Merge Checklist

Use this before merging any Codex-assisted branch.

## Pre-Merge

- [ ] Relevant verification has passed.
- [ ] Diff is within approved scope and contains no unrelated edits.
- [ ] Review step is complete (reviewer/merge-check outcome is clear).
- [ ] Risks and rollback notes are understood.

## Merge

- [ ] Merge is executed manually by a human.
- [ ] No opportunistic scope expansion is introduced during conflict resolution.

## Post-Merge

- [ ] Re-run verification on `main` (or integration target).
- [ ] If verification fails, stop and fix before considering the task finished.
