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

export const sourceProtocolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const protocolRoot = sourceProtocolRoot;
const PROTOCOL_REQUIRED_ENTRIES = ["AGENTS.md", "prompts", "skills", "schemas", "scripts", "tools"];

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
  const checks = await Promise.all(
    PROTOCOL_REQUIRED_ENTRIES.map((entry) => pathExists(path.join(repoRoot, entry)))
  );

  if (checks.every(Boolean)) {
    return repoRoot;
  }

  return sourceProtocolRoot;
}

export async function resolveProtocolPaths(repoRoot) {
  const root = await resolveProtocolRoot(repoRoot);
  return {
    root,
    agents: path.join(root, "AGENTS.md"),
    promptsDir: path.join(root, "prompts"),
    skillsDir: path.join(root, "skills"),
    schemasDir: path.join(root, "schemas"),
    scriptsDir: path.join(root, "scripts"),
    toolsDir: path.join(root, "tools"),
    composerTool: path.join(root, "tools", "composer.mjs")
  };
}

export function runPaths(repoRoot, runId) {
  const stateRoot = path.join(repoRoot, ".codex-composer");
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
  const configPath = path.join(repoRoot, ".codex-composer.toml");
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
    enabled: role === "a",
    branch: null,
    worktree: null,
    launch_strategy: role === "a" ? "current_thread" : "manual_thread",
    status: "pending",
    commit: null,
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
  status.tasks.a ||= initialTaskState(runId, "a");
  status.tasks.b ||= initialTaskState(runId, "b");
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
  await ensureGitExcludeEntry(repoRoot, ".codex-composer/");
  await ensureGitIgnoreEntry(repoRoot, ".codex-composer/");

  await writeText(paths.requirements, `${requirement.trim()}\n`);
  await writeText(paths.clarifications, "# Clarifications\n\n- Pending checkpoint 1.\n");
  await writeText(paths.planMd, "# Plan Review\n\nPlan not generated yet.\n");
  await writeText(paths.decisions, "# Decisions\n\n");
  await writeText(paths.summary, "# Summary\n\nPending.\n");
  await writeText(paths.prBody, "# PR Body\n\nPending.\n");
  await saveStatus(repoRoot, runId, status);

  return paths;
}

async function ensureGitExcludeEntry(repoRoot, entry) {
  const excludePath = path.join(repoRoot, ".git", "info", "exclude");
  if (!(await pathExists(excludePath))) {
    return;
  }

  const existing = await readText(excludePath, "");
  if (existing.split(/\r?\n/).includes(entry)) {
    return;
  }

  const suffix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
  await writeText(excludePath, `${existing}${suffix}${entry}\n`);
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

export async function collectRepoFiles(repoRoot) {
  const files = [];

  async function walk(current, relative = "") {
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === ".codex-composer" || entry.name === "node_modules") {
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
    ? path.join(protocol.promptsDir, "planner.md")
    : path.join(protocol.promptsDir, "integrator-reviewer.md");
  const template = await readText(templatePath);
  const promptPath = path.join(paths.logsDir, `control-${checkpoint}.md`);
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

When the user makes a decision, persist it with:

- ${path.join(protocol.scriptsDir, "composer-checkpoint.sh")} --run ${runId} --checkpoint ${checkpoint} --decision <decision> [--mode <serial|parallel_ab>] [--note "<summary>"]
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
2. ${path.join(protocol.promptsDir, "planner.md")}
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
2. ${path.join(protocol.promptsDir, "task-owner.md")}
3. ${paths.planMd}
4. ${paths.status}

Stay inside the task boundary. After implementation, run verification and commit from the repository scripts. Do not merge branches from this prompt.
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
    status.tasks[taskId].enabled = Boolean(task);
    status.tasks[taskId].launch_strategy = taskId === "a" ? "current_thread" : "manual_thread";
    status.tasks[taskId].status = task ? "pending" : "skipped";
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
      status.tasks.b.enabled = mode === "parallel_ab";
      if (mode !== "parallel_ab") {
        status.tasks.b.status = "skipped";
      }
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
      status.verification.a.status = "pending";
      status.verification.a.report = null;
    } else if (decision === "return_b") {
      status.phase = "execute";
      status.current_checkpoint = "merge-review";
      status.tasks.b.status = "needs-rework";
      status.tasks.b.commit = null;
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
  const stdoutChunks = [];
  const stderrChunks = [];

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
        await writeText(stdoutPath, stdout);
        await writeText(stderrPath, stderr);

        if (code !== 0) {
          const error = new Error(`codex exec failed with code ${code}`);
          error.code = code;
          error.stdoutPath = stdoutPath;
          error.stderrPath = stderrPath;
          reject(error);
          return;
        }

        resolve();
      });
    };

    runner().catch(reject);
  });

  return { stdoutPath, stderrPath };
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
  await git(task.worktree, ["add", "-A"]);
  await git(task.worktree, ["commit", "-m", commitMessage]);
  const head = await git(task.worktree, ["rev-parse", "HEAD"]);
  task.commit = head.stdout.trim();
  task.status = "committed";
  advanceMergeReviewIfReady(status);
  await saveStatus(repoRoot, runId, status);
  return commitMessage;
}

export async function generateSummary(repoRoot, runId) {
  const status = await loadStatus(repoRoot, runId);
  const paths = runPaths(repoRoot, runId);
  const config = await loadConfig(repoRoot);
  const mainBranch = config.project.main_branch;
  const branchSummaries = [];

  for (const taskId of ["a", "b"]) {
    const task = status.tasks[taskId];
    if (!task?.enabled || !task.branch) {
      continue;
    }

    const diff = await git(repoRoot, ["diff", "--name-only", `${mainBranch}...${task.branch}`], { allowFailure: true });
    branchSummaries.push({
      task: taskId,
      branch: task.branch,
      files: diff.stdout.trim().split(/\r?\n/).filter(Boolean)
    });
  }

  const summary = `# Summary

- run_id: ${runId}
- phase: ${status.phase}
- approved_mode: ${status.plan.approved_mode ?? "pending"}

## Decisions

${status.decisions.map((entry) => `- ${entry.at}: ${entry.checkpoint} -> ${entry.decision}${entry.mode ? ` (${entry.mode})` : ""}`).join("\n") || "- none"}

## Branch Deltas

${branchSummaries.map((entry) => `### ${entry.task.toUpperCase()} (${entry.branch})\n${entry.files.map((file) => `- ${file}`).join("\n") || "- no diff detected"}`).join("\n\n") || "No branch deltas yet."}

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

${branchSummaries.map((entry) => `- ${entry.task.toUpperCase()}: ${entry.files.join(", ") || "no diff detected"}`).join("\n") || "- pending"}

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
