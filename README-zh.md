# Codex Composer

> Make AI Your Pair Programming Partner — Structured Task Workflow Template

[![Install](https://img.shields.io/badge/Install-curl%20%7C%20bash-blue)](install.sh)
[![Tests](https://img.shields.io/badge/Tests-passing-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-green)]()

[English](README.md) | [中文](README-zh.md)

## 什么是 Codex Composer？

Codex Composer 是一个轻量级的工作流模板，让你的 Codex 能够按照**结构化、可追溯**的方式协作开发。

不再是一轮接一轮的随意对话，而是：

- **任务化** —— 每个需求都变成可追踪的任务卡片
- **状态驱动** —— 清晰的工作状态流转（规划中 → 开发中 → 验证中 → 完成）
- **证据留存** —— 自动记录决策、验证结果和调试过程
- **支持复杂项目** —— Plan Mode 让 AI 能规划和协调多任务

## 快速开始（30 秒安装）

```bash
# 安装到现有项目
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing
```

安装后，你的项目会获得：

```
my-project/
├── AGENTS.md              # AI 助手入口（引用工作流指南）
├── CODEX-COMPOSER.md      # 完整使用指南
└── .agents/skills/        # AI 技能库
    ├── planner/           # 任务规划
    ├── implementer/       # 代码实现
    ├── change-check/      # 变更验证
    ├── debug-investigation/  # 调试调查
    └── task-orchestrator/    # 多任务协调
```

## 如何使用

### 方式一：单个任务（推荐日常开发）

告诉 AI：
> "用 planner 技能创建任务卡片，实现用户登录功能"

AI 会自动：
1. 创建任务卡片（需求 + 验收标准）
2. 按步骤实现代码
3. 验证并记录结果

### 方式二：复杂需求（Plan Mode）

> "这是一个需要 3 个 PR 完成的功能，启动 Plan Mode"

AI 会：
1. 创建 Epic 卡片分解任务
2. 协调多个子任务的执行顺序
3. 追踪依赖关系

## 核心特性

| 特性 | 说明 |
|------|------|
| **无侵入** | 只添加 `.agents/` 和文档，零依赖，不影响现有代码 |
| **可升级** | 一键升级技能库，保留你的项目配置 |
| **双模式** | 单任务快速模式 + 多任务 Plan Mode |
| **调试友好** | 专门的调试调查流程，追踪根因 |
| **断点续作** | resume-work 技能让 AI 接手未完成的任务 |

## 升级已安装的项目

```bash
# 预览升级内容
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing --upgrade --dry-run

# 执行升级
curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing --upgrade
```

## 文档导航

- **快速上手** — 安装后阅读 `CODEX-COMPOSER.md`
- **工作流规范** — `docs/codex-task-card-workflow.md`
- **调试模式** — `docs/codex-debug-workflow.md`
- **升级指南** — `docs/codex-upgrade-guide.md`

## 开发贡献

```bash
# 克隆并测试
git clone https://github.com/mo2g/codex-composer.git
cd codex-composer
npm install
npm test
```

## 许可证

MIT License — 自由使用，欢迎贡献！
