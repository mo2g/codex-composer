import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const helperRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fakeCodexPath = path.join(helperRoot, "fixtures", "fake-codex.mjs");

function run(command, args, options = {}) {
  const {
    cwd = helperRoot,
    env = process.env,
    allowFailure = false
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
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

export async function makeTempDir(prefix = "codex-composer-test-") {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function initGitRepo(repoRoot) {
  await run("git", ["init", "-b", "main"], { cwd: repoRoot });
  await setGitUser(repoRoot);
}

export async function setGitUser(repoRoot) {
  await run("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot });
  await run("git", ["config", "user.name", "Codex Composer Test"], { cwd: repoRoot });
}

export async function writeDefaultRepoFiles(repoRoot, { includeAuthCore = true } = {}) {
  await fs.mkdir(path.join(repoRoot, "frontend", "src"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "backend", "cmd", "server"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "backend", "internal", "auth"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "frontend", "src", "LoginPage.jsx"), "export const LoginPage = () => null;\n", "utf8");
  await fs.writeFile(path.join(repoRoot, "backend", "cmd", "server", "main.go"), "package main\nfunc main() {}\n", "utf8");
  if (includeAuthCore) {
    await fs.writeFile(path.join(repoRoot, "backend", "internal", "auth", "token.go"), "package auth\nfunc IssueToken() string { return \"x\" }\n", "utf8");
  }
}

export async function writeConfig(repoRoot, options = {}) {
  const { layout = "canonical" } = options;
  const config = `[project]
main_branch = "main"
branch_prefix = "codex/"
repo_type = "test"

[codex]
binary = "${fakeCodexPath}"
sandbox = "workspace-write"
approval_policy = "on-request"

[planner]
max_parallel = 2
require_plan_approval = true
require_integrate_approval = true

[budget]
max_codex_runs = 5
allow_auto_replan = false

[hooks]
branch_verify = ["git diff --quiet HEAD -- && { echo \\"No tracked changes to verify\\"; exit 1; } || true", "test -f backend/go.mod && (cd backend && go test ./...) || true"]
integration_verify = ["git rev-parse --verify HEAD >/dev/null", "test -f backend/go.mod && (cd backend && go test ./...) || true"]
main_verify = ["git rev-parse --verify HEAD >/dev/null", "test -f backend/go.mod && (cd backend && go test ./...) || true"]

[[path_rules]]
globs = ["frontend/**"]
component = "frontend"
conflict_group = "frontend"
core = false

[[path_rules]]
globs = ["backend/**"]
component = "backend"
conflict_group = "backend"
core = false

[[path_rules]]
globs = ["backend/internal/auth/**"]
component = "auth-core"
conflict_group = "auth-core"
core = true

[[parallel_rules]]
action = "deny"
when_component = "auth-core"
reason = "auth-core work must be serialized."
`;
  let configPath;
  let gitIgnoreEntries;

  if (layout === "canonical") {
    configPath = path.join(repoRoot, ".codex", "local", "config.toml");
    gitIgnoreEntries = [".codex/local/runs/", ".codex/local/worktrees/"];
  } else if (layout === "legacy") {
    configPath = path.join(repoRoot, ".codex-composer", "config.toml");
    gitIgnoreEntries = [".codex-composer/runs/", ".codex-composer/worktrees/"];
  } else if (layout === "legacy-root") {
    configPath = path.join(repoRoot, ".codex-composer.toml");
    gitIgnoreEntries = [".codex-composer/runs/", ".codex-composer/worktrees/"];
  } else {
    throw new Error(`Unsupported config layout: ${layout}`);
  }

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, config, "utf8");
  await fs.writeFile(path.join(repoRoot, ".gitignore"), `${gitIgnoreEntries.join("\n")}\n`, "utf8");
}

export async function initialCommit(repoRoot) {
  await run("git", ["add", "."], { cwd: repoRoot });
  await run("git", ["commit", "-m", "chore: initial commit"], { cwd: repoRoot });
}

export async function commitAll(repoRoot, message = "chore: bootstrap codex composer") {
  await run("git", ["add", "."], { cwd: repoRoot });
  await run("git", ["commit", "-m", message], { cwd: repoRoot });
}

export async function createTestRepo() {
  const repoRoot = await makeTempDir();
  await initGitRepo(repoRoot);
  await writeDefaultRepoFiles(repoRoot);
  await writeConfig(repoRoot);
  await initialCommit(repoRoot);
  return repoRoot;
}

export async function createExistingRepo() {
  const repoRoot = await makeTempDir("codex-composer-existing-");
  await initGitRepo(repoRoot);
  await writeDefaultRepoFiles(repoRoot);
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Existing Repo\n", "utf8");
  await fs.mkdir(path.join(repoRoot, "scripts"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "tools"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "scripts", "existing.sh"), "#!/usr/bin/env bash\nexit 0\n", "utf8");
  await fs.writeFile(path.join(repoRoot, "tools", "existing.mjs"), "export const existing = true;\n", "utf8");
  await initialCommit(repoRoot);
  return repoRoot;
}

export async function runScript(scriptName, args, options = {}) {
  const env = {
    ...process.env,
    ...options.env
  };
  return run(path.join(helperRoot, "scripts", scriptName), args, {
    cwd: helperRoot,
    env,
    allowFailure: options.allowFailure ?? false
  });
}

export async function runTool(args, options = {}) {
  const env = {
    ...process.env,
    ...options.env
  };
  return run("node", [path.join(helperRoot, "tools", "composer.mjs"), ...args], {
    cwd: helperRoot,
    env,
    allowFailure: options.allowFailure ?? false
  });
}

export async function runInstall(args, options = {}) {
  const env = {
    ...process.env,
    ...options.env
  };
  return run("bash", [path.join(helperRoot, "install.sh"), ...args], {
    cwd: helperRoot,
    env,
    allowFailure: options.allowFailure ?? false
  });
}

export async function runGit(repoRoot, args, options = {}) {
  const env = {
    ...process.env,
    ...options.env
  };
  return run("git", args, {
    cwd: repoRoot,
    env,
    allowFailure: options.allowFailure ?? false
  });
}

export async function runRepoScript(repoRoot, scriptName, args, options = {}) {
  const env = {
    ...process.env,
    ...options.env
  };
  return run(path.join(repoRoot, "scripts", scriptName), args, {
    cwd: repoRoot,
    env,
    allowFailure: options.allowFailure ?? false
  });
}

export async function runRepoTool(repoRoot, args, options = {}) {
  const env = {
    ...process.env,
    ...options.env
  };
  return run("node", [path.join(repoRoot, "tools", "composer.mjs"), ...args], {
    cwd: repoRoot,
    env,
    allowFailure: options.allowFailure ?? false
  });
}

export async function runRepoLauncher(repoRoot, args, options = {}) {
  const env = {
    ...process.env,
    ...options.env
  };
  const launcherPath = await fs.access(path.join(repoRoot, "codex-composer")).then(() => path.join(repoRoot, "codex-composer")).catch(async () => {
    await fs.access(path.join(repoRoot, "composer-next"));
    return path.join(repoRoot, "composer-next");
  });

  return run(launcherPath, args, {
    cwd: repoRoot,
    env,
    allowFailure: options.allowFailure ?? false
  });
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}
