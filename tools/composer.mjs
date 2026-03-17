#!/usr/bin/env node

import path from "node:path";
import { bootstrapProtocolRepo } from "./lib/bootstrap.mjs";
import { createRun, loadConfig, resolveRepoRoot, runPaths, renderControlPrompt, loadStatus, bindSession, renderPlanRequest, validatePlan, evaluateParallelPolicy, writePlanArtifacts, updateStatusForPlan, recordCheckpoint, resolveProtocolPaths, saveStatus, git, ensureCleanWorktree, currentBranch, sanitizeBranchFragment, branchExists, renderTaskPrompt, runCodexInteractive, runCodexExec, runHooks, commitTask, generateSummary } from "./lib/runtime.mjs";
import { readJson, pathExists } from "./lib/fs.mjs";

function parseArgs(argv) {
  const result = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      result._.push(token);
      continue;
    }

    const key = token.slice(2).replace(/-/g, "_");
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }

    result[key] = next;
    index += 1;
  }

  return result;
}

function requireArg(args, key) {
  if (!args[key]) {
    throw new Error(`Missing required argument --${key.replace(/_/g, "-")}`);
  }
  return args[key];
}

async function commandNewRun(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const requirement = requireArg(args, "requirement");
  const paths = await createRun(repoRoot, runId, requirement);
  console.log(paths.runRoot);
}

async function commandInitRepo(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const result = await bootstrapProtocolRepo({
    repoRoot,
    template: args.template ?? "empty",
    codexBinary: args.codex_binary ?? "codex"
  });
  console.log(`${result.repoRoot}\ninitialized_git=${result.initializedGit}\ntemplate=${result.template}`);
}

async function commandChatControl(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const checkpoint = requireArg(args, "checkpoint");
  const config = await loadConfig(repoRoot);
  const promptPath = await renderControlPrompt(repoRoot, runId, checkpoint);
  const status = await loadStatus(repoRoot, runId);
  const paths = runPaths(repoRoot, runId);
  const prompt = `[${status.sessions.control.marker}] Read ${promptPath} and operate as the Codex Composer control session.`;

  if (status.sessions.control.session_id) {
    await runCodexInteractive(config, repoRoot, ["resume", status.sessions.control.session_id, `Continue checkpoint ${checkpoint}. Read ${promptPath}.`], [paths.runRoot]);
    return;
  }

  await runCodexInteractive(config, repoRoot, [prompt], [paths.runRoot]);
  const sessionId = await bindSession(repoRoot, runId, "control");
  console.log(sessionId);
}

async function commandPlan(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const config = await loadConfig(repoRoot);
  const paths = runPaths(repoRoot, runId);
  const requestPath = await renderPlanRequest(repoRoot, runId);
  const protocol = await resolveProtocolPaths(repoRoot);
  const outputPath = path.join(paths.logsDir, "plan.last-message.json");
  const logPrefix = path.join(paths.logsDir, "plan");

  await runCodexExec(
    config,
    repoRoot,
    [
      "--json",
      "--output-schema",
      path.join(protocol.schemasDir, "plan.schema.json"),
      "--output-last-message",
      outputPath,
      `Read ${requestPath} and respond with JSON only.`
    ],
    logPrefix,
    [paths.runRoot]
  );

  const plan = await readJson(outputPath);
  const errors = validatePlan(plan);
  if (errors.length > 0) {
    throw new Error(`Invalid plan.json: ${errors.join("; ")}`);
  }

  plan.policy_evaluation = await evaluateParallelPolicy(repoRoot, config, plan);
  if (plan.policy_evaluation.forced_mode) {
    const originalRecommendedMode = plan.recommended_mode;
    plan.recommended_mode = plan.policy_evaluation.forced_mode;
    plan.alternative_modes = [...new Set([originalRecommendedMode, ...(plan.alternative_modes ?? [])].filter((mode) => mode !== plan.recommended_mode))];
    plan.conflict_reasons = [...new Set([...(plan.conflict_reasons ?? []), ...plan.policy_evaluation.reasons])];
  }
  await writePlanArtifacts(repoRoot, runId, plan);
  await updateStatusForPlan(repoRoot, runId, plan);
  console.log(paths.planJson);
}

async function commandCheckpoint(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const checkpoint = requireArg(args, "checkpoint");
  const decision = requireArg(args, "decision");
  await recordCheckpoint(repoRoot, runId, checkpoint, decision, args.mode ?? null, args.note ?? "");
}

async function commandBindSession(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const role = requireArg(args, "role");
  const sessionId = await bindSession(repoRoot, runId, role, args.session_id ?? null);
  console.log(sessionId);
}

