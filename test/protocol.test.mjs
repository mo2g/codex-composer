import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { validatePlan } from "../tools/lib/runtime.mjs";
import { createExistingRepo, createTestRepo, makeTempDir, readJson, readText, runGit, runInstall, runRepoLauncher, runScript, runTool, setGitUser, writeConfig, commitAll } from "./helpers/repo.mjs";

async function createRun(repoRoot, runId, requirement = "Implement a login module") {
  await runScript("composer-new-run.sh", ["--repo", repoRoot, "--run", runId, "--requirement", requirement]);
}

async function initLocalRepo(template) {
  const repoRoot = await makeTempDir(`codex-composer-${template}-`);
  await runScript("composer-init-repo.sh", ["--repo", repoRoot, "--template", template]);
  await setGitUser(repoRoot);
  await writeConfig(repoRoot, { hybrid: true });
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

test("install.sh bootstraps an existing non-empty repo into the hybrid layout without adding example app files", async () => {
  const repoRoot = await createExistingRepo();
  await runInstall(["--repo", repoRoot, "--template", "existing", "--source", path.resolve(".")]);

  await fs.access(path.join(repoRoot, "AGENTS.md"));
  await fs.access(path.join(repoRoot, "codex-composer"));
  await fs.access(path.join(repoRoot, "scripts", "existing.sh"));
  await fs.access(path.join(repoRoot, "tools", "existing.mjs"));
  await fs.access(path.join(repoRoot, ".codex-composer", "config.toml"));
  await fs.access(path.join(repoRoot, ".codex-composer", "protocol", "tools", "composer.mjs"));
  await fs.access(path.join(repoRoot, ".codex-composer", "protocol", "skills", "planner", "SKILL.md"));
  await fs.access(path.join(repoRoot, "README.md"));
  await assert.rejects(fs.access(path.join(repoRoot, "scripts", "composer-start.sh")));
  await assert.rejects(fs.access(path.join(repoRoot, "prompts")));
  await assert.rejects(fs.access(path.join(repoRoot, "skills")));
  await assert.rejects(fs.access(path.join(repoRoot, "schemas")));
  await assert.rejects(fs.access(path.join(repoRoot, "frontend", "src", "App.jsx")));

  const config = await readText(path.join(repoRoot, ".codex-composer", "config.toml"));
  assert.match(config, /repo_type = "existing"/);
  assert.doesNotMatch(config, /profile = "default"/);
});

test("install.sh updates an existing AGENTS.md with a managed Codex Composer block", async () => {
  const repoRoot = await createExistingRepo();
  await fs.writeFile(path.join(repoRoot, "AGENTS.md"), "# Team Rules\n\nKeep existing content.\n", "utf8");

  await runInstall(["--repo", repoRoot, "--template", "existing", "--source", path.resolve(".")]);

  const agents = await readText(path.join(repoRoot, "AGENTS.md"));
  assert.match(agents, /# Team Rules/);
  assert.match(agents, /<!-- CODEX COMPOSER START -->/);
  assert.match(agents, /Main entry: `\.\/codex-composer next`/);
  assert.doesNotMatch(agents, /Prompt Sources/);
});

test("chat-control falls back cleanly in a dumb terminal", async () => {
  const repoRoot = await createTestRepo();
  await createRun(repoRoot, "fallback");

  const result = await runScript("composer-chat-control.sh", ["--repo", repoRoot, "--run", "fallback", "--checkpoint", "clarify"], {
    env: { TERM: "dumb" }
  });

  assert.match(result.stdout, /prompt_path:/);
  assert.match(result.stdout, /current Codex thread/);
});

test("composer-start creates a run and prints current-thread planner guidance", async () => {
  const repoRoot = await createTestRepo();
  const result = await runScript("composer-start.sh", ["--repo", repoRoot, "--run", "login", "--requirement", "Implement login"]);
  const status = await readJson(path.join(repoRoot, ".codex-composer", "runs", "login", "status.json"));

  assert.equal(status.phase, "clarify");
  assert.match(result.stdout, /current Codex thread/);
  assert.match(result.stdout, /skills\/planner\/SKILL\.md/);
});

test("next auto-selects the only unfinished run and prints clarify guidance", async () => {
  const repoRoot = await createTestRepo();
  await runTool(["start", "--repo", repoRoot, "--run", "login", "--requirement", "Implement login"]);

  const result = await runTool(["next", "--repo", repoRoot]);
  assert.match(result.stdout, /phase: clarify/);
  assert.match(result.stdout, /checkpoint clarify/);
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

test("split requires a recorded plan-review decision and serial mode does not create a B worktree", async () => {
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

  await runScript("composer-checkpoint.sh", [
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

  const splitResult = await runScript("composer-split.sh", ["--repo", repoRoot, "--run", runId]);
  const status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));
  const worktreeB = path.join(repoRoot, ".codex-composer", "worktrees", runId, "b");

  assert.equal(status.tasks.a.worktree, repoRoot);
  assert.equal(status.tasks.b.status, "skipped");
  await assert.rejects(fs.access(worktreeB));
  assert.match(splitResult.stdout, /current Codex thread/);
});

test("next auto-runs split after plan approval and status points A to the current repo", async () => {
  const repoRoot = await createTestRepo();
  const runId = "parallel-split";
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

  const nextResult = await runTool(["next", "--repo", repoRoot, "--run", runId]);
  const statusResult = await runTool(["status", "--repo", repoRoot, "--run", runId]);
  const status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));

  assert.equal(status.tasks.a.worktree, repoRoot);
  assert.ok(status.tasks.b.worktree.endsWith(`.codex-composer/worktrees/${runId}/b`));
  assert.equal(status.phase, "execute");
  assert.match(nextResult.stdout, /phase: execute/);
  assert.match(statusResult.stdout, /A: ready/);
  assert.match(statusResult.stdout, /launch_strategy: current_thread/);
  assert.match(statusResult.stdout, /Open a new Codex thread/);
});

test("repo-local empty template safely downgrades the login request to serial", async () => {
  const repoRoot = await initLocalRepo("empty");
  const runId = "empty-login";
  await runRepoLauncher(repoRoot, ["start", "--run", runId, "--requirement", "做一个前后端分离的项目，前端用react，后端用golang,实现登录模块"]);
  await runRepoLauncher(repoRoot, [
    "checkpoint",
    "--run",
    runId,
    "--checkpoint",
    "clarify",
    "--decision",
    "clarified",
    "--note",
    "No stable frontend/backend layout exists yet"
  ]);
  await runRepoLauncher(repoRoot, ["plan", "--run", runId]);

  const plan = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "plan.json"));
  const planMd = await readText(path.join(repoRoot, ".codex-composer", "runs", runId, "PLAN.md"));
  assert.equal(plan.recommended_mode, "serial");
  assert.ok(plan.policy_evaluation.reasons.some((entry) => entry.includes("matched no repository files")));
  assert.match(planMd, /stable parallel boundaries are not established yet/);
});

