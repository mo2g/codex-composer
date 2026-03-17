import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { validatePlan } from "../tools/lib/runtime.mjs";
import { createTestRepo, makeTempDir, readJson, readText, runScript, runTool, runRepoScript, runRepoTool, setGitUser, writeConfig, commitAll } from "./helpers/repo.mjs";

async function createHome() {
  const home = await makeTempDir("codex-home-");
  await fs.mkdir(path.join(home, ".codex"), { recursive: true });
  await fs.writeFile(path.join(home, ".codex", "session_index.jsonl"), "", "utf8");
  return home;
}

async function createRun(repoRoot, runId, requirement = "Implement a login module") {
  await runScript("composer-new-run.sh", ["--repo", repoRoot, "--run", runId, "--requirement", requirement]);
}

async function initLocalRepo(template) {
  const repoRoot = await makeTempDir(`codex-composer-${template}-`);
  await runScript("composer-init-repo.sh", ["--repo", repoRoot, "--template", template]);
  await setGitUser(repoRoot);
  await writeConfig(repoRoot);
  await commitAll(repoRoot);
  return repoRoot;
}

test("validatePlan rejects missing required fields", () => {
  const errors = validatePlan({
    summary: "bad",
    recommended_mode: "parallel_ab",
    tasks: []
  });

  assert.ok(errors.some((entry) => entry.includes("alternative_modes")));
  assert.ok(errors.some((entry) => entry.includes("questions_for_user")));
});

test("chat-control binds a new control session when sessions.json is missing control", async () => {
  const repoRoot = await createTestRepo();
  const runId = "chat-control";
  const home = await createHome();

  await createRun(repoRoot, runId);
  const statusPath = path.join(repoRoot, ".codex-composer", "runs", runId, "status.json");
  const sessionsPath = path.join(repoRoot, ".codex-composer", "runs", runId, "sessions.json");
  const status = await readJson(statusPath);
  delete status.sessions.control;
  await fs.writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  await fs.writeFile(sessionsPath, "{}\n", "utf8");

  await runScript("composer-chat-control.sh", ["--repo", repoRoot, "--run", runId, "--checkpoint", "clarify"], {
    env: { HOME: home }
  });

  const sessions = await readJson(sessionsPath);
  assert.ok(sessions.control.session_id);
});

test("init-repo bootstraps a self-contained repo and auto-initializes git", async () => {
  const repoRoot = await makeTempDir("codex-composer-init-");
  await runScript("composer-init-repo.sh", ["--repo", repoRoot, "--template", "empty"]);

  const gitDir = path.join(repoRoot, ".git");
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  const scriptsPath = path.join(repoRoot, "scripts", "composer-new-run.sh");
  const toolsPath = path.join(repoRoot, "tools", "composer.mjs");
  const configPath = path.join(repoRoot, ".codex-composer.toml");

  await fs.access(gitDir);
  await fs.access(agentsPath);
  await fs.access(scriptsPath);
  await fs.access(toolsPath);
  await fs.access(configPath);
});

test("plan recommends parallel_ab for the React + Go layout and local policy can force serial on core overlap", async () => {
  const repoRoot = await createTestRepo();

  await createRun(repoRoot, "parallel-plan");
  await runScript("composer-plan.sh", ["--repo", repoRoot, "--run", "parallel-plan"], {
    env: { FAKE_CODEX_PLAN_SCENARIO: "parallel" }
  });

  const parallelPlan = await readJson(path.join(repoRoot, ".codex-composer", "runs", "parallel-plan", "plan.json"));
  assert.equal(parallelPlan.recommended_mode, "parallel_ab");
  assert.equal(parallelPlan.policy_evaluation.forced_mode, null);

  await createRun(repoRoot, "core-plan");
  await runScript("composer-plan.sh", ["--repo", repoRoot, "--run", "core-plan"], {
    env: { FAKE_CODEX_PLAN_SCENARIO: "core_conflict" }
  });

  const corePlan = await readJson(path.join(repoRoot, ".codex-composer", "runs", "core-plan", "plan.json"));
  assert.equal(corePlan.policy_evaluation.forced_mode, "serial");
  assert.ok(corePlan.policy_evaluation.reasons.some((entry) => entry.includes("auth-core")));
});

