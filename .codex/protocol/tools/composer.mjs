#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { bootstrapProtocolRepo, migrateLegacyRepo } from "./lib/bootstrap.mjs";
import { createRun, loadConfig, resolveRepoRoot, runPaths, renderControlPrompt, loadStatus, bindSession, renderPlanRequest, validatePlan, evaluateParallelPolicy, writePlanArtifacts, updateStatusForPlan, recordCheckpoint, resolveProtocolPaths, resolveLocalRoot, saveStatus, git, ensureCleanWorktree, currentBranch, sanitizeBranchFragment, branchExists, renderTaskPrompt, runCodexInteractive, runCodexExec, runHooks, commitTask, generateSummary, publicCommand } from "./lib/runtime.mjs";
import { readJson, pathExists } from "./lib/fs.mjs";

const SKILL_DIRS = {
  planner: "planner",
  taskOwner: "task-owner",
  integratorReviewer: "integrator-reviewer"
};

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

function promptPathForTask(repoRoot, runId, taskId) {
  return path.join(runPaths(repoRoot, runId).tasksDir, `${taskId}.md`);
}

async function skillPath(protocol, skillKey) {
  return path.join(protocol.skillsDir, SKILL_DIRS[skillKey], "SKILL.md");
}

function taskSummaryLines(repoRoot, runId, taskId, taskState) {
  const lines = [
    `- ${taskId.toUpperCase()}: ${taskState.enabled ? taskState.status : "disabled"}`
  ];

  if (taskState.branch) {
    lines.push(`  branch: ${taskState.branch}`);
  }

  if (taskState.worktree) {
    lines.push(`  worktree: ${taskState.worktree}`);
  }

  if (taskId === "a" || taskId === "b") {
    lines.push(`  prompt: ${promptPathForTask(repoRoot, runId, taskId)}`);
    lines.push(`  launch_strategy: ${taskState.launch_strategy}`);
  }

  if (taskState.commit) {
    lines.push(`  commit: ${taskState.commit}`);
  }

  return lines;
}

async function recommendedNextSteps(repoRoot, runId, status) {
  const protocol = await resolveProtocolPaths(repoRoot);
  const migrateCommand = await publicCommand(repoRoot, "migrate");
  const checkpointCommand = await publicCommand(repoRoot, "checkpoint");
  const planCommand = await publicCommand(repoRoot, "plan");
  const splitCommand = await publicCommand(repoRoot, "split");
  const verifyCommand = await publicCommand(repoRoot, "verify");
  const commitCommand = await publicCommand(repoRoot, "commit");
  const summarizeCommand = await publicCommand(repoRoot, "summarize");

  if (protocol.deprecated) {
    return [
      `Run ${migrateCommand} before continuing so protocol/runtime assets and repo-native skills move to the canonical .codex + .agents layout.`,
      "After migration, rerun the same command in the same repository."
    ];
  }

  switch (status.phase) {
    case "clarify":
    case "clarified":
      return [
        "Stay in the current Codex thread. This thread is the planner/control thread.",
        `Use the repo's planner skill in the current Codex thread. Supporting references: AGENTS.md, ${await skillPath(protocol, "planner")}, and ${runPaths(repoRoot, runId).clarifications}.`,
        `Record clarify with ${checkpointCommand} --run ${runId} --checkpoint clarify --decision clarified --note "<summary>".`,
        `Generate the plan with ${planCommand} --run ${runId}.`
      ];
    case "plan-review":
      return [
        "Stay in the current Codex thread and use the planner skill to review PLAN.md and choose the next checkpoint.",
        `Choose parallel or serial with ${checkpointCommand} --run ${runId} --checkpoint plan-review --decision approve_parallel --mode parallel_ab`,
        `Or keep it serial with ${checkpointCommand} --run ${runId} --checkpoint plan-review --decision force_serial --mode serial`,
        `If the requirement changed, record needs_replan and rerun ${planCommand} --run ${runId}.`
      ];
    case "plan-approved":
      return [
        `${splitCommand} --run ${runId} will prepare task A in the current repo and create the optional B worktree.`,
        "After split, continue task A in the current repo. If B is enabled, open a new Codex thread in the B worktree."
      ];
    case "execute": {
      const steps = [];
      if (status.tasks.a.enabled && ["ready", "pending", "needs-rework"].includes(status.tasks.a.status)) {
        steps.push(`Continue task A in the current Codex thread with the task-owner skill. Task brief: ${promptPathForTask(repoRoot, runId, "a")}. Working tree: ${status.tasks.a.worktree ?? repoRoot}.`);
        steps.push(`When task A is ready, run ${verifyCommand} --run ${runId} --target a and then ${commitCommand} --run ${runId} --task a.`);
      }
      if (status.tasks.b.enabled && ["ready", "pending", "needs-rework"].includes(status.tasks.b.status)) {
        steps.push(`Open a new Codex thread in ${status.tasks.b.worktree ?? "<pending split>"} for task B, then use the task-owner skill there. Task brief: ${promptPathForTask(repoRoot, runId, "b")}.`);
        steps.push(`When task B is ready, run ${verifyCommand} --run ${runId} --target b and then ${commitCommand} --run ${runId} --task b.`);
      }
      if (steps.length > 0) {
        return steps;
      }
      return ["Run verification or continue the next approved branch action."];
    }
    case "merge-review":
      return [
        "Return to the current Codex thread and use the integrator-reviewer skill to inspect status.json, verify reports, and committed task snapshots.",
        `If merge-ready, record ${checkpointCommand} --run ${runId} --checkpoint merge-review --decision allow_manual_merge.`,
        `If a task needs more work, record ${checkpointCommand} --run ${runId} --checkpoint merge-review --decision return_a|return_b.`
      ];
    case "ready-to-merge":
      return [
        "Manually merge the verified task branches into your chosen integration target or main branch.",
        `After merging to main, run ${verifyCommand} --run ${runId} --target main.`,
        `Generate handoff text with ${summarizeCommand} --run ${runId}.`
      ];
    case "completed":
      return [
        `Summary: ${runPaths(repoRoot, runId).summary}`,
        `PR body: ${runPaths(repoRoot, runId).prBody}`,
        `Run ${summarizeCommand} --run ${runId} if SUMMARY.md or PR_BODY.md need regeneration.`
      ];
    default:
      return ["Inspect status.json and continue from the latest approved checkpoint."];
  }
}

