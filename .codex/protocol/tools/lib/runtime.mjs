import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { ensureDir, isoNow, pathExists, readJson, readText, toPosixPath, writeJson, writeText } from "./fs.mjs";
import { matchesAny } from "./glob.mjs";
import { parseToml } from "./toml.mjs";

const DEFAULT_CONFIG = {
  project: {
    main_branch: "main",
    branch_prefix: "codex/",
    repo_type: "generic"
  },
  codex: {
    binary: "codex",
    profile: "",
    sandbox: "workspace-write",
    approval_policy: "on-request"
  },
  planner: {
    max_parallel: 2,
    require_plan_approval: true,
    require_integrate_approval: false
  },
  budget: {
    max_codex_runs: 5,
    allow_auto_replan: false
  },
  hooks: {
    branch_verify: [],
    integration_verify: [],
    main_verify: []
  },
  path_rules: [],
  parallel_rules: []
};

export const sourceRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
export const sourceCodexRoot = path.join(sourceRepoRoot, ".codex");
export const sourceAgentsRoot = path.join(sourceRepoRoot, ".agents");
export const sourceProtocolRoot = path.join(sourceCodexRoot, "protocol");
export const sourceSkillsRoot = path.join(sourceAgentsRoot, "skills", "codex-composer");
export const protocolRoot = sourceProtocolRoot;
const PROTOCOL_REQUIRED_ENTRIES = ["templates", "schemas", "tools"];
const NEW_PROTOCOL_ROOT = [".codex", "protocol"];
const NEW_SKILLS_ROOT = [".agents", "skills", "codex-composer"];
const INTERIM_SKILLS_ROOT = [".codex", "skills"];
const NEW_LOCAL_ROOT = [".codex", "local"];
const NEW_CONFIG_PATH = [".codex", "config.toml"];
const LEGACY_PROTOCOL_ROOT = [".codex-composer", "protocol"];
const LEGACY_SKILLS_ROOT = [".codex-composer", "protocol", "skills"];
const LEGACY_LOCAL_ROOT = [".codex-composer"];
const LEGACY_LOCAL_CONFIG_PATHS = [[".codex-composer", "config.toml"], [".codex-composer.toml"]];
const DEPRECATED_CONFIG_PATHS = [[".codex", "local", "config.toml"], ...LEGACY_LOCAL_CONFIG_PATHS];
const LEGACY_RUNTIME_IGNORE_ENTRIES = [".codex-composer/runs/", ".codex-composer/worktrees/"];
const RUNTIME_IGNORE_ENTRIES = [".codex/local/runs/", ".codex/local/worktrees/"];

async function hasEntries(root, entries) {
  const checks = await Promise.all(
    entries.map((entry) => pathExists(path.join(root, entry)))
  );
  return checks.every(Boolean);
}

async function hasProtocolEntries(root) {
  return hasEntries(root, PROTOCOL_REQUIRED_ENTRIES);
}

async function hasSkillEntries(root) {
  if (!(await pathExists(root))) {
    return false;
  }

  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (await pathExists(path.join(root, entry.name, "SKILL.md"))) {
      return true;
    }
  }

  return false;
}

async function findLegacySkillsRoot(repoRoot) {
  const candidates = [
    path.join(repoRoot, ...INTERIM_SKILLS_ROOT),
    path.join(repoRoot, ...LEGACY_SKILLS_ROOT),
    path.join(repoRoot, "skills")
  ];

  for (const candidate of candidates) {
    if (await hasSkillEntries(candidate)) {
      return candidate;
    }
  }

  return null;
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override ?? base;
  }

  if (typeof base !== "object" || base === null) {
    return override ?? base;
  }

  const merged = { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    merged[key] = key in merged ? deepMerge(merged[key], value) : value;
  }
  return merged;
}

export async function resolveRepoRoot(repoArg) {
  return path.resolve(repoArg ?? process.cwd());
}

export async function resolveProtocolRoot(repoRoot) {
  const canonicalRoot = path.join(repoRoot, ...NEW_PROTOCOL_ROOT);
  if (await hasProtocolEntries(canonicalRoot)) {
    return canonicalRoot;
  }

  const legacyRoot = path.join(repoRoot, ...LEGACY_PROTOCOL_ROOT);
  if (await hasProtocolEntries(legacyRoot)) {
    return legacyRoot;
  }

  if (await hasProtocolEntries(repoRoot)) {
    return repoRoot;
  }

  return sourceProtocolRoot;
}

export async function resolveSkillsRoot(repoRoot) {
  const canonicalRoot = path.join(repoRoot, ...NEW_SKILLS_ROOT);
  if (await hasSkillEntries(canonicalRoot)) {
    return canonicalRoot;
  }

  if (await hasSkillEntries(sourceSkillsRoot)) {
    return sourceSkillsRoot;
  }

  return canonicalRoot;
}

export function resolveLocalRoot(repoRoot) {
  const canonicalRoot = path.join(repoRoot, ...NEW_LOCAL_ROOT);
  const legacyRoot = path.join(repoRoot, ...LEGACY_LOCAL_ROOT);

  if (existsSync(path.join(repoRoot, ".codex"))) {
    return canonicalRoot;
  }

  for (const configPath of LEGACY_LOCAL_CONFIG_PATHS) {
    if (existsSync(path.join(repoRoot, ...configPath))) {
      return legacyRoot;
    }
  }

  if (existsSync(legacyRoot)) {
    return legacyRoot;
  }

  return canonicalRoot;
}

export async function resolveConfigPath(repoRoot) {
  return path.join(repoRoot, ...NEW_CONFIG_PATH);
}

async function findDeprecatedConfigPath(repoRoot) {
  for (const configPath of DEPRECATED_CONFIG_PATHS) {
    const resolved = path.join(repoRoot, ...configPath);
    if (await pathExists(resolved)) {
      return resolved;
    }
  }

  return null;
}

