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
  await writeConfig(repoRoot, { layout: "canonical" });
  await commitAll(repoRoot);
  return repoRoot;
}

async function createLegacyInstalledRepo() {
  const repoRoot = await createExistingRepo();
  const legacyRoot = path.join(repoRoot, ".codex-composer");
  const legacySkillsRoot = path.join(legacyRoot, "protocol", "skills");
  const sourceRoot = path.resolve(".");

  await fs.mkdir(legacySkillsRoot, { recursive: true });
  await fs.cp(path.join(sourceRoot, ".codex", "protocol"), path.join(legacyRoot, "protocol"), { recursive: true });
  await fs.cp(path.join(sourceRoot, ".agents", "skills", "codex-composer", "planner"), path.join(legacySkillsRoot, "planner"), { recursive: true });
  await fs.cp(path.join(sourceRoot, ".agents", "skills", "codex-composer", "task-owner"), path.join(legacySkillsRoot, "task-owner"), { recursive: true });
  await fs.cp(path.join(sourceRoot, ".agents", "skills", "codex-composer", "integrator-reviewer"), path.join(legacySkillsRoot, "integrator-reviewer"), { recursive: true });
  await fs.mkdir(path.join(legacyRoot, "runs"), { recursive: true });
  await fs.mkdir(path.join(legacyRoot, "worktrees"), { recursive: true });
  await writeConfig(repoRoot, { layout: "legacy" });

  await fs.writeFile(
    path.join(repoRoot, "codex-composer"),
    `#!/usr/bin/env bash
# Codex Composer Launcher
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$ROOT_DIR/.codex-composer/protocol/tools/composer.mjs" "$@"
`,
    "utf8"
  );
  await fs.chmod(path.join(repoRoot, "codex-composer"), 0o755);
  await fs.writeFile(path.join(repoRoot, ".gitignore"), ".codex-composer/runs/\n.codex-composer/worktrees/\n", "utf8");
  return repoRoot;
}

async function createInterimSkillsRepo() {
  const repoRoot = await createExistingRepo();
  await runInstall(["--repo", repoRoot, "--template", "existing", "--source", path.resolve(".")]);
  await writeConfig(repoRoot, { layout: "canonical" });

  await fs.mkdir(path.join(repoRoot, ".codex", "skills"), { recursive: true });
  await fs.rename(
    path.join(repoRoot, ".agents", "skills", "codex-composer", "planner"),
    path.join(repoRoot, ".codex", "skills", "codex-composer-planner")
  );
  await fs.rename(
    path.join(repoRoot, ".agents", "skills", "codex-composer", "task-owner"),
    path.join(repoRoot, ".codex", "skills", "codex-composer-task-owner")
  );
  await fs.rename(
    path.join(repoRoot, ".agents", "skills", "codex-composer", "integrator-reviewer"),
    path.join(repoRoot, ".codex", "skills", "codex-composer-integrator-reviewer")
  );
  await fs.rmdir(path.join(repoRoot, ".agents", "skills", "codex-composer"));
  await fs.rmdir(path.join(repoRoot, ".agents", "skills"));
  await fs.rmdir(path.join(repoRoot, ".agents"));
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
  await fs.access(path.join(repoRoot, ".codex", "local", "config.toml"));
  await fs.access(path.join(repoRoot, ".codex", "protocol", "tools", "composer.mjs"));
  await fs.access(path.join(repoRoot, ".agents", "skills", "codex-composer", "planner", "SKILL.md"));
  await fs.access(path.join(repoRoot, "README.md"));
  await assert.rejects(fs.access(path.join(repoRoot, ".codex-composer")));
  await assert.rejects(fs.access(path.join(repoRoot, ".codex", "skills")));
  await assert.rejects(fs.access(path.join(repoRoot, "scripts", "composer-start.sh")));
  await assert.rejects(fs.access(path.join(repoRoot, "prompts")));
  await assert.rejects(fs.access(path.join(repoRoot, "skills")));
  await assert.rejects(fs.access(path.join(repoRoot, "schemas")));
  await assert.rejects(fs.access(path.join(repoRoot, "frontend", "src", "App.jsx")));

  const config = await readText(path.join(repoRoot, ".codex", "local", "config.toml"));
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
  const status = await readJson(path.join(repoRoot, ".codex", "local", "runs", "login", "status.json"));

  assert.equal(status.phase, "clarify");
  assert.match(result.stdout, /current Codex thread/);
  assert.match(result.stdout, /\.agents\/skills\/codex-composer\/planner\/SKILL\.md/);
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

  const parallelPlan = await readJson(path.join(repoRoot, ".codex", "local", "runs", "parallel-plan", "plan.json"));
  assert.equal(parallelPlan.recommended_mode, "parallel_ab");
  assert.equal(parallelPlan.policy_evaluation.forced_mode, null);

  await createRun(repoRoot, "core-plan");
  await runScript("composer-plan.sh", ["--repo", repoRoot, "--run", "core-plan"], {
    env: { FAKE_CODEX_PLAN_SCENARIO: "core_conflict" }
  });

  const corePlan = await readJson(path.join(repoRoot, ".codex", "local", "runs", "core-plan", "plan.json"));
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
  const status = await readJson(path.join(repoRoot, ".codex", "local", "runs", runId, "status.json"));
  const worktreeB = path.join(repoRoot, ".codex", "local", "worktrees", runId, "b");

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
  const status = await readJson(path.join(repoRoot, ".codex", "local", "runs", runId, "status.json"));

  assert.equal(status.tasks.a.worktree, repoRoot);
  assert.ok(status.tasks.b.worktree.endsWith(`.codex/local/worktrees/${runId}/b`));
  assert.equal(status.phase, "execute");
  assert.match(nextResult.stdout, /phase: execute/);
  assert.match(statusResult.stdout, /A: ready/);
  assert.match(statusResult.stdout, /launch_strategy: current_thread/);
  assert.match(statusResult.stdout, /Open a new Codex thread/);
});