test("hybrid launcher drives start to split in an installed repo without root protocol directories", async () => {
  const repoRoot = await initLocalRepo("react-go-minimal");
  const runId = "launcher-flow";

  await runRepoLauncher(repoRoot, ["start", "--run", runId, "--requirement", "Implement login"]);
  await runRepoLauncher(repoRoot, [
    "checkpoint",
    "--run",
    runId,
    "--checkpoint",
    "clarify",
    "--decision",
    "clarified",
    "--note",
    "Frontend stays in A and backend stays in B"
  ]);
  await runRepoLauncher(repoRoot, ["plan", "--run", runId]);
  await runRepoLauncher(repoRoot, [
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

  const nextResult = await runRepoLauncher(repoRoot, ["next", "--run", runId]);
  const status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));

  assert.equal(status.phase, "execute");
  assert.ok(status.tasks.b.worktree.endsWith(`.codex-composer/worktrees/${runId}/b`));
  await fs.access(path.join(repoRoot, "codex-composer"));
  await assert.rejects(fs.access(path.join(repoRoot, "prompts")));
  await assert.rejects(fs.access(path.join(repoRoot, "skills")));
  await assert.rejects(fs.access(path.join(repoRoot, "schemas")));
  assert.match(nextResult.stdout, /phase: execute/);
});

test("manual merge flow reaches completed after verify, commit, merge-review, and main verification", async () => {
  const repoRoot = await createTestRepo();
  const runId = "manual-merge";
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

  let status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));
  assert.equal(status.phase, "merge-review");
  assert.match(status.tasks.a.commit_message, /feat\(a\)/);
  assert.ok(status.tasks.a.changed_files.includes("frontend/src/LoginPage.jsx"));
  assert.ok(status.tasks.b.changed_files.includes("backend/internal/auth/token.go"));

  await runTool([
    "checkpoint",
    "--repo",
    repoRoot,
    "--run",
    runId,
    "--checkpoint",
    "merge-review",
    "--decision",
    "allow_manual_merge"
  ]);

  status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));
  assert.equal(status.phase, "ready-to-merge");

  const branchA = status.tasks.a.branch;
  const branchB = status.tasks.b.branch;
  await runGit(repoRoot, ["checkout", "main"]);
  await runGit(repoRoot, ["merge", "--no-ff", branchA, "-m", `merge(a): ${runId}`]);
  await runGit(repoRoot, ["merge", "--no-ff", branchB, "-m", `merge(b): ${runId}`]);

  await runScript("composer-verify.sh", ["--repo", repoRoot, "--run", runId, "--target", "main"]);
  await runScript("composer-summarize.sh", ["--repo", repoRoot, "--run", runId]);

  const completed = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));
  const summary = await readText(path.join(repoRoot, ".codex-composer", "runs", runId, "SUMMARY.md"));
  const prBody = await readText(path.join(repoRoot, ".codex-composer", "runs", runId, "PR_BODY.md"));
  assert.equal(completed.phase, "completed");
  assert.match(summary, /approved_mode: parallel_ab/);
  assert.match(summary, /frontend\/src\/LoginPage\.jsx/);
  assert.match(summary, /backend\/internal\/auth\/token\.go/);
  assert.match(summary, /commit_sha:/);
  assert.match(prBody, /frontend\/src\/LoginPage\.jsx/);
});

test("merge-review return_b keeps task A intact and only marks B for rework", async () => {
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
    "merge-review",
    "--decision",
    "return_b"
  ]);

  const status = await readJson(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));
  assert.equal(status.tasks.a.status, "committed");
  assert.equal(status.tasks.b.status, "needs-rework");
  assert.equal(status.phase, "execute");
});