export async function resolveProtocolPaths(repoRoot) {
  const root = await resolveProtocolRoot(repoRoot);
  const skillsRoot = await resolveSkillsRoot(repoRoot);
  const canonicalSkillsRoot = path.join(repoRoot, ...NEW_SKILLS_ROOT);
  const legacySkillsRoot = await findLegacySkillsRoot(repoRoot);
  const canonicalRoot = path.join(repoRoot, ...NEW_PROTOCOL_ROOT);
  const legacyRoot = path.join(repoRoot, ...LEGACY_PROTOCOL_ROOT);
  const canonicalConfigPath = path.join(repoRoot, ...NEW_CONFIG_PATH);
  const deprecatedConfigPath = await findDeprecatedConfigPath(repoRoot);
  const configMigrationRequired = !(await pathExists(canonicalConfigPath)) && Boolean(deprecatedConfigPath);
  const agents = await pathExists(path.join(repoRoot, "AGENTS.md"))
    ? path.join(repoRoot, "AGENTS.md")
    : path.join(sourceRepoRoot, "AGENTS.md");
  const mode = root === canonicalRoot
    ? "codex"
    : root === legacyRoot
      ? "legacy"
      : root === repoRoot
        ? "flat"
        : "source";
  const skillMigrationRequired = !(await hasSkillEntries(canonicalSkillsRoot)) && Boolean(legacySkillsRoot);
  const warnings = [];

  if (mode === "legacy") {
    warnings.push("legacy .codex-composer layout detected; run ./codex-composer migrate to move protocol and runtime state into .codex");
  }

  if (skillMigrationRequired) {
    warnings.push("legacy skill layout detected; run ./codex-composer migrate to move repo-native skills into .agents/skills/codex-composer");
  }

  if (configMigrationRequired) {
    warnings.push(`deprecated config path detected at ${deprecatedConfigPath}; run ./codex-composer migrate to move shared config into .codex/config.toml`);
  }

  return {
    root,
    skillsRoot,
    mode,
    deprecated: mode === "legacy" || skillMigrationRequired || configMigrationRequired,
    warnings,
    skillMigrationRequired,
    configMigrationRequired,
    deprecatedConfigPath,
    legacySkillsRoot,
    agents,
    templatesDir: path.join(root, "templates"),
    skillsDir: skillsRoot,
    schemasDir: path.join(root, "schemas"),
    toolsDir: path.join(root, "tools"),
    composerTool: path.join(root, "tools", "composer.mjs"),
    configPath: await resolveConfigPath(repoRoot),
    localRoot: resolveLocalRoot(repoRoot)
  };
}

export async function resolvePublicInterface(repoRoot) {
  for (const launcher of ["codex-composer", "composer-next"]) {
    if (await pathExists(path.join(repoRoot, launcher))) {
      return {
        type: "launcher",
        launcher,
        commandPrefix: `./${launcher}`
      };
    }
  }

  return {
    type: "scripts",
    launcher: null,
    commandPrefix: "./scripts"
  };
}

export async function publicCommand(repoRoot, subcommand) {
  const ui = await resolvePublicInterface(repoRoot);
  if (ui.type === "launcher") {
    return `${ui.commandPrefix} ${subcommand}`;
  }
  return `./scripts/composer-${subcommand}.sh`;
}

export function runPaths(repoRoot, runId) {
  const stateRoot = resolveLocalRoot(repoRoot);
  const runRoot = path.join(stateRoot, "runs", runId);
  return {
    stateRoot,
    runRoot,
    logsDir: path.join(runRoot, "logs"),
    verifyDir: path.join(runRoot, "verify"),
    tasksDir: path.join(runRoot, "tasks"),
    worktreesDir: path.join(stateRoot, "worktrees", runId),
    requirements: path.join(runRoot, "requirements.md"),
    clarifications: path.join(runRoot, "clarifications.md"),
    planJson: path.join(runRoot, "plan.json"),
    planMd: path.join(runRoot, "PLAN.md"),
    decisions: path.join(runRoot, "decisions.md"),
    sessions: path.join(runRoot, "sessions.json"),
    status: path.join(runRoot, "status.json"),
    summary: path.join(runRoot, "SUMMARY.md"),
    prBody: path.join(runRoot, "PR_BODY.md")
  };
}

export async function loadConfig(repoRoot) {
  const configPath = await resolveConfigPath(repoRoot);
  if (!(await pathExists(configPath))) {
    const deprecatedConfigPath = await findDeprecatedConfigPath(repoRoot);
    if (deprecatedConfigPath) {
      throw new Error(`Deprecated config path detected at ${deprecatedConfigPath}. Run ./codex-composer migrate to move shared config to .codex/config.toml before continuing.`);
    }
  }
  const raw = await readText(configPath, "");
  const parsed = raw ? parseToml(raw) : {};
  const merged = deepMerge(DEFAULT_CONFIG, parsed);

  merged.hooks.branch_verify ||= [];
  merged.hooks.integration_verify ||= [];
  merged.hooks.main_verify ||= [];
  merged.path_rules ||= [];
  merged.parallel_rules ||= [];

  return merged;
}

function createDecisionEntry({ checkpoint, decision, mode = null, note = "" }) {
  return {
    checkpoint,
    decision,
    mode,
    note,
    at: isoNow()
  };
}

function initialTaskState(runId, role) {
  return {
    planned: false,
    enabled: false,
    prepared: false,
    branch: null,
    worktree: null,
    launch_strategy: role === "a" ? "current_thread" : "manual_thread",
    status: "pending",
    commit: null,
    commit_sha: null,
    commit_message: null,
    changed_files: [],
    commit_history: [],
    committed_at: null,
    last_run_at: null
  };
}

export function initialStatus(repoRoot, runId) {
  return {
    run_id: runId,
    repo_root: repoRoot,
    created_at: isoNow(),
    updated_at: isoNow(),
    phase: "clarify",
    current_checkpoint: "clarify",
    plan: {
      status: "pending",
      recommended_mode: null,
      approved_mode: null,
      policy_forced_mode: null
    },
    tasks: {
      a: initialTaskState(runId, "a"),
      b: initialTaskState(runId, "b")
    },
    sessions: {
      control: {
        mode: "interactive",
        session_id: null,
        marker: `CC:${runId}:control`
      }
    },
    verification: {
      a: {
        status: "pending",
        report: null
      },
      b: {
        status: "pending",
        report: null
      },
      main: {
        status: "pending",
        report: null
      }
    },
    decisions: []
  };
}

