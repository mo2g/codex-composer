import fs from "node:fs/promises";
import path from "node:path";
import { collectRepoFiles, protocolRoot, git, runCommand, branchExists, currentBranch, ensureRuntimeIgnoreEntries } from "./runtime.mjs";
import { ensureDir, pathExists, readText, toPosixPath, writeText } from "./fs.mjs";

const PROTOCOL_BUNDLE_ENTRIES = ["prompts", "skills", "schemas", "tools"];
const COPY_IGNORE = new Set([".DS_Store"]);
const FRONTEND_CANDIDATES = ["frontend", "web", "ui", "client", "apps/web"];
const BACKEND_CANDIDATES = ["backend", "api", "server", "apps/api"];
const MANAGED_BLOCK_START = "<!-- CODEX COMPOSER START -->";
const MANAGED_BLOCK_END = "<!-- CODEX COMPOSER END -->";
const MANAGED_LAUNCHER_MARKER = "# Codex Composer Launcher";

function quoteTomlString(value) {
  return JSON.stringify(String(value));
}

function renderArray(values) {
  return `[${values.map((value) => quoteTomlString(value)).join(", ")}]`;
}

async function detectMainBranch(repoRoot) {
  for (const candidate of ["main", "master"]) {
    if (await branchExists(repoRoot, candidate)) {
      return candidate;
    }
  }

  const branch = await currentBranch(repoRoot);
  return branch || "main";
}

function detectDirectory(files, candidates) {
  for (const candidate of candidates) {
    if (files.some((file) => file === candidate || file.startsWith(`${candidate}/`))) {
      return candidate;
    }
  }

  return null;
}

function detectGoModules(files) {
  const dirs = new Set();
  for (const file of files) {
    if (!file.endsWith("/go.mod") && file !== "go.mod") {
      continue;
    }
    const dir = path.posix.dirname(file);
    dirs.add(dir === "." ? "." : dir);
  }
  return [...dirs];
}

function detectPackageRoots(files) {
  const dirs = new Set();
  for (const file of files) {
    if (!file.endsWith("/package.json") && file !== "package.json") {
      continue;
    }
    const dir = path.posix.dirname(file);
    dirs.add(dir === "." ? "." : dir);
  }
  return [...dirs];
}

function inferLayout(files, template) {
  if (template === "react-go-minimal") {
    return {
      repoType: "react-go-minimal",
      frontendDir: "frontend",
      backendDir: "backend",
      authCoreDir: "backend/internal/auth",
      goModuleDirs: ["backend"],
      packageDirs: []
    };
  }

  const frontendDir = detectDirectory(files, FRONTEND_CANDIDATES);
  const backendDir = detectDirectory(files, BACKEND_CANDIDATES);
  const authCoreDir = backendDir && files.some((file) => file.startsWith(`${backendDir}/internal/auth/`))
    ? `${backendDir}/internal/auth`
    : null;

  return {
    repoType: template === "existing" ? "existing" : "empty",
    frontendDir,
    backendDir,
    authCoreDir,
    goModuleDirs: detectGoModules(files),
    packageDirs: detectPackageRoots(files)
  };
}

function renderHooks(layout) {
  const branchVerify = [
    "git diff --quiet HEAD -- && { echo \"No tracked changes to verify\"; exit 1; } || true"
  ];
  const integrationVerify = [
    "git rev-parse --verify HEAD >/dev/null"
  ];
  const mainVerify = [
    "git rev-parse --verify HEAD >/dev/null"
  ];

  for (const moduleDir of layout.goModuleDirs) {
    if (moduleDir === ".") {
      branchVerify.push("go test ./...");
      integrationVerify.push("go test ./...");
      mainVerify.push("go test ./...");
      continue;
    }

    branchVerify.push(`test -f ${quoteTomlString(`${moduleDir}/go.mod`)} && (cd ${quoteTomlString(moduleDir)} && go test ./...) || true`);
    integrationVerify.push(`test -f ${quoteTomlString(`${moduleDir}/go.mod`)} && (cd ${quoteTomlString(moduleDir)} && go test ./...) || true`);
    mainVerify.push(`test -f ${quoteTomlString(`${moduleDir}/go.mod`)} && (cd ${quoteTomlString(moduleDir)} && go test ./...) || true`);
  }

  for (const packageDir of layout.packageDirs) {
    const packageJson = packageDir === "." ? "package.json" : `${packageDir}/package.json`;
    const workDir = packageDir === "." ? "." : packageDir;
    branchVerify.push(`test -f ${quoteTomlString(packageJson)} && (cd ${quoteTomlString(workDir)} && npm test -- --runInBand) || true`);
    mainVerify.push(`test -f ${quoteTomlString(packageJson)} && (cd ${quoteTomlString(workDir)} && npm test -- --runInBand) || true`);
  }

  return { branchVerify, integrationVerify, mainVerify };
}

