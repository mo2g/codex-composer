import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const sourceRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceDocsRoot = path.join(sourceRepoRoot, "docs");
const sourceSkillsRoot = path.join(sourceRepoRoot, ".agents", "skills", "codex-composer");
const COPY_IGNORE = new Set([".DS_Store"]);
const MANAGED_BLOCK_START = "<!-- CODEX TEMPLATE START -->";
const MANAGED_BLOCK_END = "<!-- CODEX TEMPLATE END -->";
const LEGACY_BLOCK_START = "<!-- CODEX COMPOSER START -->";
const LEGACY_BLOCK_END = "<!-- CODEX COMPOSER END -->";

function quoteTomlString(value) {
  return JSON.stringify(String(value));
}

function renderArray(values) {
  return `[${values.map((value) => quoteTomlString(value)).join(", ")}]`;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function readText(targetPath, fallback = "") {
  try {
    return await fs.readFile(targetPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeText(targetPath, content) {
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, content, "utf8");
}

function run(command, args, options = {}) {
  const {
    cwd,
    allowFailure = false
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && !allowFailure) {
        const error = new Error(`${command} ${args.join(" ")} failed with code ${code}\n${stderr}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ code, stdout, stderr });
    });
  });
}

async function git(repoRoot, args, options = {}) {
  return run("git", args, { cwd: repoRoot, ...options });
}

async function branchExists(repoRoot, branch) {
  const result = await git(repoRoot, ["rev-parse", "--verify", "--quiet", branch], { allowFailure: true });
  return result.code === 0;
}

async function currentBranch(repoRoot) {
  const result = await git(repoRoot, ["branch", "--show-current"], { allowFailure: true });
  return result.stdout.trim();
}

async function detectMainBranch(repoRoot) {
  for (const candidate of ["main", "master"]) {
    if (await branchExists(repoRoot, candidate)) {
      return candidate;
    }
  }

  return await currentBranch(repoRoot) || "main";
}

async function ensureGitRepository(repoRoot, mainBranch) {
  const result = await git(repoRoot, ["rev-parse", "--show-toplevel"], { allowFailure: true });
  if (result.code === 0) {
    return false;
  }

  await run("git", ["init", "-b", mainBranch], { cwd: repoRoot });
  return true;
}

async function collectRepoFiles(repoRoot, currentDir = repoRoot, prefix = "") {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (COPY_IGNORE.has(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      if ([".git", ".agents", ".codex", "docs", "node_modules", "coverage", ".idea"].includes(entry.name)) {
        continue;
      }
      files.push(...await collectRepoFiles(repoRoot, path.join(currentDir, entry.name), path.posix.join(prefix, entry.name)));
      continue;
    }

    files.push(path.posix.join(prefix, entry.name));
  }

  return files;
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
  const fileSet = new Set(files);
  const roots = [];

  for (const file of files) {
    if (!file.endsWith("/package.json") && file !== "package.json") {
      continue;
    }

    const dir = path.posix.dirname(file);
    const normalizedDir = dir === "." ? "." : dir;
    const pnpmLock = normalizedDir === "." ? "pnpm-lock.yaml" : `${normalizedDir}/pnpm-lock.yaml`;
    const yarnLock = normalizedDir === "." ? "yarn.lock" : `${normalizedDir}/yarn.lock`;

    let manager = "npm";
    if (fileSet.has(pnpmLock)) {
      manager = "pnpm";
    } else if (fileSet.has(yarnLock)) {
      manager = "yarn";
    }

    roots.push({ dir: normalizedDir, manager });
  }

  return roots;
}

function detectCargoRoots(files) {
  const dirs = new Set();
  for (const file of files) {
    if (!file.endsWith("/Cargo.toml") && file !== "Cargo.toml") {
      continue;
    }
    const dir = path.posix.dirname(file);
    dirs.add(dir === "." ? "." : dir);
  }
  return [...dirs];
}

function renderNodeTestCommand(packageRoot) {
  const packageJson = packageRoot.dir === "." ? "package.json" : `${packageRoot.dir}/package.json`;
  const workDir = packageRoot.dir === "." ? "." : packageRoot.dir;
  const testCommand = packageRoot.manager === "pnpm"
    ? "pnpm test"
    : packageRoot.manager === "yarn"
      ? "yarn test"
      : "npm test";

  return `test -f ${quoteTomlString(packageJson)} && (cd ${quoteTomlString(workDir)} && ${testCommand}) || true`;
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

    const command = `test -f ${quoteTomlString(`${moduleDir}/go.mod`)} && (cd ${quoteTomlString(moduleDir)} && go test ./...) || true`;
    branchVerify.push(command);
    integrationVerify.push(command);
    mainVerify.push(command);
  }

  for (const packageRoot of layout.packageDirs) {
    const command = renderNodeTestCommand(packageRoot);
    branchVerify.push(command);
    integrationVerify.push(command);
    mainVerify.push(command);
  }

  for (const cargoDir of layout.cargoDirs) {
    if (cargoDir === ".") {
      branchVerify.push("cargo test");
      integrationVerify.push("cargo test");
      mainVerify.push("cargo test");
      continue;
    }

    const command = `test -f ${quoteTomlString(`${cargoDir}/Cargo.toml`)} && (cd ${quoteTomlString(cargoDir)} && cargo test) || true`;
    branchVerify.push(command);
    integrationVerify.push(command);
    mainVerify.push(command);
  }

  return { branchVerify, integrationVerify, mainVerify };
}

function inferLayout(files, template) {
  if (template === "react-go-minimal") {
    return {
      repoType: "react-go-minimal",
      goModuleDirs: ["backend"],
      packageDirs: [],
      cargoDirs: []
    };
  }

  return {
    repoType: template === "existing" ? "existing" : "empty",
    goModuleDirs: detectGoModules(files),
    packageDirs: detectPackageRoots(files),
    cargoDirs: detectCargoRoots(files)
  };
}

function templateConfig({ template, mainBranch, layout }) {
  const hooks = renderHooks(layout);
  const lines = [
    "[project]",
    `main_branch = ${quoteTomlString(mainBranch)}`,
    'branch_prefix = "codex/"',
    `repo_type = ${quoteTomlString(layout.repoType)}`,
    "",
    "[hooks]",
    `branch_verify = ${renderArray(hooks.branchVerify)}`,
    `integration_verify = ${renderArray(hooks.integrationVerify)}`,
    `main_verify = ${renderArray(hooks.mainVerify)}`
  ];

  if (template === "empty") {
    lines[3] = 'repo_type = "empty"';
  }

  return `${lines.join("\n")}\n`;
}

function renderManagedAgentsBlock() {
  return `${MANAGED_BLOCK_START}
## Codex Collaboration Template

- Start from \`AGENTS.md\`
- Keep repo-wide verification commands in \`.codex/config.toml\`
- Skills: \`planner\`, \`implementer\`, \`merge-check\`
- Complex work should start with the \`planner\` skill
- If work is independent, split it into a new Codex thread; add a worktree only when isolation helps
- Validate before commit, and keep merge manual
${MANAGED_BLOCK_END}`;
}

function renderInstalledAgentsFile() {
  return `# Codex Collaboration Template

This repository uses a lightweight Codex app collaboration template.

## Repository Map

- \`AGENTS.md\`: the main collaboration rules
- \`.codex/config.toml\`: repo-level verification and Codex behavior
- \`.agents/skills/codex-composer/\`: reusable high-value skills
- \`docs/codex-quickstart.md\`: practical Codex app workflow
- \`docs/manual-merge-checklist.md\`: manual merge gate

## Validation In This Repository

Define verification commands in \`.codex/config.toml\` based on the real stack in this repo:

- Node: \`npm test\`, \`pnpm test\`, or \`yarn test\`
- Go: \`go test ./...\`
- Rust: \`cargo test\`
- Polyglot repos: prefer \`make test\` or one unified verify command

## Core Behavior Rules

1. For non-trivial tasks, start with the \`planner\` skill.
2. For large changes, break the work into clear reviewable steps.
3. If work is independent, prefer a new Codex thread; use a worktree only when isolation helps.
4. Do not commit before relevant verification passes.
5. Never auto-merge into \`main\`; merge remains a human action.
6. Do not edit unrelated files.
7. Subagents are optional and non-default.

## Definition Of Done

A task is done only when all are true:

- Changes stay within approved scope.
- Relevant verification passed.
- Risks, tradeoffs, and follow-ups are explicitly called out.
- Merge is still performed manually by a human.
`;
}

function upsertManagedBlock(existing, block) {
  const patterns = [
    new RegExp(`${MANAGED_BLOCK_START}[\\s\\S]*?${MANAGED_BLOCK_END}`, "m"),
    new RegExp(`${LEGACY_BLOCK_START}[\\s\\S]*?${LEGACY_BLOCK_END}`, "m")
  ];

  for (const pattern of patterns) {
    if (pattern.test(existing)) {
      return existing.replace(pattern, block);
    }
  }

  const trimmed = existing.trimEnd();
  if (!trimmed) {
    return `${block}\n`;
  }

  return `${trimmed}\n\n${block}\n`;
}

async function writeAgentsFile(repoRoot) {
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  if (!(await pathExists(agentsPath))) {
    await writeText(agentsPath, renderInstalledAgentsFile());
    return;
  }

  const existing = await readText(agentsPath, "");
  await writeText(agentsPath, upsertManagedBlock(existing, renderManagedAgentsBlock()));
}

async function copyFile(sourcePath, targetPath) {
  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

async function copySkills(repoRoot) {
  const skillsRoot = path.join(repoRoot, ".agents", "skills", "codex-composer");
  const entries = await fs.readdir(sourceSkillsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || COPY_IGNORE.has(entry.name)) {
      continue;
    }

    const sourceSkillPath = path.join(sourceSkillsRoot, entry.name, "SKILL.md");
    const targetSkillPath = path.join(skillsRoot, entry.name, "SKILL.md");
    await copyFile(sourceSkillPath, targetSkillPath);
  }
}

async function copyDocs(repoRoot) {
  await copyFile(path.join(sourceDocsRoot, "codex-quickstart.md"), path.join(repoRoot, "docs", "codex-quickstart.md"));
  await copyFile(path.join(sourceDocsRoot, "manual-merge-checklist.md"), path.join(repoRoot, "docs", "manual-merge-checklist.md"));
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

async function writeTemplateFiles(repoRoot, template) {
  if (template !== "react-go-minimal") {
    return;
  }

  for (const file of reactGoMinimalFiles()) {
    const targetPath = path.join(repoRoot, file.relativePath);
    if (await pathExists(targetPath)) {
      continue;
    }
    await writeText(targetPath, file.content);
  }
}

export async function bootstrapTemplateRepo({ repoRoot, template = "existing" }) {
  if (!["existing", "empty", "react-go-minimal"].includes(template)) {
    throw new Error(`Unsupported template: ${template}`);
  }

  await ensureDir(repoRoot);
  const mainBranch = "main";
  const initializedGit = await ensureGitRepository(repoRoot, mainBranch);
  const detectedMainBranch = await detectMainBranch(repoRoot);

  const repoFiles = await collectRepoFiles(repoRoot);
  const layout = inferLayout(repoFiles, template);

  await writeAgentsFile(repoRoot);
  await copyDocs(repoRoot);
  await copySkills(repoRoot);
  await writeTemplateFiles(repoRoot, template);

  const configPath = path.join(repoRoot, ".codex", "config.toml");
  await writeText(configPath, templateConfig({
    template,
    mainBranch: detectedMainBranch || mainBranch,
    layout
  }));

  return {
    repoRoot,
    template,
    initializedGit
  };
}