export async function syncSessionsFile(repoRoot, runId, status) {
  const paths = runPaths(repoRoot, runId);
  await writeJson(paths.sessions, status.sessions);
}

export async function loadStatus(repoRoot, runId) {
  const paths = runPaths(repoRoot, runId);
  const status = await readJson(paths.status);
  if (!status) {
    throw new Error(`Run not found: ${runId}`);
  }
  status.sessions ||= {};
  status.sessions.control ||= {
    mode: "interactive",
    session_id: null,
    marker: `CC:${runId}:control`
  };
  status.tasks ||= {};
  status.tasks.a = { ...initialTaskState(runId, "a"), ...status.tasks.a };
  status.tasks.b = { ...initialTaskState(runId, "b"), ...status.tasks.b };
  for (const taskId of ["a", "b"]) {
    status.tasks[taskId].planned = Boolean(status.tasks[taskId].planned ?? status.tasks[taskId].enabled);
    status.tasks[taskId].prepared = Boolean(status.tasks[taskId].prepared ?? status.tasks[taskId].worktree);
    if (!status.tasks[taskId].commit_sha && status.tasks[taskId].commit) {
      status.tasks[taskId].commit_sha = status.tasks[taskId].commit;
    }
    status.tasks[taskId].commit_history ||= [];
    if (status.tasks[taskId].commit && status.tasks[taskId].commit_history.length === 0) {
      status.tasks[taskId].commit_history.push({
        sha: status.tasks[taskId].commit_sha ?? status.tasks[taskId].commit,
        message: status.tasks[taskId].commit_message ?? null,
        changed_files: Array.isArray(status.tasks[taskId].changed_files) ? status.tasks[taskId].changed_files : [],
        committed_at: status.tasks[taskId].committed_at ?? null
      });
    }
  }
  status.verification ||= {};
  status.verification.a ||= { status: "pending", report: null };
  status.verification.b ||= { status: "pending", report: null };
  status.verification.main ||= { status: "pending", report: null };
  return status;
}

export async function saveStatus(repoRoot, runId, status) {
  const paths = runPaths(repoRoot, runId);
  status.updated_at = isoNow();
  await writeJson(paths.status, status);
  await syncSessionsFile(repoRoot, runId, status);
}

export async function appendDecisionMarkdown(repoRoot, runId, entry) {
  const paths = runPaths(repoRoot, runId);
  const existing = await readText(paths.decisions, "# Decisions\n\n");
  const noteLine = entry.note ? `- note: ${entry.note}\n` : "";
  const modeLine = entry.mode ? `- mode: ${entry.mode}\n` : "";
  const updated = `${existing.trimEnd()}\n\n## ${entry.checkpoint} @ ${entry.at}\n- decision: ${entry.decision}\n${modeLine}${noteLine}`;
  await writeText(paths.decisions, `${updated}\n`);
}

export async function createRun(repoRoot, runId, requirement) {
  const paths = runPaths(repoRoot, runId);
  if (await pathExists(paths.runRoot)) {
    throw new Error(`Run already exists: ${runId}`);
  }

  await Promise.all([
    ensureDir(paths.logsDir),
    ensureDir(paths.verifyDir),
    ensureDir(paths.tasksDir),
    ensureDir(paths.worktreesDir)
  ]);

  const status = initialStatus(repoRoot, runId);
  await ensureRuntimeIgnoreEntries(repoRoot);

  await writeText(paths.requirements, `${requirement.trim()}\n`);
  await writeText(paths.clarifications, "# Clarifications\n\n- Pending checkpoint 1.\n");
  await writeText(paths.planMd, "# Plan Review\n\nPlan not generated yet.\n");
  await writeText(paths.decisions, "# Decisions\n\n");
  await writeText(paths.summary, "# Summary\n\nPending.\n");
  await writeText(paths.prBody, "# PR Body\n\nPending.\n");
  await saveStatus(repoRoot, runId, status);

  return paths;
}

async function ensureGitIgnoreEntry(repoRoot, entry) {
  const ignorePath = path.join(repoRoot, ".gitignore");
  const existing = await readText(ignorePath, "");
  if (existing.split(/\r?\n/).includes(entry)) {
    return;
  }

  const suffix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
  await writeText(ignorePath, `${existing}${suffix}${entry}\n`);
}

async function removeIgnoreEntry(filePath, entry) {
  if (!(await pathExists(filePath))) {
    return;
  }

  const existing = await readText(filePath, "");
  const filtered = existing
    .split(/\r?\n/)
    .filter((line) => line !== entry);
  const normalized = filtered.join("\n").replace(/\n+$/u, "");
  await writeText(filePath, normalized ? `${normalized}\n` : "");
}

export async function ensureRuntimeIgnoreEntries(repoRoot) {
  const ignorePath = path.join(repoRoot, ".gitignore");
  const stateRoot = resolveLocalRoot(repoRoot);
  const useLegacyLayout = stateRoot.endsWith(".codex-composer");

  await removeIgnoreEntry(ignorePath, ".codex/");

  const entries = useLegacyLayout ? LEGACY_RUNTIME_IGNORE_ENTRIES : RUNTIME_IGNORE_ENTRIES;
  for (const entry of entries) {
    await ensureGitIgnoreEntry(repoRoot, entry);
  }
}