function renderPathRules(layout) {
  const lines = [];

  if (layout.frontendDir && layout.backendDir) {
    lines.push(
      "",
      "[[path_rules]]",
      `globs = ${renderArray([`${layout.frontendDir}/**`])}`,
      'component = "frontend"',
      'conflict_group = "frontend"',
      "core = false",
      "",
      "[[path_rules]]",
      `globs = ${renderArray([`${layout.backendDir}/**`])}`,
      'component = "backend"',
      'conflict_group = "backend"',
      "core = false"
    );
  }

  if (layout.authCoreDir) {
    lines.push(
      "",
      "[[path_rules]]",
      `globs = ${renderArray([`${layout.authCoreDir}/**`])}`,
      'component = "auth-core"',
      'conflict_group = "auth-core"',
      "core = true",
      "",
      "[[parallel_rules]]",
      'action = "deny"',
      'when_component = "auth-core"',
      'reason = "auth-core work must be serialized."'
    );
  }

  return lines.join("\n");
}

function templateConfig({ template, codexBinary, mainBranch, layout }) {
  const hooks = renderHooks(layout);
  const lines = [
    "[project]",
    `main_branch = ${quoteTomlString(mainBranch)}`,
    'branch_prefix = "codex/"',
    `repo_type = ${quoteTomlString(layout.repoType)}`,
    "",
    "[codex]",
    `binary = ${quoteTomlString(codexBinary)}`,
    'sandbox = "workspace-write"',
    'approval_policy = "on-request"',
    "",
    "[planner]",
    "max_parallel = 2",
    "require_plan_approval = true",
    "require_integrate_approval = false",
    "",
    "[budget]",
    "max_codex_runs = 5",
    "allow_auto_replan = false",
    "",
    "[hooks]",
    `branch_verify = ${renderArray(hooks.branchVerify)}`,
    `integration_verify = ${renderArray(hooks.integrationVerify)}`,
    `main_verify = ${renderArray(hooks.mainVerify)}`
  ];

  const pathRuleSection = renderPathRules(layout);
  if (pathRuleSection) {
    lines.push(pathRuleSection);
  }

  if (template === "empty") {
    lines[3] = 'repo_type = "empty"';
  }

  return `${lines.join("\n")}\n`;
}

function reactGoMinimalFiles() {
  return [
    {
      relativePath: "frontend/src/App.jsx",
      content: `import { LoginPage } from "./LoginPage.jsx";

export function App() {
  return <LoginPage />;
}
`
    },
    {
      relativePath: "frontend/src/LoginPage.jsx",
      content: `export function LoginPage() {
  return (
    <main>
      <h1>Sign in</h1>
      <p>Bootstrap placeholder for the login flow.</p>
    </main>
  );
}
`
    },
    {
      relativePath: "frontend/src/api.js",
      content: `export async function login(payload) {
  return { ok: false, payload };
}
`
    },
    {
      relativePath: "backend/go.mod",
      content: `module example.com/react-go-login/backend

go 1.24.1
`
    },
    {
      relativePath: "backend/cmd/server/main.go",
      content: `package main

import "fmt"

func main() {
\tfmt.Println("bootstrap login server")
}
`
    },
    {
      relativePath: "backend/internal/auth/token.go",
      content: `package auth

func IssueToken(userID string) string {
\treturn "bootstrap-" + userID
}
`
    }
  ];
}

async function ensureGitIgnoreEntry(repoRoot, entry) {
  const ignorePath = path.join(repoRoot, ".gitignore");
  const existing = await readText(ignorePath, "");
  if (existing.split(/\r?\n/).includes(entry)) {
    return;
  }

  const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  await writeText(ignorePath, `${existing}${prefix}${entry}\n`);
}

async function ensureGitExcludeEntry(repoRoot, entry) {
  const excludePath = path.join(repoRoot, ".git", "info", "exclude");
  if (!(await pathExists(excludePath))) {
    return;
  }

  const existing = await readText(excludePath, "");
  if (existing.split(/\r?\n/).includes(entry)) {
    return;
  }

  const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  await writeText(excludePath, `${existing}${prefix}${entry}\n`);
}

async function ensureGitRepository(repoRoot, mainBranch) {
  const result = await git(repoRoot, ["rev-parse", "--show-toplevel"], { allowFailure: true });
  if (result.code === 0) {
    return false;
  }

  await runCommand("git", ["init", "-b", mainBranch], { cwd: repoRoot });
  return true;
}

async function copyEntry(sourcePath, targetPath) {
  const stats = await fs.stat(sourcePath);
  if (stats.isDirectory()) {
    await ensureDir(targetPath);
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      if (COPY_IGNORE.has(entry.name)) {
        continue;
      }
      await copyEntry(path.join(sourcePath, entry.name), path.join(targetPath, entry.name));
    }
    return;
  }

  if (COPY_IGNORE.has(path.basename(sourcePath))) {
    return;
  }

  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

async function copyBundle(targetRoot) {
  for (const entry of PROTOCOL_BUNDLE_ENTRIES) {
    await copyEntry(path.join(protocolRoot, entry), path.join(targetRoot, entry));
  }
}

async function ensureExecutableBits(targetRoot) {
  const toolsDir = path.join(targetRoot, "tools");
  await fs.chmod(path.join(toolsDir, "composer.mjs"), 0o755);
}

async function writeTemplateFiles(targetRoot, template) {
  if (template !== "react-go-minimal") {
    return;
  }

  for (const file of reactGoMinimalFiles()) {
    const absolutePath = path.join(targetRoot, file.relativePath);
    await ensureDir(path.dirname(absolutePath));
    if (!(await pathExists(absolutePath))) {
      await writeText(absolutePath, file.content);
    }
  }
}

async function collectBootstrapFacts(repoRoot, template) {
  const files = (await collectRepoFiles(repoRoot)).map((file) => toPosixPath(file));
  return {
    mainBranch: await detectMainBranch(repoRoot),
    layout: inferLayout(files, template)
  };
}

function renderManagedAgentsBlock(launcherName) {
  return `${MANAGED_BLOCK_START}
## Codex Composer

- Current thread: planner/control thread
- Main entry: \`./${launcherName} next\`
- Protocol files: \`.codex-composer/protocol/\`
- Runtime state: \`.codex-composer/runs/<run-id>/\`
- Optional parallel split: keep the current repo as task \`A\`; create task \`B\` with \`./${launcherName} split --run <run-id>\`

Use the launcher instead of calling root-level protocol directories directly.
${MANAGED_BLOCK_END}`;
}

function upsertManagedBlock(existing, block) {
  const pattern = new RegExp(`${MANAGED_BLOCK_START}[\\s\\S]*?${MANAGED_BLOCK_END}`, "m");
  if (pattern.test(existing)) {
    return existing.replace(pattern, block);
  }

  const trimmed = existing.trimEnd();
  if (!trimmed) {
    return `${block}\n`;
  }

  return `${trimmed}\n\n${block}\n`;
}

async function writeAgentsFile(repoRoot, launcherName) {
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  if (!(await pathExists(agentsPath))) {
    const sourceAgents = await readText(path.join(protocolRoot, "AGENTS.md"));
    await writeText(agentsPath, sourceAgents);
    return;
  }

  const existing = await readText(agentsPath, "");
  await writeText(agentsPath, upsertManagedBlock(existing, renderManagedAgentsBlock(launcherName)));
}

async function chooseLauncherName(repoRoot) {
  for (const name of ["codex-composer", "composer-next"]) {
    const filePath = path.join(repoRoot, name);
    if (!(await pathExists(filePath))) {
      return name;
    }

    const content = await readText(filePath, "");
    if (content.includes(MANAGED_LAUNCHER_MARKER)) {
      return name;
    }
  }

  throw new Error("Target already contains both codex-composer and composer-next; unable to install launcher safely");
}

function renderLauncherScript(launcherName) {
  return `#!/usr/bin/env bash
${MANAGED_LAUNCHER_MARKER}
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$ROOT_DIR/.codex-composer/protocol/tools/composer.mjs" "$@"
`;
}

async function writeLauncher(repoRoot) {
  const launcherName = await chooseLauncherName(repoRoot);
  const launcherPath = path.join(repoRoot, launcherName);
  await writeText(launcherPath, renderLauncherScript(launcherName));
  await fs.chmod(launcherPath, 0o755);
  return launcherName;
}

export async function bootstrapProtocolRepo({ repoRoot, template = "existing", codexBinary = "codex" }) {
  if (!["existing", "empty", "react-go-minimal"].includes(template)) {
    throw new Error(`Unsupported template: ${template}`);
  }

  await ensureDir(repoRoot);
  const initializedGit = await ensureGitRepository(repoRoot, "main");
  const facts = await collectBootstrapFacts(repoRoot, template);
  const stateRoot = path.join(repoRoot, ".codex-composer");
  const protocolTargetRoot = path.join(stateRoot, "protocol");

  await copyBundle(protocolTargetRoot);
  await ensureExecutableBits(protocolTargetRoot);

  const configPath = path.join(stateRoot, "config.toml");
  if (await pathExists(configPath)) {
    throw new Error(`Target already contains ${configPath}`);
  }
  await ensureDir(path.dirname(configPath));
  await writeText(configPath, templateConfig({
    template,
    codexBinary,
    mainBranch: facts.mainBranch,
    layout: facts.layout
  }));
  await writeTemplateFiles(repoRoot, template);
  await ensureDir(path.join(stateRoot, "runs"));
  await ensureDir(path.join(stateRoot, "worktrees"));
  await ensureRuntimeIgnoreEntries(repoRoot);
  const launcherName = await writeLauncher(repoRoot);
  await writeAgentsFile(repoRoot, launcherName);

  return {
    repoRoot,
    template,
    initializedGit,
    launcher: launcherName
  };
}
