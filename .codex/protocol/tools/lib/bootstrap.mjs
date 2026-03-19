import fs from "node:fs/promises";
import path from "node:path";
import { collectRepoFiles, protocolRoot, sourceRepoRoot, sourceSkillsRoot, git, runCommand, branchExists, currentBranch, ensureRuntimeIgnoreEntries } from "./runtime.mjs";
import { ensureDir, pathExists, readText, toPosixPath, writeText } from "./fs.mjs";

const PROTOCOL_BUNDLE_ENTRIES = ["templates", "schemas", "tools"];
const COPY_IGNORE = new Set([".DS_Store"]);
const FRONTEND_CANDIDATES = ["frontend", "web", "ui", "client", "apps/web"];
const BACKEND_CANDIDATES = ["backend", "api", "server", "apps/api"];
const MANAGED_BLOCK_START = "<!-- CODEX COMPOSER START -->";
const MANAGED_BLOCK_END = "<!-- CODEX COMPOSER END -->";
const MANAGED_LAUNCHER_MARKER = "# Codex Composer Launcher";
const PERMISSION_PROFILES = new Set(["safe", "balanced", "wide_open"]);
const LEGACY_SKILL_MAP = {
  planner: "planner",
  "task-owner": "task-owner",
  "integrator-reviewer": "integrator-reviewer",
  "codex-composer-planner": "planner",
  "codex-composer-task-owner": "task-owner",
  "codex-composer-integrator-reviewer": "integrator-reviewer"
};

function quoteTomlString(value) {
  return JSON.stringify(String(value));
}

function renderArray(values) {
  return `[${values.map((value) => quoteTomlString(value)).join(", ")}]`;
}

function backupTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "");
}