export function validatePlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return ["Plan payload must be a JSON object"];
  }

  const errors = [];
  const required = [
    "summary",
    "recommended_mode",
    "alternative_modes",
    "tasks",
    "task_boundaries",
    "conflict_reasons",
    "questions_for_user",
    "verification_targets",
    "needs_dialogue"
  ];

  for (const key of required) {
    if (!(key in plan)) {
      errors.push(`Missing required field: ${key}`);
    }
  }

  if (!["serial", "parallel_ab"].includes(plan.recommended_mode)) {
    errors.push("recommended_mode must be serial or parallel_ab");
  }

  if (!Array.isArray(plan.alternative_modes) || plan.alternative_modes.length === 0) {
    errors.push("alternative_modes must be a non-empty array");
  }

  if (!Array.isArray(plan.questions_for_user)) {
    errors.push("questions_for_user must be an array");
  }

  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    errors.push("tasks must be a non-empty array");
  } else {
    for (const task of plan.tasks) {
      for (const key of ["id", "title", "goal", "include", "exclude", "deliverables", "needs_dialogue"]) {
        if (!(key in task)) {
          errors.push(`Task ${task.id ?? "unknown"} missing ${key}`);
        }
      }
    }
  }

  if (!plan.task_boundaries || !plan.task_boundaries.a) {
    errors.push("task_boundaries.a is required");
  }

  return errors;
}

export function validatePlanSchema(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return ["plan.schema.json must be a JSON object"];
  }

  const errors = [];
  const rootRequired = [
    "summary",
    "recommended_mode",
    "alternative_modes",
    "tasks",
    "task_boundaries",
    "conflict_reasons",
    "questions_for_user",
    "verification_targets",
    "needs_dialogue"
  ];

  if (schema.type !== "object") {
    errors.push("plan.schema.json must declare type object");
  }

  if (!Array.isArray(schema.required)) {
    errors.push("plan.schema.json must declare a root required array");
  } else {
    for (const field of rootRequired) {
      if (!schema.required.includes(field)) {
        errors.push(`plan.schema.json is missing root required field ${field}`);
      }
    }
  }

  const taskItem = schema.properties?.tasks?.items;
  if (!Array.isArray(taskItem?.required)) {
    errors.push("plan.schema.json must declare tasks.items.required");
  } else {
    for (const field of ["id", "title", "goal", "include", "exclude", "deliverables", "risks", "needs_dialogue"]) {
      if (!taskItem.required.includes(field)) {
        errors.push(`plan.schema.json tasks.items.required is missing ${field}`);
      }
    }
  }

  for (const field of ["a", "b", "ab", "main"]) {
    if (!schema.properties?.verification_targets?.properties?.[field]) {
      errors.push(`plan.schema.json verification_targets must define ${field}`);
    }
  }

  for (const field of ["control", "a", "b", "ab"]) {
    if (!schema.properties?.needs_dialogue?.properties?.[field]) {
      errors.push(`plan.schema.json needs_dialogue must define ${field}`);
    }
  }

  return errors;
}

export async function collectRepoFiles(repoRoot) {
  const files = [];

  async function walk(current, relative = "") {
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === ".codex" || entry.name === ".codex-composer" || entry.name === ".agents" || entry.name === "node_modules") {
        continue;
      }

      const entryPath = path.join(current, entry.name);
      const entryRelative = relative ? `${relative}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walk(entryPath, entryRelative);
      } else if (entry.isFile()) {
        files.push(toPosixPath(entryRelative));
      }
    }
  }

  await walk(repoRoot);
  return files.sort();
}

function taskById(plan, taskId) {
  return plan.tasks.find((task) => task.id === taskId) ?? null;
}

export async function evaluateParallelPolicy(repoRoot, config, plan) {
  if (!taskById(plan, "a") || !taskById(plan, "b")) {
    return { forced_mode: null, reasons: [] };
  }

  const repoFiles = await collectRepoFiles(repoRoot);
  const aBoundary = plan.task_boundaries.a;
  const bBoundary = plan.task_boundaries.b;

  const aFiles = repoFiles.filter((file) => matchesAny(file, aBoundary.include) && !matchesAny(file, aBoundary.exclude ?? []));
  const bFiles = repoFiles.filter((file) => matchesAny(file, bBoundary.include) && !matchesAny(file, bBoundary.exclude ?? []));

  const sharedFiles = aFiles.filter((file) => bFiles.includes(file));
  const reasons = [];

  if (aFiles.length === 0) {
    reasons.push("Task A boundary matched no repository files; stable parallel boundaries are not established yet");
  }

  if (bFiles.length === 0) {
    reasons.push("Task B boundary matched no repository files; stable parallel boundaries are not established yet");
  }

  if (sharedFiles.length > 0) {
    reasons.push(`Tasks overlap on concrete files: ${sharedFiles.slice(0, 5).join(", ")}`);
  }

  const taskRuleSummary = {
    a: collectTaskRuleSummary(aFiles, config.path_rules),
    b: collectTaskRuleSummary(bFiles, config.path_rules)
  };

  const sharedGroups = intersection(taskRuleSummary.a.conflictGroups, taskRuleSummary.b.conflictGroups);
  if (sharedGroups.length > 0) {
    reasons.push(`Tasks touch the same conflict_group: ${sharedGroups.join(", ")}`);
  }

  const sharedCoreComponents = intersection(taskRuleSummary.a.coreComponents, taskRuleSummary.b.coreComponents);
  if (sharedCoreComponents.length > 0) {
    reasons.push(`Tasks touch the same core component: ${sharedCoreComponents.join(", ")}`);
  }

  for (const rule of config.parallel_rules ?? []) {
    if (rule.action !== "deny" || !rule.when_component) {
      continue;
    }

    if (taskRuleSummary.a.components.includes(rule.when_component) && taskRuleSummary.b.components.includes(rule.when_component)) {
      reasons.push(rule.reason || `Parallel work denied for component ${rule.when_component}`);
    }
  }

  return {
    forced_mode: reasons.length > 0 ? "serial" : null,
    reasons
  };
}

function collectTaskRuleSummary(files, pathRules) {
  const components = new Set();
  const conflictGroups = new Set();
  const coreComponents = new Set();

  for (const file of files) {
    for (const rule of pathRules ?? []) {
      if (matchesAny(file, rule.globs ?? [])) {
        if (rule.component) {
          components.add(rule.component);
          if (rule.core) {
            coreComponents.add(rule.component);
          }
        }
        if (rule.conflict_group) {
          conflictGroups.add(rule.conflict_group);
        }
      }
    }
  }

  return {
    components: [...components],
    conflictGroups: [...conflictGroups],
    coreComponents: [...coreComponents]
  };
}

function intersection(left, right) {
  const leftSet = new Set(left);
  return right.filter((item) => leftSet.has(item));
}

export function renderPlanMarkdown(plan) {
  const taskSections = plan.tasks
    .map((task) => {
      const risks = (task.risks ?? []).length > 0 ? task.risks.map((risk) => `- ${risk}`).join("\n") : "- none";
      return `## Task ${task.id.toUpperCase()}: ${task.title}

- goal: ${task.goal}
- include: ${(task.include ?? []).join(", ") || "(none)"}
- exclude: ${(task.exclude ?? []).join(", ") || "(none)"}
- deliverables: ${(task.deliverables ?? []).join(", ") || "(none)"}
- needs_dialogue: ${task.needs_dialogue ? "true" : "false"}
- risks:
${risks}`;
    })
    .join("\n\n");

  const policySection = plan.policy_evaluation?.reasons?.length
    ? `## Local Policy Evaluation

- forced_mode: ${plan.policy_evaluation.forced_mode}
${plan.policy_evaluation.reasons.map((reason) => `- ${reason}`).join("\n")}`
    : "## Local Policy Evaluation\n\n- forced_mode: none\n";

  return `# Plan Review

## Summary

${plan.summary}

## Modes

- recommended_mode: ${plan.recommended_mode}
- alternative_modes: ${(plan.alternative_modes ?? []).join(", ")}

${taskSections}

## Questions For User

${(plan.questions_for_user ?? []).map((question) => `- ${question}`).join("\n") || "- none"}

## Verification Targets

- A: ${(plan.verification_targets?.a ?? []).join(", ") || "(config hook)"}
- B: ${(plan.verification_targets?.b ?? []).join(", ") || "(config hook)"}
- AB: ${(plan.verification_targets?.ab ?? []).join(", ") || "(config hook)"}
- Main: ${(plan.verification_targets?.main ?? []).join(", ") || "(config hook)"}

${policySection}
`;
}

export async function git(cwd, args, options = {}) {
  return runCommand("git", args, { cwd, ...options });
}

export async function runCommand(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    allowFailure = false,
    stdio = "pipe"
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio });
    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && !allowFailure) {
        const error = new Error(`${command} ${args.join(" ")} failed with code ${code}\n${stderr}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ code, stdout, stderr });
    });
  });
}

