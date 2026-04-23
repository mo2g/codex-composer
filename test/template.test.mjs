import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CODEX_COMPOSER_REF,
  LEGACY_USER_FACING_TERMS,
  TEMPLATE_DOCS,
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

function assertIncludesAll(content, patterns) {
  for (const pattern of patterns) {
    assert.match(content, pattern);
  }
}

function assertMentionsAny(content, patterns) {
  assert.ok(
    patterns.some((pattern) => pattern.test(content)),
    `Expected content to match one of: ${patterns.map((pattern) => pattern.toString()).join(", ")}`
  );
}

async function assertInstalledAssets(targetRepo) {
  await expectExists(path.join(targetRepo, "AGENTS.md"));
  await expectMissing(path.join(targetRepo, ".codex", "config.toml"));
  await expectMissing(path.join(targetRepo, "docs", "manual-merge-checklist.md"));

  for (const relativePath of TEMPLATE_DOCS) {
    await expectExists(path.join(targetRepo, relativePath));
  }

  for (const skill of TEMPLATE_SKILLS) {
    await expectExists(path.join(targetRepo, ".agents", "skills", TEMPLATE_NAMESPACE, skill, "SKILL.md"));
  }

  await expectMissing(path.join(targetRepo, ".agents", "skills", TEMPLATE_NAMESPACE, "merge-check"));
  await expectMissing(path.join(targetRepo, ".codex", "protocol"));
  await expectMissing(path.join(targetRepo, "tools", "composer.mjs"));
}

test("install.sh bootstraps an existing repository into the Codex App Template layout", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "npm" });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  await assertInstalledAssets(targetRepo);
  await expectExists(path.join(targetRepo, "scripts", "existing.sh"));
  await expectExists(path.join(targetRepo, "tools", "existing.mjs"));

  const readme = await readText(path.join(targetRepo, "README.md"));
  const agents = await readText(path.join(targetRepo, "AGENTS.md"));

  assert.equal(readme, "# Existing Repo\n");
  assert.equal(agents.trim(), CODEX_COMPOSER_REF);
});

test("install.sh upserts one @CODEX-COMPOSER.md reference when AGENTS.md already exists", async () => {
  const targetRepo = await createExistingRepo({
    agentsContent: `# Team Rules

Keep existing content.
`
  });

  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const agents = await readText(path.join(targetRepo, "AGENTS.md"));
  const codexComposer = await readText(path.join(targetRepo, "CODEX-COMPOSER.md"));
  const refCount = agents.split(CODEX_COMPOSER_REF).length - 1;

  // AGENTS.md preserves user content and has exactly one reference
  assert.match(agents, /# Team Rules/);
  assert.match(agents, /Keep existing content\./);
  assert.equal(refCount, 1);

  // CODEX-COMPOSER.md contains the actual content
  assertIncludesAll(codexComposer, [
    /docs\/codex-quickstart\.md/,
    /docs\/codex-task-card-workflow\.md/,
    /docs\/codex-debug-workflow\.md/
  ]);
});

test("blank template initializes a git repository and installs template defaults", async () => {
  const targetRepo = await makeTempDir("codex-app-template-blank-");
  await runInstall(["--repo", targetRepo, "--template", "blank", "--source", path.resolve(".")]);

  await assertInstalledAssets(targetRepo);
  await expectExists(path.join(targetRepo, "README.md"));

  const gitStatus = await runGit(targetRepo, ["rev-parse", "--is-inside-work-tree"]);
  const branch = await runGit(targetRepo, ["branch", "--show-current"], { allowFailure: true });

  assert.equal(gitStatus.stdout.trim(), "true");
  assert.equal(branch.stdout.trim(), "main");
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

test("installed repositories stay light and skip target config even when the stack is detectable", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "pnpm", includeGo: true, includeRust: true });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  await expectMissing(path.join(targetRepo, ".codex", "config.toml"));
});