test("repo-local empty template safely downgrades the login request to serial", async () => {
  const repoRoot = await initLocalRepo("empty");
  const runId = "empty-login";
  await runRepoLauncher(repoRoot, ["start", "--run", runId, "--requirement", "Develop a login module using React and Golang"]);
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

  const plan = await readJson(path.join(repoRoot, ".codex", "local", "runs", runId, "plan.json"));
  const planMd = await readText(path.join(repoRoot, ".codex", "local", "runs", runId, "PLAN.md"));
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
  const status = await readJson(path.join(repoRoot, ".codex", "local", "runs", runId, "status.json"));

  assert.equal(status.phase, "execute");
  assert.ok(status.tasks.b.worktree.endsWith(`.codex/local/worktrees/${runId}/b`));
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

  let status = await readJson(path.join(repoRoot, ".codex", "local", "runs", runId, "status.json"));
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

  status = await readJson(path.join(repoRoot, ".codex", "local", "runs", runId, "status.json"));
  assert.equal(status.phase, "ready-to-merge");

  const branchA = status.tasks.a.branch;
  const branchB = status.tasks.b.branch;
  await runGit(repoRoot, ["checkout", "main"]);
  await runGit(repoRoot, ["merge", "--no-ff", branchA, "-m", `merge(a): ${runId}`]);
  await runGit(repoRoot, ["merge", "--no-ff", branchB, "-m", `merge(b): ${runId}`]);

  await runScript("composer-verify.sh", ["--repo", repoRoot, "--run", runId, "--target", "main"]);
  await runScript("composer-summarize.sh", ["--repo", repoRoot, "--run", runId]);

  const completed = await readJson(path.join(repoRoot, ".codex", "local", "runs", runId, "status.json"));
  const summary = await readText(path.join(repoRoot, ".codex", "local", "runs", runId, "SUMMARY.md"));
  const prBody = await readText(path.join(repoRoot, ".codex", "local", "runs", runId, "PR_BODY.md"));
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

  const status = await readJson(path.join(repoRoot, ".codex", "local", "runs", runId, "status.json"));
  assert.equal(status.tasks.a.status, "committed");
  assert.equal(status.tasks.b.status, "needs-rework");
  assert.equal(status.phase, "execute");
});

test("legacy layout remains readable, warns as deprecated, and migrate is idempotent", async () => {
  const repoRoot = await createLegacyInstalledRepo();
  const runId = "legacy-run";

  await runRepoLauncher(repoRoot, ["start", "--run", runId, "--requirement", "Implement login"]);

  let statusResult = await runRepoLauncher(repoRoot, ["status", "--run", runId]);
  assert.match(statusResult.stdout, /legacy \.codex-composer layout detected/);
  assert.match(statusResult.stdout, /Run \.\/codex-composer migrate before continuing/);
  await fs.access(path.join(repoRoot, ".codex-composer", "runs", runId, "status.json"));

  const firstMigrate = await runRepoLauncher(repoRoot, ["migrate"]);
  assert.match(firstMigrate.stdout, /migrated: true/);
  await fs.access(path.join(repoRoot, ".codex", "local", "runs", runId, "status.json"));
  await fs.access(path.join(repoRoot, ".codex", "protocol", "tools", "composer.mjs"));
  await fs.access(path.join(repoRoot, ".agents", "skills", "codex-composer", "planner", "SKILL.md"));

  statusResult = await runRepoLauncher(repoRoot, ["status", "--run", runId]);
  assert.match(statusResult.stdout, /layout_mode: codex/);
  assert.match(statusResult.stdout, /\.agents\/skills\/codex-composer\/planner\/SKILL\.md/);
  assert.doesNotMatch(statusResult.stdout, /legacy \.codex-composer layout detected/);

  const secondMigrate = await runRepoLauncher(repoRoot, ["migrate"]);
  assert.match(secondMigrate.stdout, /migrated: false/);
});

test("intermediate .codex skills layout requires migration and moves into .agents", async () => {
  const repoRoot = await createInterimSkillsRepo();
  const runId = "interim-run";

  await runRepoLauncher(repoRoot, ["start", "--run", runId, "--requirement", "Implement login"]);

  let statusResult = await runRepoLauncher(repoRoot, ["status", "--run", runId]);
  assert.match(statusResult.stdout, /legacy skill layout detected/);
  assert.match(statusResult.stdout, /Run \.\/codex-composer migrate before continuing/);
  await fs.access(path.join(repoRoot, ".codex", "skills", "codex-composer-planner", "SKILL.md"));

  const migrateResult = await runRepoLauncher(repoRoot, ["migrate"]);
  assert.match(migrateResult.stdout, /migrated: true/);
  await fs.access(path.join(repoRoot, ".agents", "skills", "codex-composer", "planner", "SKILL.md"));
  await assert.rejects(fs.access(path.join(repoRoot, ".codex", "skills", "codex-composer-planner", "SKILL.md")));

  statusResult = await runRepoLauncher(repoRoot, ["status", "--run", runId]);
  assert.match(statusResult.stdout, /\.agents\/skills\/codex-composer\/planner\/SKILL\.md/);
  assert.doesNotMatch(statusResult.stdout, /legacy skill layout detected/);
});