export async function ensureCleanWorktree(repoRoot) {
  const status = await git(repoRoot, ["status", "--porcelain"]);
  if (status.stdout.trim()) {
    throw new Error(`Repository must be clean before this step:\n${status.stdout}`);
  }
}

export async function currentBranch(repoRoot) {
  const branch = await git(repoRoot, ["branch", "--show-current"]);
  return branch.stdout.trim();
}

export async function ensureHeadCommit(repoRoot) {
  const result = await git(repoRoot, ["rev-parse", "--verify", "HEAD"], { allowFailure: true });
  if (result.code !== 0) {
    throw new Error("Repository must have an initial commit before split. Create a bootstrap commit first, then retry.");
  }
}

export function sanitizeBranchFragment(input) {
  return input.replace(/[^a-zA-Z0-9._/-]+/g, "-");
}

export async function branchExists(repoRoot, branch) {
  const result = await git(repoRoot, ["rev-parse", "--verify", "--quiet", branch], { allowFailure: true });
  return result.code === 0;
}

export async function worktreeExists(worktreePath) {
  return pathExists(path.join(worktreePath, ".git"));
}

export async function readSessionIndex() {
  const sessionIndexPath = path.join(os.homedir(), ".codex", "session_index.jsonl");
  const raw = await readText(sessionIndexPath, "");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function findLatestSessionByMarker(marker) {
  const sessions = await readSessionIndex();
  const matches = sessions.filter((session) => String(session.thread_name ?? "").includes(marker));
  matches.sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());
  return matches[0] ?? null;
}

export async function renderControlPrompt(repoRoot, runId, checkpoint) {
  const paths = runPaths(repoRoot, runId);
  const protocol = await resolveProtocolPaths(repoRoot);
  const templatePath = checkpoint === "clarify" || checkpoint === "plan-review"
    ? path.join(protocol.templatesDir, "planner.md")
    : path.join(protocol.templatesDir, "integrator-reviewer.md");
  const template = await readText(templatePath);
  const promptPath = path.join(paths.logsDir, `control-${checkpoint}.md`);
  const checkpointCommand = await publicCommand(repoRoot, "checkpoint");
  const content = `# Codex Composer Control Session

- run_id: ${runId}
- checkpoint: ${checkpoint}
- repo_root: ${repoRoot}
- protocol_root: ${protocol.root}

Read these files in order:

1. ${protocol.agents}
2. ${templatePath}
3. ${paths.requirements}
4. ${paths.clarifications}
5. ${paths.decisions}
6. ${paths.planMd}
7. ${paths.status}

Use this checkpoint prompt inside the current Codex thread:

${template}

If you are waiting on another thread, a human decision, or more evidence, say so once and stop instead of waiting or polling in this thread.

When the user makes a decision, persist it with:

- ${checkpointCommand} --run ${runId} --checkpoint ${checkpoint} --decision <decision> [--mode <serial|parallel_ab>] [--note "<summary>"]
  `;
  await writeText(promptPath, content);
  return promptPath;
}