test("source repository keeps one canonical vocabulary across docs, config, installer, and template assets", async () => {
  const filesToCheck = [
    "README.md",
    "AGENTS.md",
    "docs/codex-quickstart.md",
    "docs/codex-task-card-workflow.md",
    "docs/codex-debug-workflow.md",
    ".agents/skills/codex-composer/WORKFLOW.md",
    ".agents/skills/codex-composer/EXTERNAL-MEMORY.md",
    ".agents/skills/codex-composer/planner/SKILL.md",
    ".agents/skills/codex-composer/implementer/SKILL.md",
    ".agents/skills/codex-composer/resume-work/SKILL.md",
    ".agents/skills/codex-composer/change-check/SKILL.md",
    ".agents/skills/codex-composer/debug-investigation/SKILL.md",
    ".agents/skills/codex-composer/task-orchestrator/SKILL.md",
    ".agents/skills/codex-composer/task-orchestrator/STATE-MACHINE.md",
    "template/CODEX-COMPOSER.md",
    "template/README.md",
    "install.sh",
    ".codex/config.toml",
    "package.json"
  ];
  const productFiles = new Set([
    "README.md",
    "AGENTS.md",
    "template/CODEX-COMPOSER.md",
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
  const planner = await readText(path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE, "planner", "SKILL.md"));
  const implementer = await readText(path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE, "implementer", "SKILL.md"));
  const resumeWork = await readText(path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE, "resume-work", "SKILL.md"));
  const changeCheck = await readText(path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE, "change-check", "SKILL.md"));
  const debugInvestigation = await readText(
    path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE, "debug-investigation", "SKILL.md")
  );
  const taskOrchestrator = await readText(
    path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE, "task-orchestrator", "SKILL.md")
  );
  const workflow = await readText(path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE, "WORKFLOW.md"));
  const memory = await readText(path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE, "EXTERNAL-MEMORY.md"));

  assertIncludesAll(readme, [/docs\/codex-task-card-workflow\.md/, /docs\/codex-debug-workflow\.md/, /docs\/codex-quickstart\.md/, /template\//, /test\//]);
  assertIncludesAll(agents, [/docs\/codex-quickstart\.md/, /docs\/codex-task-card-workflow\.md/, /docs\/codex-debug-workflow\.md/, /workflow-sync-rules/]);

  assertIncludesAll(planner, [/Task Card/, /Required artifacts/, /Root-cause status/]);
  assertIncludesAll(implementer, [/debug mode is active/, /root cause is still unconfirmed/, /minimal .*experiment mode/]);
  assertIncludesAll(resumeWork, [/Reconstruct a paused task/, /`debug\.md`/, /diff/, /nearby tests/]);
  assertIncludesAll(changeCheck, [/acceptance criteria/, /root cause/, /merge stays manual/]);
  assertIncludesAll(debugInvestigation, [/hypotheses/, /debug\.md/, /root cause/]);
  assertIncludesAll(taskOrchestrator, [/task-orchestrator/, /single entry point/, /hard constraints/, /state transitions/]);
  assertIncludesAll(workflow, [/docs\/codex-task-card-workflow\.md/, /docs\/codex-debug-workflow\.md/, /acceptance-evidence\.md/]);
  assertIncludesAll(memory, [/Code truth beats note truth\./, /acceptance-evidence\.md/, /debug\.md/]);
  assertMentionsAny(agents, [/docs\/codex-quickstart\.md/, /quickstart/, /Start Here/]);
});

test("source repository removes legacy entrypoints and keeps only the codex-composer skill namespace", async () => {
  await expectExists(path.join(repoRoot, "tools", "template-init.mjs"));
  await expectExists(path.join(repoRoot, "test", "template.test.mjs"));

  await expectMissing(path.join(repoRoot, "Makefile"));
  await expectMissing(path.join(repoRoot, "tools", "composer.mjs"));
  await expectMissing(path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE, "merge-check"));
  await expectMissing(path.join(repoRoot, ".codex", "protocol"));
  await expectMissing(path.join(repoRoot, "tools", "composer.mjs"));
  await expectMissing(path.join(repoRoot, ".codex", "codex-composer", "workflow-v2-close-loop", "task-card.md"));
  await expectMissing(path.join(repoRoot, ".codex", "codex-composer", "workflow-v2-close-loop", "journal.md"));
  await expectMissing(path.join(repoRoot, ".codex", "codex-composer", "workflow-v2-close-loop", "acceptance-evidence.md"));
});