async function renderStatusOutput(repoRoot, runId, status) {
  const protocol = await resolveProtocolPaths(repoRoot);
  const lines = [
    `run_id: ${runId}`,
    `repo_root: ${repoRoot}`,
    `phase: ${status.phase}`,
    `current_checkpoint: ${status.current_checkpoint}`,
    `recommended_mode: ${status.plan.recommended_mode ?? "pending"}`,
    `approved_mode: ${status.plan.approved_mode ?? "pending"}`,
    `layout_mode: ${protocol.mode}`,
    `control_session: ${status.sessions.control?.session_id ?? "current-thread"}`,
    "",
    "tasks:"
  ];

  if (protocol.warnings?.length) {
    for (const warning of protocol.warnings) {
      lines.push(`warning: ${warning}`);
    }
    lines.push("");
  }

  for (const taskId of ["a", "b"]) {
    lines.push(...taskSummaryLines(repoRoot, runId, taskId, status.tasks[taskId]));
  }

  lines.push(
    "",
    "verification:",
    `- A: ${status.verification.a.status}`,
    `- B: ${status.verification.b.status}`,
    `- Main: ${status.verification.main.status}`,
    "",
    "next_steps:"
  );

  for (const step of await recommendedNextSteps(repoRoot, runId, status)) {
    lines.push(`- ${step}`);
  }

  return `${lines.join("\n")}\n`;
}

async function resolveRunIdForNext(repoRoot, explicitRunId = null) {
  if (explicitRunId) {
    return explicitRunId;
  }

  const startCommand = await publicCommand(repoRoot, "start");
  const runsRoot = path.join(resolveLocalRoot(repoRoot), "runs");
  if (!(await pathExists(runsRoot))) {
    throw new Error(`No runs found. Start one first with ${startCommand} --run <id> --requirement "..."`);
  }

  const entries = await fs.readdir(runsRoot, { withFileTypes: true });
  const unfinished = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const status = await readJson(path.join(runsRoot, entry.name, "status.json"));
    if (status && status.phase !== "completed") {
      unfinished.push(entry.name);
    }
  }

  if (unfinished.length === 1) {
    return unfinished[0];
  }

  if (unfinished.length === 0) {
    throw new Error(`No unfinished runs found. Start a run with ${startCommand} --run <id> --requirement "..."`);
  }

  throw new Error(`Multiple unfinished runs found: ${unfinished.join(", ")}. Re-run with --run <id>.`);
}