export async function renderPlanRequest(repoRoot, runId) {
  const paths = runPaths(repoRoot, runId);
  const protocol = await resolveProtocolPaths(repoRoot);
  const repoFiles = await collectRepoFiles(repoRoot);
  const filePreview = repoFiles.slice(0, 200).map((file) => `- ${file}`).join("\n");
  const promptPath = path.join(paths.logsDir, "plan-request.md");
  const content = `# Generate Codex Composer Plan

Repository root: ${repoRoot}
Run id: ${runId}

Read these files:

1. ${protocol.agents}
2. ${path.join(protocol.templatesDir, "planner.md")}
3. ${paths.requirements}
4. ${paths.clarifications}
5. ${paths.decisions}

Repository file preview:

${filePreview}

Return JSON only and obey the schema in:

${path.join(protocol.schemasDir, "plan.schema.json")}

The current repository root is task A. If frontend and backend boundaries are cleanly separated, task A should usually own frontend and task B should usually own backend in a separate worktree.
  `;
  await writeText(promptPath, content);
  return promptPath;
}

export async function renderTaskPrompt(repoRoot, runId, taskId, plan) {
  const paths = runPaths(repoRoot, runId);
  const protocol = await resolveProtocolPaths(repoRoot);
  const task = taskById(plan, taskId);
  const status = await loadStatus(repoRoot, runId);

  if (!task) {
    return null;
  }

  const promptPath = path.join(paths.tasksDir, `${taskId}.md`);
  const verifyCommand = await publicCommand(repoRoot, "verify");
  const commitCommand = await publicCommand(repoRoot, "commit");
  const content = `# Task ${taskId.toUpperCase()}

- run_id: ${runId}
- repo_root: ${repoRoot}
- task: ${task.title}
- goal: ${task.goal}
- include: ${(task.include ?? []).join(", ") || "(none)"}
- exclude: ${(task.exclude ?? []).join(", ") || "(none)"}
- deliverables: ${(task.deliverables ?? []).join(", ") || "(none)"}
- risks: ${(task.risks ?? []).join(", ") || "(none)"}
- needs_dialogue: ${task.needs_dialogue ? "true" : "false"}
- launch_strategy: ${status.tasks[taskId]?.launch_strategy ?? (taskId === "a" ? "current_thread" : "manual_thread")}

Read:

1. ${protocol.agents}
2. ${path.join(protocol.templatesDir, "task-owner.md")}
3. ${paths.planMd}
4. ${paths.status}

Stay inside the task boundary. After implementation, run:

- ${verifyCommand} --run ${runId} --target ${taskId}
- ${commitCommand} --run ${runId} --task ${taskId}

If you are blocked on another task, a human decision, or missing verification evidence, report it once and stop instead of waiting or polling.

Do not merge branches from this prompt.
  `;
  await writeText(promptPath, content);
  return promptPath;
}

export async function writePlanArtifacts(repoRoot, runId, plan) {
  const paths = runPaths(repoRoot, runId);
  await writeJson(paths.planJson, plan);
  await writeText(paths.planMd, renderPlanMarkdown(plan));
}

export async function updateStatusForPlan(repoRoot, runId, plan) {
  const status = await loadStatus(repoRoot, runId);
  status.plan.status = "review_pending";
  status.plan.recommended_mode = plan.recommended_mode;
  status.plan.policy_forced_mode = plan.policy_evaluation?.forced_mode ?? null;
  status.plan.approved_mode = null;
  status.phase = "plan-review";
  status.current_checkpoint = "plan-review";

  for (const taskId of ["a", "b"]) {
    const task = taskById(plan, taskId);
    status.tasks[taskId].planned = Boolean(task);
    status.tasks[taskId].enabled = false;
    status.tasks[taskId].prepared = false;
    status.tasks[taskId].branch = null;
    status.tasks[taskId].worktree = null;
    status.tasks[taskId].launch_strategy = taskId === "a" ? "current_thread" : "manual_thread";
    status.tasks[taskId].status = task ? "planned" : "skipped";
  }

  await saveStatus(repoRoot, runId, status);
}

function isMergeReady(status, taskId) {
  const task = status.tasks[taskId];
  if (!task?.enabled) {
    return true;
  }
  return task.status === "committed" && status.verification[taskId]?.status === "passed";
}

function advanceMergeReviewIfReady(status) {
  if (!status.plan.approved_mode) {
    return;
  }

  if (status.plan.approved_mode === "parallel_ab") {
    if (isMergeReady(status, "a") && isMergeReady(status, "b")) {
      status.phase = "merge-review";
      status.current_checkpoint = "merge-review";
    }
    return;
  }

  if (isMergeReady(status, "a")) {
    status.phase = "merge-review";
    status.current_checkpoint = "merge-review";
  }
}

export async function recordCheckpoint(repoRoot, runId, checkpoint, decision, mode = null, note = "") {
  const status = await loadStatus(repoRoot, runId);
  const entry = createDecisionEntry({ checkpoint, decision, mode, note });
  status.decisions.push(entry);

  if (checkpoint === "clarify" && decision === "clarified") {
    status.phase = "clarified";
    status.current_checkpoint = "plan-review";
  }

  if (checkpoint === "plan-review") {
    if (decision === "approve_parallel" || decision === "force_serial") {
      if (mode === "parallel_ab" && status.plan.policy_forced_mode === "serial") {
        throw new Error("parallel_ab cannot be approved because local policy forced serial");
      }
      status.plan.status = "approved";
      status.plan.approved_mode = mode;
      status.phase = "plan-approved";
      status.current_checkpoint = "plan-review";
      status.tasks.a.enabled = false;
      status.tasks.a.prepared = false;
      status.tasks.a.status = status.tasks.a.planned ? "planned" : "skipped";
      status.tasks.b.enabled = false;
      status.tasks.b.prepared = false;
      status.tasks.b.status = mode === "parallel_ab" && status.tasks.b.planned ? "planned" : "skipped";
    } else if (decision === "needs_replan") {
      status.plan.status = "needs_replan";
      status.plan.approved_mode = null;
      status.phase = "clarify";
      status.current_checkpoint = "clarify";
    }
  }

  if (checkpoint === "merge-review" || checkpoint === "pre-integrate") {
    if (decision === "allow_manual_merge" || decision === "approve_ab") {
      status.phase = "ready-to-merge";
      status.current_checkpoint = "merge-review";
    } else if (decision === "return_a") {
      status.phase = "execute";
      status.current_checkpoint = "merge-review";
      status.tasks.a.status = "needs-rework";
      status.tasks.a.commit = null;
      status.tasks.a.commit_sha = null;
      status.tasks.a.commit_message = null;
      status.tasks.a.changed_files = [];
      status.tasks.a.committed_at = null;
      status.tasks.a.prepared = true;
      status.verification.a.status = "pending";
      status.verification.a.report = null;
    } else if (decision === "return_b") {
      status.phase = "execute";
      status.current_checkpoint = "merge-review";
      status.tasks.b.status = "needs-rework";
      status.tasks.b.commit = null;
      status.tasks.b.commit_sha = null;
      status.tasks.b.commit_message = null;
      status.tasks.b.changed_files = [];
      status.tasks.b.committed_at = null;
      status.tasks.b.prepared = true;
      status.verification.b.status = "pending";
      status.verification.b.report = null;
    } else if (decision === "hold_merge" || decision === "hold_publish") {
      status.phase = "merge-review";
      status.current_checkpoint = "merge-review";
    }
  }

  await saveStatus(repoRoot, runId, status);
  await appendDecisionMarkdown(repoRoot, runId, entry);
}