test("split requires a recorded plan-review decision and serial mode skips B", async () => {
  const repoRoot = await createTestRepo();
  const runId = "serial-run";
  await createRun(repoRoot, runId);
  await runScript("composer-plan.sh", ["--repo", repoRoot, "--run", runId], {
    env: { FAKE_CODEX_PLAN_SCENARIO: "parallel" }
  });

  const failedSplit = await runScript("composer-split.sh", ["--repo", repoRoot, "--run", runId], {
    allowFailure: true
  });
  assert.notEqual(failedSplit.code, 0);
  assert.match(failedSplit.stderr, /approved/);

  await runTool([
    "checkpoint",
    "--repo",
    repoRoot,
    "--run",
    runId,
    "--checkpoint",
    "plan-review",
    "--decision",
    "force_serial",
    "--mode",
    "serial"
  ]);

  await runScript("composer-split.sh", ["--repo", repoRoot, "--run", runId]);

  const status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));
  assert.equal(status.tasks.b.status, "skipped");
  const worktreeB = path.join(repoRoot, ".codex-composer", "worktrees", runId, "b");
  await assert.rejects(fs.access(worktreeB));
});

test("repo-local empty template safely downgrades the login request to serial", async () => {
  const repoRoot = await initLocalRepo("empty");
  const runId = "empty-login";
  await runRepoScript(repoRoot, "composer-new-run.sh", ["--run", runId, "--requirement", "做一个前后端分离的项目，前端用react，后端用golang,实现登录模块"]);
  await runRepoScript(repoRoot, "composer-plan.sh", ["--run", runId]);

  const plan = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "plan.json"));
  const planMd = await readText(path.join(repoRoot, ".codex-composer", "runs", runId, "PLAN.md"));
  assert.equal(plan.recommended_mode, "serial");
  assert.ok(plan.policy_evaluation.reasons.some((entry) => entry.includes("matched no repository files")));
  assert.match(planMd, /stable parallel boundaries are not established yet/);
});

test("parallel flow reaches completed after verify, commit, integrate, and summarize", async () => {
  const repoRoot = await createTestRepo();
  const runId = "parallel-flow";
  await createRun(repoRoot, runId);
  await runScript("composer-plan.sh", ["--repo", repoRoot, "--run", runId], {
    env: { FAKE_CODEX_PLAN_SCENARIO: "parallel" }
  });
  await runTool([
    "checkpoint",
    "--repo",
    repoRoot,
    "--run",
    runId,
    "--checkpoint",
    "plan-review",
    "--decision",
    "approve_parallel",
    "--mode",
    "parallel_ab"
  ]);

  await runScript("composer-split.sh", ["--repo", repoRoot, "--run", runId]);
  await runScript("composer-run-task.sh", ["--repo", repoRoot, "--run", runId, "--task", "a"]);
  await runScript("composer-run-task.sh", ["--repo", repoRoot, "--run", runId, "--task", "b"]);
  await runScript("composer-verify.sh", ["--repo", repoRoot, "--run", runId, "--target", "a"]);
  await runScript("composer-verify.sh", ["--repo", repoRoot, "--run", runId, "--target", "b"]);
  await runScript("composer-commit.sh", ["--repo", repoRoot, "--run", runId, "--task", "a"]);
  await runScript("composer-commit.sh", ["--repo", repoRoot, "--run", runId, "--task", "b"]);
  await runTool([
    "checkpoint",
    "--repo",
    repoRoot,
    "--run",
    runId,
    "--checkpoint",
    "pre-integrate",
    "--decision",
    "approve_ab"
  ]);

  await runScript("composer-integrate.sh", ["--repo", repoRoot, "--run", runId]);
  await runScript("composer-verify.sh", ["--repo", repoRoot, "--run", runId, "--target", "ab"]);
  await runTool([
    "checkpoint",
    "--repo",
    repoRoot,
    "--run",
    runId,
    "--checkpoint",
    "publish",
    "--decision",
    "approve_publish"
  ]);

  await runScript("composer-integrate.sh", ["--repo", repoRoot, "--run", runId]);
  await runScript("composer-verify.sh", ["--repo", repoRoot, "--run", runId, "--target", "main"]);
  await runScript("composer-summarize.sh", ["--repo", repoRoot, "--run", runId]);

  const status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));
  const summary = await readText(path.join(repoRoot, ".codex-composer", "runs", runId, "SUMMARY.md"));
  assert.equal(status.phase, "completed");
  assert.match(summary, /approved_mode: parallel_ab/);
});