async function commandSplit(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const config = await loadConfig(repoRoot);
  const status = await loadStatus(repoRoot, runId);
  const paths = runPaths(repoRoot, runId);

  if (!status.plan.approved_mode) {
    throw new Error("Plan mode must be approved before split");
  }

  const approvalDecision = status.decisions.find((entry) => entry.checkpoint === "plan-review" && entry.mode === status.plan.approved_mode);
  if (!approvalDecision) {
    throw new Error("Plan mode must be recorded through a plan-review decision before split");
  }

  await ensureCleanWorktree(repoRoot);

  const baseBranch = config.project.main_branch || await currentBranch(repoRoot);
  const fragment = sanitizeBranchFragment(runId);
  const branchPrefix = config.project.branch_prefix || "codex/";
  const plan = await readJson(paths.planJson);

  const workItems = [
    { task: "a", branch: `${branchPrefix}${fragment}-a`, worktree: path.join(paths.worktreesDir, "a"), enabled: true },
    { task: "ab", branch: `${branchPrefix}${fragment}-ab`, worktree: path.join(paths.worktreesDir, "ab"), enabled: status.plan.approved_mode === "parallel_ab" }
  ];

  if (status.plan.approved_mode === "parallel_ab") {
    workItems.splice(1, 0, { task: "b", branch: `${branchPrefix}${fragment}-b`, worktree: path.join(paths.worktreesDir, "b"), enabled: true });
  }

  for (const item of workItems) {
    if (!item.enabled) {
      continue;
    }

    const exists = await branchExists(repoRoot, item.branch);
    const worktreeExists = await pathExists(item.worktree);

    if (!worktreeExists) {
      const addArgs = ["worktree", "add"];
      if (exists) {
        addArgs.push(item.worktree, item.branch);
      } else {
        addArgs.push("-b", item.branch, item.worktree, baseBranch);
      }
      await git(repoRoot, addArgs);
    }

    status.tasks[item.task].enabled = true;
    status.tasks[item.task].branch = item.branch;
    status.tasks[item.task].worktree = item.worktree;
    status.tasks[item.task].status = item.task === "ab" ? "pending" : "ready";

    if (item.task === "a" || item.task === "b") {
      await renderTaskPrompt(repoRoot, runId, item.task, plan);
    }
  }

  if (status.plan.approved_mode === "serial") {
    status.tasks.b.enabled = false;
    status.tasks.b.status = "skipped";
    status.tasks.ab.enabled = false;
    status.tasks.ab.status = "skipped";
  }

  status.phase = "execute";
  await saveStatus(repoRoot, runId, status);
}

async function commandRunTask(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const taskId = requireArg(args, "task");
  const config = await loadConfig(repoRoot);
  const status = await loadStatus(repoRoot, runId);
  const paths = runPaths(repoRoot, runId);
  const task = status.tasks[taskId];

  if (!task?.enabled) {
    throw new Error(`Task ${taskId} is not enabled`);
  }

  const promptPath = path.join(paths.tasksDir, `${taskId}.md`);
  if (!(await pathExists(promptPath))) {
    throw new Error(`Task prompt not found: ${promptPath}`);
  }

  if (args.interactive || task.mode === "interactive") {
    const marker = status.sessions[taskId].marker;
    if (status.sessions[taskId].session_id) {
      await runCodexInteractive(config, task.worktree, ["resume", status.sessions[taskId].session_id, `Continue task ${taskId}. Read ${promptPath}.`], [paths.runRoot]);
    } else if (status.sessions.control.session_id) {
      await runCodexInteractive(config, task.worktree, ["fork", status.sessions.control.session_id, `[${marker}] Read ${promptPath} and implement task ${taskId}.`], [paths.runRoot]);
      await bindSession(repoRoot, runId, taskId);
    } else {
      await runCodexInteractive(config, task.worktree, [`[${marker}] Read ${promptPath} and implement task ${taskId}.`], [paths.runRoot]);
      await bindSession(repoRoot, runId, taskId);
    }
  } else {
    const outputPath = path.join(paths.logsDir, `${taskId}.last-message.md`);
    await runCodexExec(
      config,
      task.worktree,
      [
        "--json",
        "--output-last-message",
        outputPath,
        `Read ${promptPath} and implement task ${taskId}.`
      ],
      path.join(paths.logsDir, `${taskId}.exec`),
      [paths.runRoot]
    );
  }

  status.tasks[taskId].status = "completed";
  status.tasks[taskId].last_run_at = new Date().toISOString();
  await saveStatus(repoRoot, runId, status);
}