export async function bindSession(repoRoot, runId, role, explicitId = null) {
  const status = await loadStatus(repoRoot, runId);
  const marker = status.sessions[role]?.marker;

  if (!marker && !explicitId) {
    throw new Error(`Unknown session role: ${role}`);
  }

  const session = explicitId ? { id: explicitId } : await findLatestSessionByMarker(marker);

  if (!session?.id) {
    throw new Error(`Unable to locate session for marker: ${marker}`);
  }

  status.sessions[role].session_id = session.id;
  if (status.tasks[role]) {
    status.tasks[role].session_id = session.id;
  }
  await saveStatus(repoRoot, runId, status);
  return session.id;
}

export function getCodexArgs(config, repoRoot, extraDirs = []) {
  const args = [];
  if (config.codex.profile) {
    args.push("-p", String(config.codex.profile));
  }
  if (config.codex.sandbox) {
    args.push("-s", String(config.codex.sandbox));
  }
  if (config.codex.approval_policy) {
    args.push("-a", String(config.codex.approval_policy));
  }
  args.push("-C", repoRoot);
  for (const directory of extraDirs) {
    args.push("--add-dir", directory);
  }
  return args;
}

export async function runCodexInteractive(config, repoRoot, args, extraDirs = []) {
  const protocol = await resolveProtocolRoot(repoRoot);
  const allowedDirs = [...new Set([...(protocol === repoRoot ? [] : [protocol]), ...extraDirs])];
  const codexArgs = [...getCodexArgs(config, repoRoot, allowedDirs), ...args];
  await runCommand(config.codex.binary, codexArgs, { cwd: repoRoot, stdio: "inherit" });
}

export async function runCodexExec(config, repoRoot, args, logPrefix, extraDirs = []) {
  const logDir = path.dirname(logPrefix);
  await ensureDir(logDir);
  const stdoutPath = `${logPrefix}.stdout.log`;
  const stderrPath = `${logPrefix}.stderr.log`;
  const metaPath = `${logPrefix}.meta.json`;
  const stdoutChunks = [];
  const stderrChunks = [];
  const startedAt = isoNow();

  await new Promise((resolve, reject) => {
    const runner = async () => {
      const protocol = await resolveProtocolRoot(repoRoot);
      const allowedDirs = [...new Set([...(protocol === repoRoot ? [] : [protocol]), ...extraDirs])];
      const child = spawn(
        config.codex.binary,
        [...getCodexArgs(config, repoRoot, allowedDirs), "exec", ...args],
        { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
      );

      child.stdout.on("data", (chunk) => {
        stdoutChunks.push(chunk);
      });

      child.stderr.on("data", (chunk) => {
        stderrChunks.push(chunk);
      });

      child.on("error", reject);
      child.on("close", async (code) => {
        const stdout = Buffer.concat(stdoutChunks).toString("utf8");
        const stderr = Buffer.concat(stderrChunks).toString("utf8");
        const endedAt = isoNow();
        await writeText(stdoutPath, stdout);
        await writeText(stderrPath, stderr);
        await writeJson(metaPath, {
          command: config.codex.binary,
          args: [...getCodexArgs(config, repoRoot, allowedDirs), "exec", ...args],
          started_at: startedAt,
          ended_at: endedAt,
          exit_code: code,
          stdout_path: stdoutPath,
          stderr_path: stderrPath
        });

        if (code !== 0) {
          const hints = [];
          const combined = `${stdout}\n${stderr}`;
          if (/schema|output schema|json schema/i.test(combined)) {
            hints.push("Check the requested output schema and local schema preflight.");
          }
          if (/approval|sandbox|permission/i.test(combined)) {
            hints.push("Codex likely hit an approval or sandbox boundary.");
          }
          if (/state db|migration/i.test(combined)) {
            hints.push("Codex reported a local state or migration issue.");
          }
          const suffix = hints.length > 0 ? ` ${hints.join(" ")}` : "";
          const error = new Error(`codex exec failed with code ${code}.${suffix} See ${stdoutPath} and ${stderrPath}.`);
          error.code = code;
          error.stdoutPath = stdoutPath;
          error.stderrPath = stderrPath;
          error.metaPath = metaPath;
          reject(error);
          return;
        }

        resolve();
      });
    };

    runner().catch(reject);
  });

  return { stdoutPath, stderrPath, metaPath };
}

function parseStatusEntries(statusOutput) {
  return statusOutput
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const raw = line.slice(3);
      const paths = raw.includes(" -> ") ? raw.split(" -> ") : [raw];
      return { line, paths };
    });
}

function matchesTaskBoundary(filePath, taskPlan) {
  if (!taskPlan) {
    return false;
  }
  return matchesAny(filePath, taskPlan.include ?? []) && !matchesAny(filePath, taskPlan.exclude ?? []);
}