async function commandNewRun(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const requirement = requireArg(args, "requirement");
  const paths = await createRun(repoRoot, runId, requirement);
  console.log(paths.runRoot);
}

async function commandStart(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const requirement = requireArg(args, "requirement");
  await createRun(repoRoot, runId, requirement);
  const paths = runPaths(repoRoot, runId);
  const protocol = await resolveProtocolPaths(repoRoot);
  const checkpointCommand = await publicCommand(repoRoot, "checkpoint");
  const planCommand = await publicCommand(repoRoot, "plan");
  const nextCommand = await publicCommand(repoRoot, "next");
  const migrateCommand = await publicCommand(repoRoot, "migrate");

  const lines = [
    `run_id: ${runId}`,
    `repo_root: ${repoRoot}`,
    `run_root: ${paths.runRoot}`,
    "",
    "next_steps:"
  ];

  if (protocol.deprecated) {
    for (const warning of protocol.warnings ?? []) {
      lines.push(`- ${warning}`);
    }
    lines.push(`- Run ${migrateCommand} before using planner/task skills in this repository.`);
  } else {
    lines.push(
      "- Stay in the current Codex thread. This thread is the planner/control thread.",
      `- Use the repo's planner skill in the current Codex thread. Supporting references: AGENTS.md and ${await skillPath(protocol, "planner")}.`,
      `- Update ${paths.clarifications} with any missing acceptance criteria or constraints.`,
      `- Record checkpoint 1 with ${checkpointCommand} --run ${runId} --checkpoint clarify --decision clarified --note "<summary>".`,
      `- Generate the plan with ${planCommand} --run ${runId}.`,
      `- Use ${nextCommand} --run ${runId} after each checkpoint for the recommended next step.`
    );
  }

  process.stdout.write(lines.join("\n"));
  process.stdout.write("\n");
}

async function commandInitRepo(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const result = await bootstrapProtocolRepo({
    repoRoot,
    template: args.template ?? "existing",
    codexBinary: args.codex_binary ?? "codex"
  });
  console.log(`${result.repoRoot}\ninitialized_git=${result.initializedGit}\ntemplate=${result.template}\nlauncher=${result.launcher}`);
}

