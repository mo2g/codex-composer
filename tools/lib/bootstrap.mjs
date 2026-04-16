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

async function ensureGitRepository(repoRoot, mainBranch) {
  const result = await git(repoRoot, ["rev-parse", "--show-toplevel"], { allowFailure: true });
  if (result.code === 0) {
    return false;
  }

  await run("git", ["init", "-b", mainBranch], { cwd: repoRoot });
  return true;
}

async function requireExistingGitRepository(repoRoot) {
  if (!(await pathExists(repoRoot))) {
    throw new Error("--upgrade requires an existing git repository.");
  }

  const result = await git(repoRoot, ["rev-parse", "--show-toplevel"], { allowFailure: true });
  if (result.code !== 0) {
    throw new Error("--upgrade requires an existing git repository.");
  }
}

function renderManagedBlock(content) {
  return `${MANAGED_BLOCK_START}\n${content.trim()}\n${MANAGED_BLOCK_END}`;
}

function upsertManagedBlock(existing, block) {
  const startIndex = existing.indexOf(MANAGED_BLOCK_START);
  const endIndex = existing.indexOf(MANAGED_BLOCK_END);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = existing.slice(0, startIndex).trimEnd();
    const after = existing.slice(endIndex + MANAGED_BLOCK_END.length).trimStart();

    if (before && after) {
      return `${before}\n\n${block}\n\n${after}\n`;
    }
    if (before) {
      return `${before}\n\n${block}\n`;
    }
    if (after) {
      return `${block}\n\n${after}\n`;
    }
    return `${block}\n`;
  }

  const trimmed = existing.trimEnd();
  if (!trimmed) {
    return `${block}\n`;
  }

  return `${trimmed}\n\n${block}\n`;
}

function toRelative(repoRoot, targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

function recordAction(actions, kind, target) {
  actions.push({ kind, target });
}

async function copyFile(sourcePath, targetPath, { overwrite = true, dryRun = false, actions, repoRoot }) {
  const relativePath = toRelative(repoRoot, targetPath);
  const exists = await pathExists(targetPath);

  if (!overwrite && exists) {
    recordAction(actions, "skip", relativePath);
    return;
  }

  recordAction(actions, exists ? "overwrite" : "create", relativePath);

  if (dryRun) {
    return;
  }

  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

async function copyDir(sourceDir, targetDir, { overwrite = true, dryRun = false, actions, repoRoot }) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (COPY_IGNORE.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath, { overwrite, dryRun, actions, repoRoot });
      continue;
    }

    await copyFile(sourcePath, targetPath, { overwrite, dryRun, actions, repoRoot });
  }
}

async function copySkills(repoRoot, { dryRun, actions }) {
  await copyDir(sourceSkillsRoot, path.join(repoRoot, ".agents", "skills", TEMPLATE_NAMESPACE), {
    overwrite: true,
    dryRun,
    actions,
    repoRoot
  });
}

async function copyDocs(repoRoot, { dryRun, actions }) {
  for (const relativePath of TEMPLATE_DOCS) {
    await copyFile(path.join(sourceRepoRoot, relativePath), path.join(repoRoot, relativePath), {
      overwrite: true,
      dryRun,
      actions,
      repoRoot
    });
  }
}

async function writeTemplateReadme(repoRoot, { dryRun, actions }) {
  await copyFile(
    path.join(sourceTemplateRoot, "README.md"),
    path.join(repoRoot, "README.md"),
    {
      overwrite: false,
      dryRun,
      actions,
      repoRoot
    }
  );
}

async function writeAgentsFile(repoRoot, { dryRun, actions }) {
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  const templateAgents = await readText(path.join(sourceTemplateRoot, "AGENTS.md"));

  if (!(await pathExists(agentsPath))) {
    recordAction(actions, "create", "AGENTS.md");
    if (!dryRun) {
      await writeText(agentsPath, templateAgents);
    }
    return;
  }

  const existing = await readText(agentsPath, "");
  if (existing.trim() === templateAgents.trim()) {
    recordAction(actions, "skip", "AGENTS.md");
    return;
  }

  const blockContent = await readText(path.join(sourceTemplateRoot, "AGENTS-BLOCK.md"));
  const next = upsertManagedBlock(existing, renderManagedBlock(blockContent));

  if (next === existing) {
    recordAction(actions, "skip", "AGENTS.md");
    return;
  }

  recordAction(actions, "upsert", "AGENTS.md");
  if (!dryRun) {
    await writeText(agentsPath, next);
  }
}

async function recordUpgradeSkips(repoRoot, actions) {
  recordAction(actions, "skip", "README.md");

  const configPath = path.join(repoRoot, ".codex", "config.toml");
  const codexArtifactsPath = path.join(repoRoot, "docs", "_codex");

  if (await pathExists(configPath)) {
    recordAction(actions, "skip", ".codex/config.toml");
  }

  if (await pathExists(codexArtifactsPath)) {
    recordAction(actions, "skip", "docs/_codex/");
  }
}

export async function bootstrapTemplateRepo({
  repoRoot,
  template = "existing",
  upgrade = false,
  dryRun = false
}) {
  if (!TEMPLATE_TYPES.includes(template)) {
    throw new Error(`Unsupported template: ${template}`);
  }

  if (upgrade && template !== "existing") {
    throw new Error("Upgrade mode only supports --template existing.");
  }

  const mainBranch = "main";
  let initializedGit = false;
  const actions = [];

  if (upgrade) {
    await requireExistingGitRepository(repoRoot);
    await recordUpgradeSkips(repoRoot, actions);
  } else {
    if (!dryRun) {
      await ensureDir(repoRoot);
      initializedGit = await ensureGitRepository(repoRoot, mainBranch);
    }
  }

  if (upgrade) {
    // README.md is repo-owned during upgrade, so do not create or modify it.
  } else {
    await writeTemplateReadme(repoRoot, { dryRun, actions });
  }

  await writeAgentsFile(repoRoot, { dryRun, actions });
  await copyDocs(repoRoot, { dryRun, actions });
  await copySkills(repoRoot, { dryRun, actions });

  return {
    repoRoot,
    template,
    initializedGit,
    mode: upgrade ? "upgrade" : "install",
    dryRun,
    actions
  };
}