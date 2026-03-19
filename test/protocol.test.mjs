import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createExistingRepo, makeTempDir, readText, runGit, runInstall } from "./helpers/repo.mjs";

async function expectExists(targetPath) {
  await fs.access(targetPath);
}

async function expectMissing(targetPath) {
  await assert.rejects(fs.access(targetPath));
}

async function readConfig(repoRoot) {
  return readText(path.join(repoRoot, ".codex", "config.toml"));
}

async function assertMinimalInstall(repoRoot) {
  await expectExists(path.join(repoRoot, "AGENTS.md"));
  await expectExists(path.join(repoRoot, ".codex", "config.toml"));
  await expectExists(path.join(repoRoot, ".agents", "skills", "codex-composer", "planner", "SKILL.md"));
  await expectExists(path.join(repoRoot, ".agents", "skills", "codex-composer", "implementer", "SKILL.md"));
  await expectExists(path.join(repoRoot, ".agents", "skills", "codex-composer", "merge-check", "SKILL.md"));
  await expectExists(path.join(repoRoot, "docs", "codex-quickstart.md"));
  await expectExists(path.join(repoRoot, "docs", "manual-merge-checklist.md"));

  await expectMissing(path.join(repoRoot, "codex-composer"));
  await expectMissing(path.join(repoRoot, "composer-next"));
  await expectMissing(path.join(repoRoot, ".codex", "protocol"));
  await expectMissing(path.join(repoRoot, ".codex", "local"));
  await expectMissing(path.join(repoRoot, ".codex", "rules"));
}

test("install.sh bootstraps an existing repository into the minimal Codex template layout", async () => {
  const repoRoot = await createExistingRepo({ packageManager: "npm" });
  await runInstall(["--repo", repoRoot, "--template", "existing", "--source", path.resolve(".")]);

  await assertMinimalInstall(repoRoot);
  await expectExists(path.join(repoRoot, "README.md"));
  await expectExists(path.join(repoRoot, "scripts", "existing.sh"));
  await expectExists(path.join(repoRoot, "tools", "existing.mjs"));

  const config = await readConfig(repoRoot);
  assert.match(config, /repo_type = "existing"/);
  assert.match(config, /main_branch = "main"/);
  assert.match(config, /npm test/);
  assert.doesNotMatch(config, /\[codex\]/);
  assert.doesNotMatch(config, /parallel_ab/);
});

test("install.sh updates an existing AGENTS.md block without reintroducing protocol wording", async () => {
  const repoRoot = await createExistingRepo({
    agentsContent: `# Team Rules

Keep existing content.

<!-- CODEX COMPOSER START -->
legacy block
<!-- CODEX COMPOSER END -->
`
  });

  await runInstall(["--repo", repoRoot, "--template", "existing", "--source", path.resolve(".")]);

  const agents = await readText(path.join(repoRoot, "AGENTS.md"));
  assert.match(agents, /# Team Rules/);
  assert.match(agents, /Keep existing content\./);
  assert.match(agents, /<!-- CODEX TEMPLATE START -->/);
  assert.match(agents, /planner`, `implementer`, `merge-check`/);
  assert.doesNotMatch(agents, /<!-- CODEX COMPOSER START -->/);
  assert.doesNotMatch(agents, /checkpoint/);
  assert.doesNotMatch(agents, /status\.json/);
});

test("install.sh initializes an empty directory as a git repo and writes the minimal template", async () => {
  const repoRoot = await makeTempDir("codex-composer-empty-");
  await runInstall(["--repo", repoRoot, "--template", "empty", "--source", path.resolve(".")]);

  await assertMinimalInstall(repoRoot);

  const gitStatus = await runGit(repoRoot, ["rev-parse", "--is-inside-work-tree"]);
  const branch = await runGit(repoRoot, ["branch", "--show-current"], { allowFailure: true });
  const config = await readConfig(repoRoot);

  assert.equal(gitStatus.stdout.trim(), "true");
  assert.equal(branch.stdout.trim(), "main");
  assert.match(config, /repo_type = "empty"/);
  assert.doesNotMatch(config, /npm test|pnpm test|yarn test|go test|cargo test/);
});

test("react-go-minimal installs scaffold files and Go verification hooks without runtime protocol assets", async () => {
  const repoRoot = await makeTempDir("codex-composer-react-go-");
  await runInstall(["--repo", repoRoot, "--template", "react-go-minimal", "--source", path.resolve(".")]);

  await assertMinimalInstall(repoRoot);
  await expectExists(path.join(repoRoot, "frontend", "src", "App.jsx"));
  await expectExists(path.join(repoRoot, "frontend", "src", "LoginPage.jsx"));
  await expectExists(path.join(repoRoot, "backend", "go.mod"));
  await expectExists(path.join(repoRoot, "backend", "internal", "auth", "token.go"));

  const config = await readConfig(repoRoot);
  assert.match(config, /repo_type = "react-go-minimal"/);
  assert.match(config, /go test \.\/\.\.\./);
});

test("Node hooks prefer pnpm when pnpm-lock.yaml exists", async () => {
  const repoRoot = await createExistingRepo({ packageManager: "pnpm" });
  await runInstall(["--repo", repoRoot, "--template", "existing", "--source", path.resolve(".")]);

  const config = await readConfig(repoRoot);
  assert.match(config, /pnpm test/);
  assert.doesNotMatch(config, /yarn test/);
  assert.doesNotMatch(config, /\bnpm test\b/);
});

test("Node hooks prefer yarn when yarn.lock exists", async () => {
  const repoRoot = await createExistingRepo({ packageManager: "yarn" });
  await runInstall(["--repo", repoRoot, "--template", "existing", "--source", path.resolve(".")]);

  const config = await readConfig(repoRoot);
  assert.match(config, /yarn test/);
});

test("polyglot repositories receive Go and Rust verification hooks in shared config", async () => {
  const repoRoot = await createExistingRepo({ includeGo: true, includeRust: true });
  await runInstall(["--repo", repoRoot, "--template", "existing", "--source", path.resolve(".")]);

  const config = await readConfig(repoRoot);
  assert.match(config, /^branch_verify = \[/m);
  assert.match(config, /go test \.\/\.\.\./);
  assert.match(config, /cargo test/);
});
