import fs from "node:fs/promises";
import path from "node:path";
import { protocolRoot, git, runCommand } from "./runtime.mjs";
import { ensureDir, pathExists, readText, writeText } from "./fs.mjs";

const PROTOCOL_BUNDLE_ENTRIES = ["AGENTS.md", "prompts", "skills", "schemas", "scripts", "tools"];

function templateConfig(template, codexBinary) {
  if (template === "react-go-minimal") {
    return `[project]
main_branch = "main"
branch_prefix = "codex/"
repo_type = "react-go-minimal"

[codex]
binary = "${codexBinary}"
profile = "default"
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
branch_verify = ["echo \\"replace branch_verify in .codex-composer.toml\\""]
integration_verify = ["echo \\"replace integration_verify in .codex-composer.toml\\""]
main_verify = ["git rev-parse --verify HEAD >/dev/null"]

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
  }

  return `[project]
main_branch = "main"
branch_prefix = "codex/"
repo_type = "empty"

[codex]
binary = "${codexBinary}"
profile = "default"
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
branch_verify = ["echo \\"replace branch_verify in .codex-composer.toml\\""]
integration_verify = ["echo \\"replace integration_verify in .codex-composer.toml\\""]
main_verify = ["git rev-parse --verify HEAD >/dev/null"]
`;
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

async function ensureFileAbsent(targetPath) {
  if (await pathExists(targetPath)) {
    throw new Error(`Target already contains ${targetPath}; bootstrap expects a fresh path for protocol assets`);
  }
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

async function copyBundle(targetRoot) {
  for (const entry of PROTOCOL_BUNDLE_ENTRIES) {
    const sourcePath = path.join(protocolRoot, entry);
    const targetPath = path.join(targetRoot, entry);
    await ensureFileAbsent(targetPath);
    await fs.cp(sourcePath, targetPath, { recursive: true, force: false, errorOnExist: true });
  }
}

async function ensureExecutableBits(targetRoot) {
  const scriptsDir = path.join(targetRoot, "scripts");
  const toolsDir = path.join(targetRoot, "tools");
  const scriptEntries = await fs.readdir(scriptsDir);

  for (const entry of scriptEntries) {
    await fs.chmod(path.join(scriptsDir, entry), 0o755);
  }

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

export async function bootstrapProtocolRepo({ repoRoot, template = "empty", codexBinary = "codex" }) {
  if (!["empty", "react-go-minimal"].includes(template)) {
    throw new Error(`Unsupported template: ${template}`);
  }

  await ensureDir(repoRoot);
  const initializedGit = await ensureGitRepository(repoRoot, "main");

  await copyBundle(repoRoot);
  await ensureExecutableBits(repoRoot);

  const configPath = path.join(repoRoot, ".codex-composer.toml");
  if (await pathExists(configPath)) {
    throw new Error(`Target already contains ${configPath}`);
  }
  await writeText(configPath, templateConfig(template, codexBinary));
  await writeTemplateFiles(repoRoot, template);
  await ensureGitIgnoreEntry(repoRoot, ".codex-composer/");
  await ensureGitExcludeEntry(repoRoot, ".codex-composer/");

  return {
    repoRoot,
    template,
    initializedGit
  };
}
