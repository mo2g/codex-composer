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

  const codexComposerPath = path.join(targetRepo, "CODEX-COMPOSER.md");
  const plannerPath = plannerSkillPath(targetRepo);
  const agentsPath = path.join(targetRepo, "AGENTS.md");

  await fs.mkdir(path.join(targetRepo, ".codex"), { recursive: true });
  await fs.writeFile(path.join(targetRepo, ".codex", "config.toml"), "repo_owned = true\n", "utf8");
  await fs.mkdir(path.join(targetRepo, ".codex", "codex-composer", "sample"), { recursive: true });
  await fs.writeFile(path.join(targetRepo, ".codex", "codex-composer", "sample", "task-card.md"), "# keep me\n", "utf8");

  await fs.writeFile(codexComposerPath, "STALE CODEX-COMPOSER\n", "utf8");
  await fs.writeFile(plannerPath, "STALE PLANNER\n", "utf8");

  // Modify AGENTS.md to mark it as "old" version
  await fs.writeFile(agentsPath, "# Team Rules\n\nKeep existing content.\n@OLD-CODEX-COMPOSER.md\n", "utf8");

  const result = await runInstall(
    ["--repo", targetRepo, "--template", "existing", "--source", path.resolve("."), "--upgrade", "--dry-run"]
  );

  assert.match(result.stdout, /mode=upgrade/);
  assert.match(result.stdout, /dry_run=true/);
  assert.match(result.stdout, /action=overwrite CODEX-COMPOSER\.md/);
  assert.match(result.stdout, /action=overwrite \.agents\/skills\/codex-composer\/planner\/SKILL\.md/);
  assert.match(result.stdout, /action=upsert AGENTS\.md/);
  assert.match(result.stdout, /action=skip README\.md/);
  assert.match(result.stdout, /action=skip \.codex\/config\.toml/);
  assert.match(result.stdout, /action=skip \.codex\/codex-composer\//);

  // In dry-run mode, no files are actually modified
  assert.equal(await readText(codexComposerPath), "STALE CODEX-COMPOSER\n");
  assert.equal(await readText(plannerPath), "STALE PLANNER\n");
  assert.match(await readText(agentsPath), /@OLD-CODEX-COMPOSER\.md/);
});

test("upgrade mode refreshes managed assets and preserves repo-owned files", async () => {
  const targetRepo = await createExistingRepo({
    packageManager: "npm",
    agentsContent: `# Team Rules

Keep existing content.
`
  });

  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const codexComposerPath = path.join(targetRepo, "CODEX-COMPOSER.md");
  const plannerPath = plannerSkillPath(targetRepo);
  const agentsPath = path.join(targetRepo, "AGENTS.md");

  await fs.mkdir(path.join(targetRepo, ".codex"), { recursive: true });
  await fs.writeFile(path.join(targetRepo, ".codex", "config.toml"), "repo_owned = true\n", "utf8");
  await fs.mkdir(path.join(targetRepo, ".codex", "codex-composer", "sample"), { recursive: true });
  await fs.writeFile(path.join(targetRepo, ".codex", "codex-composer", "sample", "task-card.md"), "# keep me\n", "utf8");

  await fs.writeFile(codexComposerPath, "STALE CODEX-COMPOSER\n", "utf8");
  await fs.writeFile(plannerPath, "STALE PLANNER\n", "utf8");

  const agentsBefore = (await readText(agentsPath)).replace(/debug-investigation/g, "debug-old");
  await fs.writeFile(agentsPath, agentsBefore, "utf8");

  const result = await runInstall(
    ["--repo", targetRepo, "--template", "existing", "--source", path.resolve("."), "--upgrade"]
  );

  assert.match(result.stdout, /mode=upgrade/);
  assert.match(result.stdout, /dry_run=false/);

  const codexComposer = await readText(codexComposerPath);
  const planner = await readText(plannerPath);
  const agents = await readText(agentsPath);
  const readme = await readText(path.join(targetRepo, "README.md"));
  const config = await readText(path.join(targetRepo, ".codex", "config.toml"));
  const taskCard = await readText(path.join(targetRepo, ".codex", "codex-composer", "sample", "task-card.md"));

  assert.match(codexComposer, /# Codex Composer/);
  assert.doesNotMatch(codexComposer, /STALE CODEX-COMPOSER/);

  assert.match(planner, /Task Card/);
  assert.doesNotMatch(planner, /STALE PLANNER/);

  assert.match(agents, /# Team Rules/);
  assert.match(agents, /Keep existing content\./);
  assert.match(agents, /@CODEX-COMPOSER\.md/);
  assert.doesNotMatch(agents, /debug-old/);

  assert.equal(readme, "# Existing Repo\n");
  assert.equal(config, "repo_owned = true\n");
  assert.equal(taskCard, "# keep me\n");
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