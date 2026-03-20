import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  MANAGED_BLOCK_END,
  MANAGED_BLOCK_START,
  TEMPLATE_DIR,
  TEMPLATE_DOCS,
  TEMPLATE_NAMESPACE,
  TEMPLATE_TYPES
} from "./template-contract.mjs";

const sourceRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceSkillsRoot = path.join(sourceRepoRoot, ".agents", "skills", TEMPLATE_NAMESPACE);
const sourceTemplateRoot = path.join(sourceRepoRoot, TEMPLATE_DIR);
const COPY_IGNORE = new Set([".DS_Store"]);

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
  const { cwd, allowFailure = false } = options;

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
      if ([".git", ".agents", ".codex", "docs", "coverage", "node_modules", ".idea"].includes(entry.name)) {
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

function inferLayout(files) {
  return {
    goModuleDirs: detectGoModules(files),
    packageDirs: detectPackageRoots(files),
    cargoDirs: detectCargoRoots(files)
  };
}

function templateConfig({ mainBranch, layout }) {
  const hooks = renderHooks(layout);

  return [
    "[project]",
    `main_branch = ${quoteTomlString(mainBranch)}`,
    'branch_prefix = "codex/"',
    "",
    "[hooks]",
    `branch_verify = ${renderArray(hooks.branchVerify)}`,
    `integration_verify = ${renderArray(hooks.integrationVerify)}`,
    `main_verify = ${renderArray(hooks.mainVerify)}`
  ].join("\n") + "\n";
}

function renderManagedBlock(content) {
  return `${MANAGED_BLOCK_START}\n${content.trim()}\n${MANAGED_BLOCK_END}`;
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

async function copyFile(sourcePath, targetPath, { overwrite = true } = {}) {
  if (!overwrite && await pathExists(targetPath)) {
    return;
  }

  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

async function copyDir(sourceDir, targetDir, { overwrite = true } = {}) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (COPY_IGNORE.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath, { overwrite });
      continue;
    }

    await copyFile(sourcePath, targetPath, { overwrite });
  }
}

async function copySkills(repoRoot) {
  await copyDir(sourceSkillsRoot, path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE));
}

async function copyDocs(repoRoot) {
  for (const relativePath of TEMPLATE_DOCS) {
    await copyFile(path.join(sourceRepoRoot, relativePath), path.join(repoRoot, relativePath));
  }
}

async function writeTemplateReadme(repoRoot) {
  await copyFile(
    path.join(sourceTemplateRoot, "README.md"),
    path.join(repoRoot, "README.md"),
    { overwrite: false }
  );
}

async function writeAgentsFile(repoRoot) {
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  const templateAgents = await readText(path.join(sourceTemplateRoot, "AGENTS.md"));

  if (!(await pathExists(agentsPath))) {
    await writeText(agentsPath, templateAgents);
    return;
  }

  const existing = await readText(agentsPath, "");
  if (existing.trim() === templateAgents.trim()) {
    return;
  }

  const blockContent = await readText(path.join(sourceTemplateRoot, "AGENTS-BLOCK.md"));
  await writeText(agentsPath, upsertManagedBlock(existing, renderManagedBlock(blockContent)));
}

export async function bootstrapTemplateRepo({ repoRoot, template = "existing" }) {
  if (!TEMPLATE_TYPES.includes(template)) {
    throw new Error(`Unsupported template: ${template}`);
  }

  await ensureDir(repoRoot);
  const mainBranch = "main";
  const initializedGit = await ensureGitRepository(repoRoot, mainBranch);

  await writeTemplateReadme(repoRoot);
  await writeAgentsFile(repoRoot);
  await copyDocs(repoRoot);
  await copySkills(repoRoot);

  const detectedMainBranch = await detectMainBranch(repoRoot);
  const repoFiles = await collectRepoFiles(repoRoot);
  const layout = inferLayout(repoFiles);

  await writeText(
    path.join(repoRoot, ".codex", "config.toml"),
    templateConfig({
      mainBranch: detectedMainBranch || mainBranch,
      layout
    })
  );

  return {
    repoRoot,
    template,
    initializedGit
  };
}