async function commandMigrate(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const result = await migrateLegacyRepo({ repoRoot });
  process.stdout.write([
    `repo_root: ${result.repoRoot}`,
    `launcher: ${result.launcher ?? "unchanged"}`,
    `migrated: ${result.migrated ? "true" : "false"}`,
    `moved: ${result.moved.join(", ") || "none"}`,
    `remaining: ${result.remaining.join(", ") || "none"}`
  ].join("\n"));
  process.stdout.write("\n");
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

  if (!process.stdout.isTTY || process.env.TERM === "dumb") {
    process.stdout.write([
      `checkpoint: ${checkpoint}`,
      `prompt_path: ${promptPath}`,
      "",
      "This shell is not suitable for launching an interactive Codex session.",
      "Stay in the current Codex thread or open a rich terminal/Codex App window, then read the prompt file above."
    ].join("\n"));
    process.stdout.write("\n");
    return;
  }

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
  const desiredABranch = `${branchPrefix}${fragment}-a`;
  const current = await currentBranch(repoRoot);
  let aBranch = current;

  if (current === baseBranch) {
    if (await branchExists(repoRoot, desiredABranch)) {
      await git(repoRoot, ["checkout", desiredABranch]);
    } else {
      await git(repoRoot, ["checkout", "-b", desiredABranch]);
    }
    aBranch = desiredABranch;
  }

  status.tasks.a.enabled = true;
  status.tasks.a.branch = aBranch;
  status.tasks.a.worktree = repoRoot;
  status.tasks.a.status = "ready";
  status.tasks.a.launch_strategy = "current_thread";
  await renderTaskPrompt(repoRoot, runId, "a", plan);

  if (status.plan.approved_mode === "parallel_ab") {
    const bBranch = `${branchPrefix}${fragment}-b`;
    const bWorktree = path.join(paths.worktreesDir, "b");
    const exists = await branchExists(repoRoot, bBranch);
    const alreadyExists = await pathExists(bWorktree);

    if (!alreadyExists) {
      const addArgs = ["worktree", "add"];
      if (exists) {
        addArgs.push(bWorktree, bBranch);
      } else {
        addArgs.push("-b", bBranch, bWorktree, baseBranch);
      }
      await git(repoRoot, addArgs);
    }

    status.tasks.b.enabled = true;
    status.tasks.b.branch = bBranch;
    status.tasks.b.worktree = bWorktree;
    status.tasks.b.status = "ready";
    status.tasks.b.launch_strategy = "manual_thread";
    await renderTaskPrompt(repoRoot, runId, "b", plan);
  } else {
    status.tasks.b.enabled = false;
    status.tasks.b.branch = null;
    status.tasks.b.worktree = null;
    status.tasks.b.status = "skipped";
  }

  status.phase = "execute";
  status.current_checkpoint = "execute";
  await saveStatus(repoRoot, runId, status);
  process.stdout.write(await renderStatusOutput(repoRoot, runId, status));
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

  if (args.interactive) {
    await runCodexInteractive(config, task.worktree, [`Read ${promptPath} and implement task ${taskId}.`], [paths.runRoot]);
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
    if (!status.tasks[target]?.enabled) {
      throw new Error(`Task ${target} is not enabled`);
    }
    cwd = status.tasks[target].worktree;
    commands = config.hooks.branch_verify;
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
    if (report.status === "failed") {
      status.phase = "execute";
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
  const status = await loadStatus(repoRoot, runId);
  const verifyCommand = await publicCommand(repoRoot, "verify");
  const summarizeCommand = await publicCommand(repoRoot, "summarize");
  const steps = [
    "composer-integrate.sh is now a compatibility helper.",
    "Preferred MVP flow: review merge readiness in the current Codex thread, then merge manually.",
    "",
    `A branch: ${status.tasks.a.branch ?? "(not prepared)"}`,
    `B branch: ${status.tasks.b.enabled ? status.tasks.b.branch : "(not enabled)"}`,
    "",
    "Suggested manual sequence:",
    `1. git checkout ${status.plan.approved_mode === "parallel_ab" ? "main" : status.tasks.a.branch ?? "main"}`,
    status.tasks.a.branch ? `2. git merge --no-ff ${status.tasks.a.branch}` : "2. prepare task A first",
    status.tasks.b.enabled && status.tasks.b.branch ? `3. git merge --no-ff ${status.tasks.b.branch}` : "3. skip B or merge it manually if enabled",
    `4. ${verifyCommand} --run ${runId} --target main`,
    `5. ${summarizeCommand} --run ${runId}`
  ];

  process.stdout.write(`${steps.join("\n")}\n`);
}

async function commandSummarize(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  await generateSummary(repoRoot, runId);
}

async function commandStatus(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = requireArg(args, "run");
  const status = await loadStatus(repoRoot, runId);
  process.stdout.write(await renderStatusOutput(repoRoot, runId, status));
}

async function commandNext(args) {
  const repoRoot = await resolveRepoRoot(args.repo);
  const runId = await resolveRunIdForNext(repoRoot, args.run ?? null);
  const status = await loadStatus(repoRoot, runId);

  if (status.phase === "plan-approved") {
    await commandSplit({ repo: repoRoot, run: runId });
    return;
  }

  if (status.phase === "completed" && args.refresh) {
    await generateSummary(repoRoot, runId);
  }

  process.stdout.write(await renderStatusOutput(repoRoot, runId, await loadStatus(repoRoot, runId)));
}

const commands = {
  "init-repo": commandInitRepo,
  migrate: commandMigrate,
  "new-run": commandNewRun,
  start: commandStart,
  next: commandNext,
  "chat-control": commandChatControl,
  plan: commandPlan,
  checkpoint: commandCheckpoint,
  "bind-session": commandBindSession,
  split: commandSplit,
  "run-task": commandRunTask,
  verify: commandVerify,
  commit: commandCommit,
  integrate: commandIntegrate,
  summarize: commandSummarize,
  status: commandStatus
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
