#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

function getCommand(argv) {
  return argv.find((token) => ["exec", "resume", "fork"].includes(token)) ?? null;
}

function getOption(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return argv[index + 1] ?? null;
}

async function ensureSessionIndex() {
  const codexDir = path.join(os.homedir(), ".codex");
  await fs.mkdir(codexDir, { recursive: true });
  return path.join(codexDir, "session_index.jsonl");
}

async function appendSession(threadName) {
  const sessionIndexPath = await ensureSessionIndex();
  const record = {
    id: crypto.randomUUID(),
    thread_name: threadName.slice(0, 120),
    updated_at: new Date().toISOString()
  };
  await fs.appendFile(sessionIndexPath, `${JSON.stringify(record)}\n`, "utf8");
}

function parallelPlan() {
  return {
    summary: "Split frontend login UI and backend auth API into A/B branches.",
    recommended_mode: "parallel_ab",
    alternative_modes: ["serial"],
    tasks: [
      {
        id: "a",
        title: "Build the frontend login flow",
        goal: "Implement the React login UI and request wiring.",
        include: ["frontend/**"],
        exclude: ["backend/**"],
        deliverables: ["frontend/src/LoginPage.jsx", "frontend/src/api.js"],
        risks: ["Keep the API contract aligned with backend assumptions."],
        needs_dialogue: false
      },
      {
        id: "b",
        title: "Build the backend auth flow",
        goal: "Implement the Go login API and token issuance.",
        include: ["backend/**"],
        exclude: ["frontend/**"],
        deliverables: ["backend/internal/auth/token.go", "backend/cmd/server/main.go"],
        risks: ["JWT shape must remain compatible with the frontend contract."],
        needs_dialogue: false
      }
    ],
    task_boundaries: {
      a: {
        include: ["frontend/**"],
        exclude: ["backend/**"]
      },
      b: {
        include: ["backend/**"],
        exclude: ["frontend/**"]
      }
    },
    conflict_reasons: [],
    questions_for_user: ["Is the token format JWT or opaque session-based?"],
    verification_targets: {
      a: ["branch_verify"],
      b: ["branch_verify"],
      ab: ["integration_verify"],
      main: ["main_verify"]
    },
    needs_dialogue: {
      control: true,
      a: false,
      b: false,
      ab: true
    }
  };
}

function coreConflictPlan() {
  return {
    summary: "Both tasks want to change the auth core from different angles.",
    recommended_mode: "parallel_ab",
    alternative_modes: ["serial"],
    tasks: [
      {
        id: "a",
        title: "Refactor auth core interfaces",
        goal: "Change shared token generation internals.",
        include: ["backend/internal/auth/**"],
        exclude: [],
        deliverables: ["backend/internal/auth/token.go"],
        risks: ["Touches auth-core."],
        needs_dialogue: false
      },
      {
        id: "b",
        title: "Add legacy token compatibility",
        goal: "Adjust the same auth core for legacy token compatibility.",
        include: ["backend/internal/auth/**"],
        exclude: [],
        deliverables: ["backend/internal/auth/token.go"],
        risks: ["Touches auth-core."],
        needs_dialogue: false
      }
    ],
    task_boundaries: {
      a: {
        include: ["backend/internal/auth/**"],
        exclude: []
      },
      b: {
        include: ["backend/internal/auth/**"],
        exclude: []
      }
    },
    conflict_reasons: ["Both tasks edit auth-core."],
    questions_for_user: ["Should this work be serialized?"],
    verification_targets: {
      a: ["branch_verify"],
      b: ["branch_verify"],
      ab: ["integration_verify"],
      main: ["main_verify"]
    },
    needs_dialogue: {
      control: true,
      a: false,
      b: false,
      ab: true
    }
  };
}

function invalidPlan() {
  return {
    summary: "Broken plan",
    recommended_mode: "parallel_ab",
    tasks: []
  };
}

function planForScenario() {
  const scenario = process.env.FAKE_CODEX_PLAN_SCENARIO ?? "parallel";
  if (scenario === "core_conflict") {
    return coreConflictPlan();
  }
  if (scenario === "invalid") {
    return invalidPlan();
  }
  return parallelPlan();
}

async function runExec(argv) {
  const outputPath = getOption(argv, "--output-last-message");
  const prompt = argv[argv.length - 1] ?? "";

  if (process.env.FAKE_CODEX_EXEC_ERROR) {
    console.error(process.env.FAKE_CODEX_EXEC_ERROR);
    process.exit(2);
  }

  if (prompt.includes("Generate Codex Composer Plan") || prompt.includes("plan-request.md")) {
    if (!outputPath) {
      throw new Error("--output-last-message is required for plan execution");
    }
    await fs.writeFile(outputPath, `${JSON.stringify(planForScenario(), null, 2)}\n`, "utf8");
    process.stdout.write("{\"event\":\"plan-generated\"}\n");
    return;
  }

  let taskId = "a";
  if (/task b/i.test(prompt)) {
    taskId = "b";
  }

  if (taskId === "a") {
    await fs.mkdir(path.join(process.cwd(), "frontend", "src"), { recursive: true });
    await fs.writeFile(
      path.join(process.cwd(), "frontend", "src", "LoginPage.jsx"),
      `export function LoginPage() {
  return (
    <main>
      <h1>Sign in</h1>
      <form>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" />
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}
`,
      "utf8"
    );
    await fs.writeFile(
      path.join(process.cwd(), "frontend", "src", "api.js"),
      `export async function login(payload) {
  return { ok: true, token: "demo-token", payload };
}
`,
      "utf8"
    );
  } else {
    await fs.mkdir(path.join(process.cwd(), "backend", "internal", "auth"), { recursive: true });
    await fs.mkdir(path.join(process.cwd(), "backend", "cmd", "server"), { recursive: true });
    await fs.writeFile(
      path.join(process.cwd(), "backend", "internal", "auth", "token.go"),
      `package auth

func IssueToken(userID string) string {
\treturn "demo-token-" + userID
}
`,
      "utf8"
    );
    await fs.writeFile(
      path.join(process.cwd(), "backend", "cmd", "server", "main.go"),
      `package main

import "fmt"

func main() {
\tfmt.Println("login server ready")
}
`,
      "utf8"
    );
  }

  if (outputPath) {
    await fs.writeFile(outputPath, `task ${taskId} complete\n`, "utf8");
  }
  process.stdout.write("{\"event\":\"task-complete\"}\n");
}

async function runInteractive(argv, command) {
  if (command === "resume") {
    return;
  }

  const prompt = argv[argv.length - 1] ?? "";
  await appendSession(prompt);
}

const argv = process.argv.slice(2);
const command = getCommand(argv);

try {
  if (command === "exec") {
    await runExec(argv);
  } else {
    await runInteractive(argv, command);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