export async function runHooks(cwd, commands, reportPath) {
  const results = [];
  let overallStatus = "passed";

  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    const stdoutPath = `${reportPath}.${index}.stdout.log`;
    const stderrPath = `${reportPath}.${index}.stderr.log`;
    const startedAt = Date.now();
    const result = await runCommand("/bin/bash", ["-lc", command], { cwd, allowFailure: true });
    const durationMs = Date.now() - startedAt;
    await writeText(stdoutPath, result.stdout);
    await writeText(stderrPath, result.stderr);
    results.push({
      command,
      exit_code: result.code,
      duration_ms: durationMs,
      stdout_path: stdoutPath,
      stderr_path: stderrPath
    });

    if (result.code !== 0) {
      overallStatus = "failed";
    }
  }

  const report = {
    cwd,
    status: overallStatus,
    generated_at: isoNow(),
    commands: results
  };

  await writeJson(reportPath, report);
  return report;
}

export async function commitTask(repoRoot, runId, taskId, message = null) {
  const status = await loadStatus(repoRoot, runId);
  const task = status.tasks[taskId];
  if (!task?.enabled) {
    throw new Error(`Task ${taskId} is not enabled`);
  }
  if (status.verification[taskId].status !== "passed") {
    throw new Error(`Task ${taskId} must pass verification before commit`);
  }
  const plan = await readJson(runPaths(repoRoot, runId).planJson);
  const taskPlan = taskById(plan, taskId);
  const commitMessage = message || `feat(${taskId}): ${taskPlan?.title ?? `complete task ${taskId}`}`;
  const statusResult = await git(task.worktree, ["status", "--porcelain"], { allowFailure: true });
  const entries = parseStatusEntries(statusResult.stdout);
  const inScopeEntries = [];
  const outOfScopeEntries = [];

  for (const entry of entries) {
    const inScope = entry.paths.every((filePath) => matchesTaskBoundary(filePath, taskPlan));
    if (inScope) {
      inScopeEntries.push(entry);
    } else {
      outOfScopeEntries.push(entry.line);
    }
  }

  if (outOfScopeEntries.length > 0) {
    throw new Error(`Task ${taskId} has changes outside the approved boundary:\n${outOfScopeEntries.join("\n")}`);
  }

  const stagePaths = [...new Set(inScopeEntries.flatMap((entry) => entry.paths))];
  if (stagePaths.length === 0) {
    throw new Error(`Task ${taskId} has no changes inside the approved boundary to commit`);
  }

  await git(task.worktree, ["add", "-A", "--", ...stagePaths]);
  const changedFilesResult = await git(task.worktree, ["diff", "--cached", "--name-only"], { allowFailure: true });
  const changedFiles = changedFilesResult.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (changedFiles.length === 0) {
    throw new Error(`Task ${taskId} has no staged changes to commit after boundary filtering`);
  }
  await git(task.worktree, ["commit", "-m", commitMessage]);
  const head = await git(task.worktree, ["rev-parse", "HEAD"]);
  task.commit = head.stdout.trim();
  task.commit_sha = task.commit;
  task.commit_message = commitMessage;
  task.changed_files = changedFiles;
  task.committed_at = isoNow();
  task.commit_history ||= [];
  task.commit_history.push({
    sha: task.commit_sha,
    message: task.commit_message,
    changed_files: task.changed_files,
    committed_at: task.committed_at
  });
  task.status = "committed";
  advanceMergeReviewIfReady(status);
  await saveStatus(repoRoot, runId, status);
  return commitMessage;
}

export async function generateSummary(repoRoot, runId) {
  const status = await loadStatus(repoRoot, runId);
  const paths = runPaths(repoRoot, runId);
  const taskSummaries = [];

  for (const taskId of ["a", "b"]) {
    const task = status.tasks[taskId];
    if (!task?.enabled || !task.branch) {
      continue;
    }

    taskSummaries.push({
      task: taskId,
      branch: task.branch,
      commit_sha: task.commit_sha ?? task.commit ?? null,
      commit_message: task.commit_message ?? null,
      committed_at: task.committed_at ?? null,
      files: Array.isArray(task.changed_files) ? task.changed_files : []
    });
  }

  const summary = `# Summary

- run_id: ${runId}
- phase: ${status.phase}
- approved_mode: ${status.plan.approved_mode ?? "pending"}

## Decisions

${status.decisions.map((entry) => `- ${entry.at}: ${entry.checkpoint} -> ${entry.decision}${entry.mode ? ` (${entry.mode})` : ""}`).join("\n") || "- none"}

## Task Snapshots

${taskSummaries.map((entry) => `### ${entry.task.toUpperCase()} (${entry.branch})\n- commit_sha: ${entry.commit_sha ?? "pending"}\n- commit_message: ${entry.commit_message ?? "pending"}\n- committed_at: ${entry.committed_at ?? "pending"}\n- changed_files:\n${entry.files.map((file) => `  - ${file}`).join("\n") || "  - no files captured"}`).join("\n\n") || "No committed task snapshots yet."}

## Verification

- A: ${status.verification.a.status}
- B: ${status.verification.b.status}
- Main: ${status.verification.main.status}

## Merge Readiness

- phase: ${status.phase}
- next_checkpoint: ${status.current_checkpoint}
  `;

  const prBody = `# Summary

Run: ${runId}

## What Changed

${taskSummaries.map((entry) => `- ${entry.task.toUpperCase()} (${entry.branch} @ ${entry.commit_sha ?? "pending"}): ${entry.files.join(", ") || "no files captured"}`).join("\n") || "- pending"}

## Verification

- A: ${status.verification.a.status}
- B: ${status.verification.b.status}
- Main: ${status.verification.main.status}

## Human Checkpoints

${status.decisions.map((entry) => `- ${entry.checkpoint}: ${entry.decision}`).join("\n") || "- pending"}
`;

  await writeText(paths.summary, summary);
  await writeText(paths.prBody, prBody);
}