test("repo-local react-go-minimal repo completes the full parallel flow from its own scripts", async () => {
  const repoRoot = await initLocalRepo("react-go-minimal");
  const runId = "react-go-login";
  await runRepoScript(repoRoot, "composer-new-run.sh", ["--run", runId, "--requirement", "做一个前后端分离的项目，前端用react，后端用golang,实现登录模块"]);
  await runRepoScript(repoRoot, "composer-chat-control.sh", ["--run", runId, "--checkpoint", "clarify"], {
    env: { HOME: await createHome() }
  });
  await runRepoTool(repoRoot, [
    "checkpoint",
    "--run",
    runId,
    "--checkpoint",
    "clarify",
    "--decision",
    "clarified",
    "--note",
    "frontend and backend directories already exist"
  ]);
  await runRepoScript(repoRoot, "composer-plan.sh", ["--run", runId]);

  const plan = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "plan.json"));
  assert.equal(plan.recommended_mode, "parallel_ab");
  await runRepoScript(repoRoot, "composer-chat-control.sh", ["--run", runId, "--checkpoint", "plan-review"], {
    env: { HOME: await createHome() }
  });
  await runRepoTool(repoRoot, [
    "checkpoint",
    "--run",
    runId,
    "--checkpoint",
    "plan-review",
    "--decision",
    "approve_parallel",
    "--mode",
    "parallel_ab"
  ]);

  await runRepoScript(repoRoot, "composer-split.sh", ["--run", runId]);
  await runRepoScript(repoRoot, "composer-run-task.sh", ["--run", runId, "--task", "a"]);
  await runRepoScript(repoRoot, "composer-run-task.sh", ["--run", runId, "--task", "b"]);
  await runRepoScript(repoRoot, "composer-verify.sh", ["--run", runId, "--target", "a"]);
  await runRepoScript(repoRoot, "composer-verify.sh", ["--run", runId, "--target", "b"]);
  await runRepoScript(repoRoot, "composer-commit.sh", ["--run", runId, "--task", "a"]);
  await runRepoScript(repoRoot, "composer-commit.sh", ["--run", runId, "--task", "b"]);
  await runRepoScript(repoRoot, "composer-chat-control.sh", ["--run", runId, "--checkpoint", "pre-integrate"], {
    env: { HOME: await createHome() }
  });
  await runRepoTool(repoRoot, [
    "checkpoint",
    "--run",
    runId,
    "--checkpoint",
    "pre-integrate",
    "--decision",
    "approve_ab"
  ]);
  await runRepoScript(repoRoot, "composer-integrate.sh", ["--run", runId]);
  await runRepoScript(repoRoot, "composer-verify.sh", ["--run", runId, "--target", "ab"]);
  await runRepoScript(repoRoot, "composer-chat-control.sh", ["--run", runId, "--checkpoint", "publish"], {
    env: { HOME: await createHome() }
  });
  await runRepoTool(repoRoot, [
    "checkpoint",
    "--run",
    runId,
    "--checkpoint",
    "publish",
    "--decision",
    "approve_publish"
  ]);
  await runRepoScript(repoRoot, "composer-integrate.sh", ["--run", runId]);
  await runRepoScript(repoRoot, "composer-verify.sh", ["--run", runId, "--target", "main"]);
  await runRepoScript(repoRoot, "composer-summarize.sh", ["--run", runId]);

  const status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));
  const summary = await readText(path.join(repoRoot, ".codex-composer", "runs", runId, "SUMMARY.md"));
  const loginPage = await readText(path.join(repoRoot, "frontend", "src", "LoginPage.jsx"));
  const tokenGo = await readText(path.join(repoRoot, "backend", "internal", "auth", "token.go"));
  assert.equal(status.phase, "completed");
  assert.match(summary, /approved_mode: parallel_ab/);
  assert.match(loginPage, /Continue/);
  assert.match(tokenGo, /demo-token-/);
});

test("pre-integrate return_b keeps task A intact and only marks B for rework", async () => {
  const repoRoot = await createTestRepo();
  const runId = "return-b";
  await createRun(repoRoot, runId);
  await runScript("composer-plan.sh", ["--repo", repoRoot, "--run", runId], {
    env: { FAKE_CODEX_PLAN_SCENARIO: "parallel" }
  });
  await runTool([
    "checkpoint",
    "--repo",
    repoRoot,
    "--run",
    runId,
    "--checkpoint",
    "plan-review",
    "--decision",
    "approve_parallel",
    "--mode",
    "parallel_ab"
  ]);

  await runScript("composer-split.sh", ["--repo", repoRoot, "--run", runId]);
  await runScript("composer-run-task.sh", ["--repo", repoRoot, "--run", runId, "--task", "a"]);
  await runScript("composer-run-task.sh", ["--repo", repoRoot, "--run", runId, "--task", "b"]);
  await runScript("composer-verify.sh", ["--repo", repoRoot, "--run", runId, "--target", "a"]);
  await runScript("composer-verify.sh", ["--repo", repoRoot, "--run", runId, "--target", "b"]);
  await runScript("composer-commit.sh", ["--repo", repoRoot, "--run", runId, "--task", "a"]);
  await runScript("composer-commit.sh", ["--repo", repoRoot, "--run", runId, "--task", "b"]);
  await runTool([
    "checkpoint",
    "--repo",
    repoRoot,
    "--run",
    runId,
    "--checkpoint",
    "pre-integrate",
    "--decision",
    "return_b"
  ]);

  const status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));
  assert.equal(status.tasks.a.status, "committed");
  assert.equal(status.tasks.b.status, "needs-rework");
  assert.equal(status.phase, "execute");
});