async function commandVerify(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const target = requireArg(args, "target");
  const config = await loadConfig(repoRoot);
  const status = await loadStatus(repoRoot, runId);
  const paths = runPaths(repoRoot, runId);
  const reportPath = path.join(paths.verifyDir, `${target}.json`);

  let cwd = repoRoot;
  let commands = [];

  if (target === "a" || target === "b") {
    cwd = status.tasks[target].worktree;
    commands = config.hooks.branch_verify;
  } else if (target === "ab") {
    cwd = status.tasks.ab.worktree;
    commands = config.hooks.integration_verify;
  } else if (target === "main") {
    commands = config.hooks.main_verify;
  } else {
    throw new Error(`Unknown verify target: ${target}`);
  }

  const report = await runHooks(cwd, commands, reportPath);
  status.verification[target].status = report.status;
  status.verification[target].report = reportPath;

  if (target === "a" || target === "b") {
    status.tasks[target].status = report.status === "passed" ? "verified" : "failed";
    const mode = status.plan.approved_mode;
    if (mode === "parallel_ab") {
      if (status.verification.a.status === "passed" && status.verification.b.status === "passed") {
        status.phase = "pre-integrate";
        status.current_checkpoint = "pre-integrate";
      }
    } else if (mode === "serial" && status.verification.a.status === "passed") {
      status.phase = "publish";
      status.current_checkpoint = "publish";
    }
  }

  if (target === "ab") {
    status.tasks.ab.status = report.status === "passed" ? "verified" : "failed";
    if (report.status === "passed") {
      status.phase = "publish";
      status.current_checkpoint = "publish";
    }
  }

  if (target === "main" && report.status === "passed") {
    status.phase = "completed";
    status.current_checkpoint = "completed";
  }

  await saveStatus(repoRoot, runId, status);
}

async function commandCommit(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const taskId = requireArg(args, "task");
  const message = await commitTask(repoRoot, runId, taskId, args.message ?? null);
  console.log(message);
}

async function commandIntegrate(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const config = await loadConfig(repoRoot);
  const status = await loadStatus(repoRoot, runId);
  const mode = status.plan.approved_mode;

  if (!mode) {
    throw new Error("Plan mode must be approved before integration");
  }

  await ensureCleanWorktree(repoRoot);

  if (mode === "parallel_ab") {
    if (status.phase === "pre-integrate-approved") {
      if (status.tasks.a.status !== "committed" || status.tasks.b.status !== "committed") {
        throw new Error("Tasks A and B must be committed before integrating into AB");
      }

      await git(status.tasks.ab.worktree, ["merge", "--no-ff", status.tasks.a.branch, "-m", `merge(a): ${runId}`]);
      await git(status.tasks.ab.worktree, ["merge", "--no-ff", status.tasks.b.branch, "-m", `merge(b): ${runId}`]);
      status.tasks.ab.status = "completed";
      status.phase = "ab-ready-for-verify";
      await saveStatus(repoRoot, runId, status);
      return;
    }

    if (status.phase === "publish-approved") {
      if (status.verification.ab.status !== "passed") {
        throw new Error("AB verification must pass before merge to main");
      }

      await git(repoRoot, ["merge", "--no-ff", status.tasks.ab.branch, "-m", `merge(ab): ${runId}`]);
      status.phase = "main-ready-for-verify";
      await saveStatus(repoRoot, runId, status);
      return;
    }
  }

  if (mode === "serial") {
    if (status.phase !== "publish-approved") {
      throw new Error("Serial mode requires publish approval before merge to main");
    }
    if (status.tasks.a.status !== "committed") {
      throw new Error("Task A must be committed before merge to main");
    }
    await git(repoRoot, ["merge", "--no-ff", status.tasks.a.branch, "-m", `merge(a): ${runId}`]);
    status.phase = "main-ready-for-verify";
    await saveStatus(repoRoot, runId, status);
  }
}

async function commandSummarize(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  await generateSummary(repoRoot, runId);
}

const commands = {
  "init-repo": commandInitRepo,
  "new-run": commandNewRun,
  "chat-control": commandChatControl,
  plan: commandPlan,
  checkpoint: commandCheckpoint,
  "bind-session": commandBindSession,
  split: commandSplit,
  "run-task": commandRunTask,
  verify: commandVerify,
  commit: commandCommit,
  integrate: commandIntegrate,
  summarize: commandSummarize
};

const [command, ...rest] = process.argv.slice(2);

if (!command || !(command in commands)) {
  console.error(`Usage: node tools/composer.mjs <${Object.keys(commands).join("|")}> [--flags]`);
  process.exit(1);
}

try {
  await commands[command](parseArgs(rest));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
