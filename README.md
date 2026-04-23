# Codex Composer

> Make AI Your Pair Programming Partner — Structured Task Workflow Template

[![Install](https://img.shields.io/badge/Install-curl%20%7C%20bash-blue)](install.sh)
[![Tests](https://img.shields.io/badge/Tests-passing-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-green)]()

[English](README.md) | [中文](README-zh.md)

## What is Codex Composer?

Codex Composer is a lightweight workflow template that helps your Codex collaborate in a **structured and traceable** way.

No more endless back-and-forth chats. Instead, you get:

- **Task-driven** — Every requirement becomes a trackable task card
- **State-driven** — Clear workflow states (planned → in-progress → verifying → done)
- **Evidence preserved** — Automatic logging of decisions, verification results, and debug sessions
- **Complex project support** — Plan Mode lets AI coordinate multi-task projects

## Quick Start (30-Second Install)

```bash
# Install into an existing project
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

After installation, your project gets:

```
my-project/
├── AGENTS.md              # AI assistant entry point (references workflow guide)
├── CODEX-COMPOSER.md      # Complete usage guide
└── .agents/skills/        # AI skill library
    ├── planner/           # Task planning
    ├── implementer/       # Code implementation
    ├── change-check/      # Change verification
    ├── debug-investigation/  # Debug investigation
    └── task-orchestrator/    # Multi-task coordination
```

## How to Use

### Mode 1: Single Task (Recommended for Daily Dev)

Tell your AI:
> "Use the planner skill to create a task card for implementing user login"

The AI will:
1. Create a task card (requirements + acceptance criteria)
2. Implement the code step by step
3. Verify and record results

### Mode 2: Complex Requirements (Plan Mode)

> "This feature needs 3 PRs to complete. Launch Plan Mode."

The AI will:
1. Create an Epic card and break down tasks
2. Coordinate execution order of subtasks
3. Track dependencies

## Key Features

| Feature | Description |
|---------|-------------|
| **Non-intrusive** | Only adds `.agents/` and docs, zero dependencies, doesn't affect existing code |
| **Upgradable** | One-command skill library upgrade, preserves your project config |
| **Dual Mode** | Single-task quick mode + multi-task Plan Mode |
| **Debug-friendly** | Dedicated debug investigation flow for root cause tracking |
| **Resume work** | resume-work skill lets AI pick up unfinished tasks |

## Upgrade Installed Projects

```bash
# Preview upgrade
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing --upgrade --dry-run

# Apply upgrade
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing --upgrade
```

## Documentation

- **Quick Start** — Read `CODEX-COMPOSER.md` after installation
- **Workflow Spec** — `docs/codex-task-card-workflow.md`
- **Debug Mode** — `docs/codex-debug-workflow.md`
- **Upgrade Guide** — `docs/codex-upgrade-guide.md`

## Contributing

```bash
# Clone and test
git clone https://github.com/mo2g/codex-composer.git
cd codex-composer
npm install
npm test
```

## License

MIT License — Free to use, contributions welcome!
