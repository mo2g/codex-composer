import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const helperRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

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

export async function makeTempDir(prefix = "codex-app-template-test-") {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function setGitUser(repoRoot) {
  await run("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot });
  await run("git", ["config", "user.name", "Codex App Template Test"], { cwd: repoRoot });
}

export async function initGitRepo(repoRoot) {
  await run("git", ["init", "-b", "main"], { cwd: repoRoot });
  await setGitUser(repoRoot);
}

export async function initialCommit(repoRoot, message = "chore: initial commit") {
  await run("git", ["add", "."], { cwd: repoRoot });
  await run("git", ["commit", "-m", message], { cwd: repoRoot });
}

export async function createExistingRepo(options = {}) {
  const {
    packageManager = null,
    includeGo = false,
    includeRust = false,
    agentsContent = null
  } = options;

  const repoRoot = await makeTempDir("codex-app-template-existing-");
  await initGitRepo(repoRoot);

  await fs.writeFile(path.join(repoRoot, "README.md"), "# Existing Repo\n", "utf8");
  await fs.mkdir(path.join(repoRoot, "src"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "scripts"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "tools"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "src", "main.txt"), "existing value\n", "utf8");
  await fs.writeFile(path.join(repoRoot, "scripts", "existing.sh"), "#!/usr/bin/env bash\nexit 0\n", "utf8");
  await fs.writeFile(path.join(repoRoot, "tools", "existing.mjs"), "export const existing = true;\n", "utf8");

  if (agentsContent !== null) {
    await fs.writeFile(path.join(repoRoot, "AGENTS.md"), agentsContent, "utf8");
  }

  if (packageManager) {
    await fs.writeFile(
      path.join(repoRoot, "package.json"),
      JSON.stringify({
        name: "existing-repo",
        private: true,
        type: "module",
        scripts: {
          test: "node --test"
        }
      }, null, 2) + "\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(repoRoot, "app.test.mjs"),
      "import test from \"node:test\";\nimport assert from \"node:assert/strict\";\n\ntest(\"bootstrap\", () => {\n  assert.equal(1 + 1, 2);\n});\n",
      "utf8"
    );

    if (packageManager === "pnpm") {
      await fs.writeFile(path.join(repoRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    }

    if (packageManager === "yarn") {
      await fs.writeFile(path.join(repoRoot, "yarn.lock"), "# yarn lockfile v1\n", "utf8");
    }
  }

  if (includeGo) {
    await fs.writeFile(path.join(repoRoot, "go.mod"), "module example.com/existing\n\ngo 1.24.1\n", "utf8");
    await fs.writeFile(path.join(repoRoot, "main.go"), "package main\n\nfunc main() {}\n", "utf8");
  }

  if (includeRust) {
    await fs.writeFile(
      path.join(repoRoot, "Cargo.toml"),
      "[package]\nname = \"existing-repo\"\nversion = \"0.1.0\"\nedition = \"2024\"\n\n[dependencies]\n",
      "utf8"
    );
    await fs.mkdir(path.join(repoRoot, "src"), { recursive: true });
    await fs.writeFile(path.join(repoRoot, "src", "lib.rs"), "pub fn value() -> i32 { 1 }\n", "utf8");
  }

  await initialCommit(repoRoot);
  return repoRoot;
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

export async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}
