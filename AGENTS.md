# Codex App Template Source Repository

This repository is the source template for a lightweight Codex App workflow.

## For Codex Users: Start Here

### Repository Layout

```
├── AGENTS.md                    # This file: quick reference
├── docs/
│   ├── codex-quickstart.md      # 5-step default loop
│   ├── codex-task-card-workflow.md   # Full workflow spec (canonical)
│   ├── codex-debug-workflow.md       # Debug mode spec
│   └── workflow-sync-rules.md      # What must stay aligned
├── .agents/skills/codex-template/    # Skill definitions
│   ├── planner/
│   │   ├── SKILL.md
│   │   ├── TASK-CARD-TEMPLATE.md
│   │   ├── EPIC-CARD-TEMPLATE.md   # For plan mode
│   │   └── BLOCKER-TEMPLATE.md     # For blocked tasks
│   ├── implementer/SKILL.md
│   ├── change-check/SKILL.md
│   ├── resume-work/
│   │   ├── SKILL.md
│   │   └── TASK-JOURNAL-TEMPLATE.md
│   ├── debug-investigation/SKILL.md
│   └── task-orchestrator/          # Plan mode scheduler
│       ├── SKILL.md
│       └── STATE-MACHINE.md
├── .codex/config.toml           # Repo verification hooks
└── test/                        # Contract tests (run these!)
```

### How to Use This Workflow

**Simple task (single change):**
1. `planner` → create `docs/_codex/<task>/task-card.md`
2. `implementer` → make the change
3. `change-check` → verify and write `acceptance-evidence.md`
4. Commit and merge manually

**Complex task (multiple changes):**
1. `planner` → create Epic Card + 2-5 Task Cards with dependencies
2. `task-orchestrator` → schedules tasks, enforces constraints
3. Loop: orchestrator → implementer/check/debug → orchestrator
4. When all tasks done, Epic is complete

See `docs/codex-quickstart.md` for the full default loop.

### Repo Verification Contract

**Always run this after template/skill/docs changes:**
```bash
npm test
```

**Verification levels:**
- Narrow: `npm test` (default for most changes)
- Full: install test in temp repo (when installer changes)

**Done when:**
- [ ] `npm test` passes
- [ ] Changed templates have matching test assertions in `test/task-card-assets.test.mjs`
- [ ] `AGENTS.md` and `template/AGENTS.md` stay aligned
- [ ] `docs/workflow-sync-rules.md` lists any new canonical sources

### When to Use Plan Mode

| Scenario | Use | Don't Use |
|----------|-----|-----------|
| Single bounded change | Regular Task Card | - |
| 2+ related changes with dependencies | Plan mode + Epic Card | Multiple independent cards |
| Complex feature needing coordination | Plan mode + orchestrator | One giant Task Card |
| Debug investigation | Debug mode (not plan mode) | Plan mode |

### Core Skills

| Skill | When to Use |
|-------|-------------|
| `planner` | Start non-trivial work; bound scope and acceptance criteria |
| `implementer` | Execute approved change within boundary |
| `change-check` | Verify change meets acceptance criteria |
| `resume-work` | Recover context after thread/handoff/compression |
| `debug-investigation` | Root cause unconfirmed; hypothesis-driven debugging |
| `task-orchestrator` | Plan mode only: schedule tasks, enforce failure budgets |

## Source Of Truth

If wording conflicts, defer to (in order):
1. `docs/codex-task-card-workflow.md` — workflow spec
2. `docs/codex-debug-workflow.md` — debug mode spec
3. `docs/workflow-sync-rules.md` — sync requirements

## Working Rules

- Treat `docs/` as the source of truth.
- Keep merge manual after verification.
- Prefer thread/worktree split only when reviewability clearly improves.