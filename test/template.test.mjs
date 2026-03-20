import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEGACY_USER_FACING_TERMS,
  MANAGED_BLOCK_START,
  TEMPLATE_NAMESPACE,
  TEMPLATE_PRODUCT_NAME,
  TEMPLATE_SKILLS
} from "../tools/lib/template-contract.mjs";
import { createExistingRepo, makeTempDir, readText, runGit, runInstall } from "./helpers/repo.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function expectExists(targetPath) {
  await fs.access(targetPath);
}

async function expectMissing(targetPath) {
  await assert.rejects(fs.access(targetPath));
}

async function readConfig(targetRepo) {
  return readText(path.join(targetRepo, ".codex", "config.toml"));
}

async function assertInstalledAssets(targetRepo) {
  await expectExists(path.join(targetRepo, "AGENTS.md"));
  await expectExists(path.join(targetRepo, ".codex", "config.toml"));
  await expectExists(path.join(targetRepo, "docs", "codex-quickstart.md"));
  await expectExists(path.join(targetRepo, "docs", "manual-merge-checklist.md"));

  for (const skill of TEMPLATE_SKILLS) {
    await expectExists(path.join(targetRepo, ".agents", "skills", TEMPLATE_NAMESPACE, skill, "SKILL.md"));
  }

  await expectMissing(path.join(targetRepo, ".agents", "skills", "codex-composer"));
  await expectMissing(path.join(targetRepo, ".codex", "protocol"));
  await expectMissing(path.join(targetRepo, "tools", "composer.mjs"));
}

test("install.sh bootstraps an existing repository into the Codex App Template layout", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "npm" });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  await assertInstalledAssets(targetRepo);
  await expectExists(path.join(targetRepo, "scripts", "existing.sh"));
  await expectExists(path.join(targetRepo, "tools", "existing.mjs"));

  const config = await readConfig(targetRepo);
  const readme = await readText(path.join(targetRepo, "README.md"));
  const agents = await readText(path.join(targetRepo, "AGENTS.md"));

  assert.match(config, /npm test/);
  assert.doesNotMatch(config, /repo_type/);
  assert.equal(readme, "# Existing Repo\n");
  assert.match(agents, /# Codex App Template/);
});

test("install.sh upserts one managed AGENTS block when AGENTS.md already exists", async () => {
  const targetRepo = await createExistingRepo({
    agentsContent: `# Team Rules

Keep existing content.
`
  });

  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const agents = await readText(path.join(targetRepo, "AGENTS.md"));
  const blockCount = agents.split(MANAGED_BLOCK_START).length - 1;

  assert.match(agents, /# Team Rules/);
  assert.match(agents, /Keep existing content\./);
  assert.equal(blockCount, 1);
  assert.match(agents, /Skills: `planner`, `implementer`, `merge-check`\./);
});

test("blank template initializes a git repository and installs template defaults", async () => {
  const targetRepo = await makeTempDir("codex-app-template-blank-");
  await runInstall(["--repo", targetRepo, "--template", "blank", "--source", path.resolve(".")]);

  await assertInstalledAssets(targetRepo);
  await expectExists(path.join(targetRepo, "README.md"));

  const gitStatus = await runGit(targetRepo, ["rev-parse", "--is-inside-work-tree"]);
  const branch = await runGit(targetRepo, ["branch", "--show-current"], { allowFailure: true });
  const config = await readConfig(targetRepo);

  assert.equal(gitStatus.stdout.trim(), "true");
  assert.equal(branch.stdout.trim(), "main");
  assert.doesNotMatch(config, /npm test|pnpm test|yarn test|go test|cargo test/);
});

test("install.sh rejects unsupported template names", async () => {
  const targetRepo = await makeTempDir("codex-app-template-unsupported-");
  const result = await runInstall(
    ["--repo", targetRepo, "--template", "fullstack-example", "--source", path.resolve(".")],
    { allowFailure: true }
  );

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Unsupported template: fullstack-example/);
});

test("Node hooks prefer pnpm when pnpm-lock.yaml exists", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "pnpm" });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const config = await readConfig(targetRepo);
  assert.match(config, /pnpm test/);
  assert.doesNotMatch(config, /yarn test/);
  assert.doesNotMatch(config, /\bnpm test\b/);
});

test("Node hooks prefer yarn when yarn.lock exists", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "yarn" });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const config = await readConfig(targetRepo);
  assert.match(config, /yarn test/);
});

test("polyglot repositories receive Go and Rust verification hooks in shared config", async () => {
  const targetRepo = await createExistingRepo({ includeGo: true, includeRust: true });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const config = await readConfig(targetRepo);
  assert.match(config, /^branch_verify = \[/m);
  assert.match(config, /go test \.\/\.\.\./);
  assert.match(config, /cargo test/);
});

test("source repository keeps one canonical vocabulary across docs, config, installer, and template assets", async () => {
  const filesToCheck = [
    "README.md",
    "AGENTS.md",
    "docs/codex-quickstart.md",
    "docs/manual-merge-checklist.md",
    "template/AGENTS.md",
    "template/AGENTS-BLOCK.md",
    "template/README.md",
    "install.sh",
    ".codex/config.toml",
    "package.json"
  ];
  const productFiles = new Set([
    "README.md",
    "AGENTS.md",
    "template/AGENTS.md",
    "template/AGENTS-BLOCK.md",
    "template/README.md",
    "install.sh"
  ]);

  for (const relativePath of filesToCheck) {
    const content = await readText(path.join(repoRoot, relativePath));

    if (productFiles.has(relativePath)) {
      assert.match(content, new RegExp(TEMPLATE_PRODUCT_NAME.replace(/ /g, "\\s+")));
    }

    for (const legacyTerm of LEGACY_USER_FACING_TERMS) {
      assert.doesNotMatch(content, new RegExp(legacyTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }

  const readme = await readText(path.join(repoRoot, "README.md"));
  const agents = await readText(path.join(repoRoot, "AGENTS.md"));

  for (const skill of TEMPLATE_SKILLS) {
    assert.match(readme, new RegExp(skill.replace("-", "\\-")));
    assert.match(agents, new RegExp(skill.replace("-", "\\-")));
  }
});

test("source repository removes legacy entrypoints and keeps only the codex-template skill namespace", async () => {
  await expectExists(path.join(repoRoot, "tools", "template-init.mjs"));
  await expectExists(path.join(repoRoot, "test", "template.test.mjs"));

  await expectMissing(path.join(repoRoot, "Makefile"));
  await expectMissing(path.join(repoRoot, "tools", "composer.mjs"));
  await expectMissing(path.join(repoRoot, "scripts", "verify-template-install.sh"));
  await expectMissing(path.join(repoRoot, "scripts", "live-smoke.sh"));
  await expectMissing(path.join(repoRoot, "test", "protocol.test.mjs"));
  await expectMissing(path.join(repoRoot, ".agents", "skills", "codex-composer"));
});
