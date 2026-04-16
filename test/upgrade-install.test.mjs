import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { TEMPLATE_NAMESPACE } from "../tools/lib/template-contract.mjs";
import { createExistingRepo, makeTempDir, readText, runInstall } from "./helpers/repo.mjs";

function plannerSkillPath(repoRoot) {
  return path.join(
    repoRoot,
    ".agents",
    "skills",
    TEMPLATE_NAMESPACE,
    "planner",
    "SKILL.md"
  );
}

test("upgrade dry-run reports overwrite/upsert/skip actions without writing files", async () => {
  const targetRepo = await createExistingRepo({
    packageManager: "npm",
    agentsContent: `# Team Rules

Keep existing content.
`
  });

  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const quickstartPath = path.join(targetRepo, "docs", "codex-quickstart.md");
  const plannerPath = plannerSkillPath(targetRepo);
  const agentsPath = path.join(targetRepo, "AGENTS.md");

  await fs.mkdir(path.join(targetRepo, ".codex"), { recursive: true });
  await fs.writeFile(path.join(targetRepo, ".codex", "config.toml"), "repo_owned = true\n", "utf8");
  await fs.mkdir(path.join(targetRepo, "docs", "_codex", "sample"), { recursive: true });
  await fs.writeFile(path.join(targetRepo, "docs", "_codex", "sample", "task-card.md"), "# keep me\n", "utf8");

  await fs.writeFile(quickstartPath, "STALE QUICKSTART\n", "utf8");
  await fs.writeFile(plannerPath, "STALE PLANNER\n", "utf8");

  const agentsBefore = (await readText(agentsPath)).replace(/debug-investigation/g, "debug-old");
  await fs.writeFile(agentsPath, agentsBefore, "utf8");

  const result = await runInstall(
    ["--repo", targetRepo, "--template", "existing", "--source", path.resolve("."), "--upgrade", "--dry-run"]
  );

  assert.match(result.stdout, /mode=upgrade/);
  assert.match(result.stdout, /dry_run=true/);
  assert.match(result.stdout, /action=overwrite docs\/codex-quickstart\.md/);
  assert.match(result.stdout, /action=overwrite \.agents\/skills\/codex-template\/planner\/SKILL\.md/);
  assert.match(result.stdout, /action=upsert AGENTS\.md/);
  assert.match(result.stdout, /action=skip README\.md/);
  assert.match(result.stdout, /action=skip \.codex\/config\.toml/);
  assert.match(result.stdout, /action=skip docs\/_codex\//);

  assert.equal(await readText(quickstartPath), "STALE QUICKSTART\n");
  assert.equal(await readText(plannerPath), "STALE PLANNER\n");
  assert.match(await readText(agentsPath), /debug-old/);
});

test("upgrade mode refreshes managed assets and preserves repo-owned files", async () => {
  const targetRepo = await createExistingRepo({
    packageManager: "npm",
    agentsContent: `# Team Rules

Keep existing content.
`
  });

  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const quickstartPath = path.join(targetRepo, "docs", "codex-quickstart.md");
  const plannerPath = plannerSkillPath(targetRepo);
  const agentsPath = path.join(targetRepo, "AGENTS.md");

  await fs.mkdir(path.join(targetRepo, ".codex"), { recursive: true });
  await fs.writeFile(path.join(targetRepo, ".codex", "config.toml"), "repo_owned = true\n", "utf8");
  await fs.mkdir(path.join(targetRepo, "docs", "_codex", "sample"), { recursive: true });
  await fs.writeFile(path.join(targetRepo, "docs", "_codex", "sample", "task-card.md"), "# keep me\n", "utf8");

  await fs.writeFile(quickstartPath, "STALE QUICKSTART\n", "utf8");
  await fs.writeFile(plannerPath, "STALE PLANNER\n", "utf8");

  const agentsBefore = (await readText(agentsPath)).replace(/debug-investigation/g, "debug-old");
  await fs.writeFile(agentsPath, agentsBefore, "utf8");

  const result = await runInstall(
    ["--repo", targetRepo, "--template", "existing", "--source", path.resolve("."), "--upgrade"]
  );

  assert.match(result.stdout, /mode=upgrade/);
  assert.match(result.stdout, /dry_run=false/);

  const quickstart = await readText(quickstartPath);
  const planner = await readText(plannerPath);
  const agents = await readText(agentsPath);
  const readme = await readText(path.join(targetRepo, "README.md"));
  const config = await readText(path.join(targetRepo, ".codex", "config.toml"));
  const taskCard = await readText(path.join(targetRepo, "docs", "_codex", "sample", "task-card.md"));
  const upgradeGuide = await readText(path.join(targetRepo, "docs", "codex-upgrade-guide.md"));

  assert.match(quickstart, /# Codex App Quickstart/);
  assert.doesNotMatch(quickstart, /STALE QUICKSTART/);

  assert.match(planner, /Task Card/);
  assert.doesNotMatch(planner, /STALE PLANNER/);

  assert.match(agents, /# Team Rules/);
  assert.match(agents, /Keep existing content\./);
  assert.match(agents, /debug-investigation/);
  assert.doesNotMatch(agents, /debug-old/);

  assert.equal(readme, "# Existing Repo\n");
  assert.equal(config, "repo_owned = true\n");
  assert.equal(taskCard, "# keep me\n");
  assert.match(upgradeGuide, /# Codex App Template Upgrade Guide/);
});

test("upgrade fails when target is not an existing git repository", async () => {
  const targetRepo = await makeTempDir("codex-app-template-upgrade-non-git-");

  const result = await runInstall(
    ["--repo", targetRepo, "--template", "existing", "--source", path.resolve("."), "--upgrade"],
    { allowFailure: true }
  );

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /--upgrade requires an existing git repository\./);
});

test("upgrade does not recreate README.md when it is intentionally absent", async () => {
  const targetRepo = await createExistingRepo({
    packageManager: "npm",
    agentsContent: `# Team Rules

Keep existing content.
`
  });

  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const readmePath = path.join(targetRepo, "README.md");
  await fs.unlink(readmePath);

  const dryRun = await runInstall(
    ["--repo", targetRepo, "--template", "existing", "--source", path.resolve("."), "--upgrade", "--dry-run"]
  );
  assert.match(dryRun.stdout, /action=skip README\.md/);
  await assert.rejects(fs.access(readmePath));

  const result = await runInstall(
    ["--repo", targetRepo, "--template", "existing", "--source", path.resolve("."), "--upgrade"]
  );

  assert.match(result.stdout, /action=skip README\.md/);
  await assert.rejects(fs.access(readmePath));
});