async function backupFileIfPresent(targetPath, results = null) {
  if (!(await pathExists(targetPath))) {
    return null;
  }

  const backupPath = `${targetPath}.bak.${backupTimestamp()}`;
  await ensureDir(path.dirname(backupPath));
  await fs.copyFile(targetPath, backupPath);
  if (results) {
    results.backups.push(path.relative(results.repoRoot, backupPath) || backupPath);
  }
  return backupPath;
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

async function copySkillsBundle(targetRoot) {
  const skillEntries = await fs.readdir(sourceSkillsRoot, { withFileTypes: true });
  for (const entry of skillEntries) {
    if (!entry.isDirectory() || COPY_IGNORE.has(entry.name)) {
      continue;
    }
    await copyEntry(path.join(sourceSkillsRoot, entry.name), path.join(targetRoot, entry.name));
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
- Protocol files: \`.codex/protocol/\`
- Repo config: \`.codex/config.toml\`
- Skills: \`.agents/skills/codex-composer/\`
- Runtime state: \`.codex/local/runs/<run-id>/\` and \`.codex/local/worktrees/<run-id>/\`
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
    const sourceAgents = await readText(path.join(sourceRepoRoot, "AGENTS.md"));
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
node "$ROOT_DIR/.codex/protocol/tools/composer.mjs" "$@"
`;
}

function renderRulesHeader(permissionProfile) {
  return [
    "# Codex Composer permissions profile",
    `# profile: ${permissionProfile}`,
    "# These rules only take effect after the project is trusted and Codex is restarted.",
    ""
  ].join("\n");
}

function renderBalancedRules() {
  return `${renderRulesHeader("balanced")}# Allow routine Codex Composer orchestration commands outside the sandbox.
prefix_rule(
    pattern = [["./codex-composer", "./composer-next"], ["start", "next", "plan", "checkpoint", "split", "status", "summarize"]],
    decision = "allow",
    justification = "Routine Codex Composer workflow commands can run without repeated approval prompts.",
    match = [
        "./codex-composer start --run login --requirement login",
        "./composer-next split --run login",
        "./codex-composer summarize --run login",
    ],
    not_match = [
        "./codex-composer verify --run login --target a",
        "./codex-composer commit --run login --task a",
        "git commit -m chore",
    ],
)

# Keep project-defined verification and commit actions behind an explicit prompt.
prefix_rule(
    pattern = [["./codex-composer", "./composer-next"], ["verify", "commit"]],
    decision = "prompt",
    justification = "Verification hooks and commit actions should remain explicit because they may run project-specific commands or mutate git state.",
    match = [
        "./codex-composer verify --run login --target a",
        "./composer-next commit --run login --task a",
    ],
    not_match = [
        "./codex-composer split --run login",
        "git commit -m chore",
    ],
)
`;
}

function renderWideOpenRules() {
  return `${renderRulesHeader("wide_open")}# Allow the main Codex Composer workflow commands without repeated prompts.
prefix_rule(
    pattern = [["./codex-composer", "./composer-next"], ["start", "next", "plan", "checkpoint", "split", "status", "summarize", "verify", "commit"]],
    decision = "allow",
    justification = "Trusted local Codex Composer repositories can auto-run their main workflow commands outside the sandbox.",
    match = [
        "./codex-composer verify --run login --target a",
        "./composer-next commit --run login --task a",
        "./codex-composer split --run login",
    ],
    not_match = [
        "./codex-composer run-task --run login --task a",
        "git commit -m chore",
    ],
)
`;
}

function renderRulesFile(permissionProfile) {
  if (permissionProfile === "safe") {
    return null;
  }
  if (permissionProfile === "wide_open") {
    return renderWideOpenRules();
  }
  return renderBalancedRules();
}

async function writeRulesFile(stateRoot, permissionProfile) {
  const rulesPath = path.join(stateRoot, "rules", "codex-composer.rules");
  const content = renderRulesFile(permissionProfile);

  if (!content) {
    if (await pathExists(rulesPath)) {
      await backupFileIfPresent(rulesPath);
      await fs.rm(rulesPath, { force: true });
    }
    return;
  }

  await backupFileIfPresent(rulesPath);
  await ensureDir(path.dirname(rulesPath));
  await writeText(rulesPath, content);
}

async function writeLauncher(repoRoot) {
  const launcherName = await chooseLauncherName(repoRoot);
  const launcherPath = path.join(repoRoot, launcherName);
  await writeText(launcherPath, renderLauncherScript(launcherName));
  await fs.chmod(launcherPath, 0o755);
  return launcherName;
}

async function renameIfPresent(sourcePath, targetPath) {
  if (!(await pathExists(sourcePath)) || sourcePath === targetPath) {
    return false;
  }

  if (await pathExists(targetPath)) {
    return false;
  }

  await ensureDir(path.dirname(targetPath));
  await fs.rename(sourcePath, targetPath);
  return true;
}

async function moveConfigIntoCanonical(repoRoot, results) {
  const targetPath = path.join(repoRoot, ".codex", "config.toml");
  const candidateSources = [
    path.join(repoRoot, ".codex", "local", "config.toml"),
    path.join(repoRoot, ".codex-composer", "config.toml"),
    path.join(repoRoot, ".codex-composer.toml")
  ];

  for (const sourcePath of candidateSources) {
    if (!(await pathExists(sourcePath)) || sourcePath === targetPath) {
      continue;
    }

    if (await pathExists(targetPath)) {
      await backupFileIfPresent(targetPath, results);
      await fs.rm(targetPath, { force: true });
    }

    await ensureDir(path.dirname(targetPath));
    await fs.rename(sourcePath, targetPath);
    results.moved.push(path.relative(repoRoot, targetPath) || targetPath);
    return true;
  }

  return false;
}

async function removeDirIfEmpty(targetPath) {
  if (!(await pathExists(targetPath))) {
    return;
  }

  const entries = await fs.readdir(targetPath);
  if (entries.length === 0) {
    await fs.rmdir(targetPath);
  }
}

async function migrateLegacySkills(repoRoot, results) {
  const legacySkillsRoot = path.join(repoRoot, ".codex-composer", "protocol", "skills");
  const newSkillsRoot = path.join(repoRoot, ".agents", "skills", "codex-composer");

  if (!(await pathExists(legacySkillsRoot))) {
    return;
  }

  const entries = await fs.readdir(legacySkillsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const mappedName = LEGACY_SKILL_MAP[entry.name] ?? entry.name;
    const moved = await renameIfPresent(
      path.join(legacySkillsRoot, entry.name),
      path.join(newSkillsRoot, mappedName)
    );
    if (moved) {
      results.moved.push(`skills/${entry.name}`);
    } else if (!(await pathExists(path.join(newSkillsRoot, mappedName)))) {
      results.remaining.push(`skills/${entry.name}`);
    }
  }

  await removeDirIfEmpty(legacySkillsRoot);
}

async function migrateInterimSkills(repoRoot, results) {
  const interimSkillsRoot = path.join(repoRoot, ".codex", "skills");
  const newSkillsRoot = path.join(repoRoot, ".agents", "skills", "codex-composer");

  if (!(await pathExists(interimSkillsRoot))) {
    return;
  }

  const entries = await fs.readdir(interimSkillsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const mappedName = LEGACY_SKILL_MAP[entry.name] ?? entry.name;
    const moved = await renameIfPresent(
      path.join(interimSkillsRoot, entry.name),
      path.join(newSkillsRoot, mappedName)
    );
    if (moved) {
      results.moved.push(`agents-skills/${entry.name}`);
    } else if (!(await pathExists(path.join(newSkillsRoot, mappedName)))) {
      results.remaining.push(`agents-skills/${entry.name}`);
    }
  }

  await removeDirIfEmpty(interimSkillsRoot);
}

export async function migrateLegacyRepo({ repoRoot }) {
  const results = {
    repoRoot,
    migrated: false,
    moved: [],
    remaining: [],
    backups: [],
    launcher: null
  };

  const legacyRoot = path.join(repoRoot, ".codex-composer");
  const newRoot = path.join(repoRoot, ".codex");
  const newProtocolRoot = path.join(newRoot, "protocol");
  const newLocalRoot = path.join(newRoot, "local");

  await renameIfPresent(path.join(legacyRoot, "protocol", "templates"), path.join(newProtocolRoot, "templates")) && results.moved.push("protocol/templates");
  await renameIfPresent(path.join(legacyRoot, "protocol", "prompts"), path.join(newProtocolRoot, "templates")) && results.moved.push("protocol/prompts->templates");
  await renameIfPresent(path.join(legacyRoot, "protocol", "schemas"), path.join(newProtocolRoot, "schemas")) && results.moved.push("protocol/schemas");
  await renameIfPresent(path.join(legacyRoot, "protocol", "tools"), path.join(newProtocolRoot, "tools")) && results.moved.push("protocol/tools");
  await migrateLegacySkills(repoRoot, results);
  await migrateInterimSkills(repoRoot, results);
  await moveConfigIntoCanonical(repoRoot, results);
  await renameIfPresent(path.join(legacyRoot, "runs"), path.join(newLocalRoot, "runs")) && results.moved.push("local/runs");
  await renameIfPresent(path.join(legacyRoot, "worktrees"), path.join(newLocalRoot, "worktrees")) && results.moved.push("local/worktrees");

  results.launcher = await writeLauncher(repoRoot);
  await writeAgentsFile(repoRoot, results.launcher);
  await ensureRuntimeIgnoreEntries(repoRoot);

  await removeDirIfEmpty(path.join(legacyRoot, "protocol"));
  await removeDirIfEmpty(legacyRoot);

  if (await pathExists(legacyRoot)) {
    const leftover = await fs.readdir(legacyRoot);
    results.remaining.push(...leftover.map((entry) => `.codex-composer/${entry}`));
  }

  results.migrated = results.moved.length > 0;
  return results;
}

export async function bootstrapProtocolRepo({ repoRoot, template = "existing", codexBinary = "codex", permissionProfile = "balanced" }) {
  if (!["existing", "empty", "react-go-minimal"].includes(template)) {
    throw new Error(`Unsupported template: ${template}`);
  }
  if (!PERMISSION_PROFILES.has(permissionProfile)) {
    throw new Error(`Unsupported permission profile: ${permissionProfile}`);
  }

  await ensureDir(repoRoot);
  if ((await pathExists(path.join(repoRoot, ".codex-composer"))) || (await pathExists(path.join(repoRoot, ".codex-composer.toml")))) {
    throw new Error("Legacy .codex-composer layout detected. Run ./codex-composer migrate before re-installing.");
  }
  const initializedGit = await ensureGitRepository(repoRoot, "main");
  const facts = await collectBootstrapFacts(repoRoot, template);
  const stateRoot = path.join(repoRoot, ".codex");
  const agentsRoot = path.join(repoRoot, ".agents");
  const protocolTargetRoot = path.join(stateRoot, "protocol");
  const skillsTargetRoot = path.join(agentsRoot, "skills", "codex-composer");
  const localRoot = path.join(stateRoot, "local");

  await copyBundle(protocolTargetRoot);
  await copySkillsBundle(skillsTargetRoot);
  await ensureExecutableBits(protocolTargetRoot);

  const configPath = path.join(stateRoot, "config.toml");
  await backupFileIfPresent(configPath);
  await ensureDir(path.dirname(configPath));
  await writeText(configPath, templateConfig({
    template,
    codexBinary,
    mainBranch: facts.mainBranch,
    layout: facts.layout
  }));
  await writeRulesFile(stateRoot, permissionProfile);
  await writeTemplateFiles(repoRoot, template);
  await ensureDir(path.join(localRoot, "runs"));
  await ensureDir(path.join(localRoot, "worktrees"));
  await ensureRuntimeIgnoreEntries(repoRoot);
  const launcherName = await writeLauncher(repoRoot);
  await writeAgentsFile(repoRoot, launcherName);

  return {
    repoRoot,
    template,
    initializedGit,
    launcher: launcherName,
    permissionProfile
  };
}
