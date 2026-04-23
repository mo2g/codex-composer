import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEMPLATE_NAMESPACE } from "../tools/lib/template-contract.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readText(filePath) {
  return await fs.readFile(filePath, "utf-8");
}

function skillAsset(skill, filename) {
  return path.join(".agents", "skills", TEMPLATE_NAMESPACE, skill, filename);
}

// Task states enum - single source of truth
test("task state enum includes all required states", async () => {
  const stateMachinePath = path.join(repoRoot, skillAsset("task-orchestrator", "STATE-MACHINE.md"));
  const stateMachine = await readText(stateMachinePath);
  const taskCardTemplatePath = path.join(repoRoot, skillAsset("planner", "TASK-CARD-TEMPLATE.md"));
  const taskCardTemplate = await readText(taskCardTemplatePath);

  const requiredStates = [
    "planned",
    "in-progress",
    "verifying",
    "done",
    "abandoned",
    "blocked-needs-user",
    "blocked-needs-evidence",
    "replanning"
  ];

  // All states must appear in STATE-MACHINE.md
  for (const state of requiredStates) {
    assert.match(stateMachine, new RegExp(state), `State ${state} must be defined in STATE-MACHINE.md`);
  }

  // Task Card template must include the full state enum
  assert.match(
    taskCardTemplate,
    /Status:.*planned.*in-progress.*verifying.*blocked-needs-user.*blocked-needs-evidence.*replanning.*done.*abandoned/,
    "Task Card template must include complete state enum"
  );
});

// Task Card required fields - schema invariant
test("Task Card template includes all required fields", async () => {
  const taskCardTemplatePath = path.join(repoRoot, skillAsset("planner", "TASK-CARD-TEMPLATE.md"));
  const template = await readText(taskCardTemplatePath);

  // Core required fields
  const requiredFields = [
    { pattern: /Status:/, name: "Status" },
    { pattern: /Mode:.*implementation.*debug/, name: "Mode (implementation|debug)" },
    { pattern: /Required artifacts:/, name: "Required artifacts" },
    { pattern: /Root-cause status:.*n\/a.*unconfirmed.*confirmed/, name: "Root-cause status enum" },
    { pattern: /## Acceptance criteria/, name: "Acceptance criteria section" },
    { pattern: /## Verification commands/, name: "Verification commands section" },
    { pattern: /## Done criteria/, name: "Done criteria section" },
    { pattern: /## Review expectations/, name: "Review expectations section" }
  ];

  for (const field of requiredFields) {
    assert.match(template, field.pattern, `Task Card template must include ${field.name}`);
  }
});

// Plan mode Task Card extended fields
test("Task Card template includes plan mode required fields", async () => {
  const taskCardTemplatePath = path.join(repoRoot, skillAsset("planner", "TASK-CARD-TEMPLATE.md"));
  const template = await readText(taskCardTemplatePath);

  const planModeFields = [
    { pattern: /Task ID:/, name: "Task ID" },
    { pattern: /Task Type:.*decision.*execution.*verification/, name: "Task Type enum" },
    { pattern: /Dependencies:/, name: "Dependencies" },
    { pattern: /Complexity Score:.*1-10/, name: "Complexity Score" },
    { pattern: /Model Class:.*cheap.*standard.*strong/, name: "Model Class enum" },
    { pattern: /Failure Budget:/, name: "Failure Budget" },
    { pattern: /Max attempts:/, name: "Max attempts" },
    { pattern: /Structure Impact:/, name: "Structure Impact" }
  ];

  for (const field of planModeFields) {
    assert.match(template, field.pattern, `Task Card template must include ${field.name} for plan mode`);
  }
});

// Epic Card required fields - schema invariant
test("Epic Card template includes all required fields", async () => {
  const epicTemplatePath = path.join(repoRoot, skillAsset("planner", "EPIC-CARD-TEMPLATE.md"));
  const template = await readText(epicTemplatePath);

  const requiredFields = [
    { pattern: /Status:.*planned.*in-progress/, name: "Status with plan mode states" },
    { pattern: /## Goal/, name: "Goal section" },
    { pattern: /## Non-goals/, name: "Non-goals section" },
    { pattern: /## Scope/, name: "Scope section" },
    { pattern: /## Task List/, name: "Task List section" },
    { pattern: /## Dependency Graph/, name: "Dependency Graph section" },
    { pattern: /## Progress Summary/, name: "Progress Summary section" },
    { pattern: /## Epic done criteria/, name: "Epic done criteria section" }
  ];

  for (const field of requiredFields) {
    assert.match(template, field.pattern, `Epic Card template must include ${field.name}`);
  }
});

// Blocker schema essentials
test("Blocker template includes required schema fields", async () => {
  const blockerTemplatePath = path.join(repoRoot, skillAsset("planner", "BLOCKER-TEMPLATE.md"));
  const template = await readText(blockerTemplatePath);

  const requiredFields = [
    { pattern: /# Blocker:/, name: "Blocker header" },
    { pattern: /Related Task:/, name: "Related Task" },
    { pattern: /Type:.*missing-spec.*missing-repro/, name: "Blocker Type enum" },
    { pattern: /Severity:.*blocking.*warning/, name: "Severity enum" },
    { pattern: /## Missing Information/, name: "Missing Information section" },
    { pattern: /## Required User Input/, name: "Required User Input section" },
    { pattern: /## Attempt History/, name: "Attempt History section" },
    { pattern: /## Risk If Ignored/, name: "Risk If Ignored section" }
  ];

  for (const field of requiredFields) {
    assert.match(template, field.pattern, `Blocker template must include ${field.name}`);
  }
});

// Canonical ownership - single source of truth
test("docs/workflow-sync-rules.md is canonical for source-of-truth ordering", async () => {
  const syncRulesPath = path.join(repoRoot, "docs", "workflow-sync-rules.md");
  const syncRules = await readText(syncRulesPath);

  // Must have Canonical Ownership table
  assert.match(syncRules, /## Canonical Ownership/, "Must have Canonical Ownership section");
  assert.match(syncRules, /Rule\/Policy.*Canonical Home/, "Must define Rule/Policy -> Canonical Home mapping");

  // Key rules must be listed
  const keyRules = [
    "Workflow spec",
    "Debug mode",
    "Task states",
    "Source-of-truth order",
    "Entry path",
    "Verification"
  ];

  for (const rule of keyRules) {
    assert.match(syncRules, new RegExp(rule), `Must define canonical home for ${rule}`);
  }
});

// AGENTS.md and CODEX-COMPOSER.md must not duplicate canonical ownership table
test("AGENTS.md and CODEX-COMPOSER.md reference sync-rules instead of duplicating ordering", async () => {
  const rootAgents = await readText(path.join(repoRoot, "AGENTS.md"));
  const templateCodexComposer = await readText(path.join(repoRoot, "template", "CODEX-COMPOSER.md"));

  // Should reference workflow-sync-rules.md
  assert.match(rootAgents, /workflow-sync-rules/, "Root AGENTS.md must reference workflow-sync-rules.md");
  assert.match(templateCodexComposer, /workflow-sync-rules/, "Template CODEX-COMPOSER.md must reference workflow-sync-rules.md");

  // Should NOT contain the literal canonical ownership table rows
  // (enforcing single-location ownership)
  assert.doesNotMatch(
    rootAgents,
    /Workflow spec.*task-card-workflow.*Reference/,
    "Root AGENTS.md must not duplicate canonical ownership table"
  );
  assert.doesNotMatch(
    templateCodexComposer,
    /Workflow spec.*task-card-workflow.*Reference/,
    "Template CODEX-COMPOSER.md must not duplicate canonical ownership table"
  );
});

// Task Type enum completeness (plan mode)
test("Task Type enum includes all required types", async () => {
  const taskCardTemplatePath = path.join(repoRoot, skillAsset("planner", "TASK-CARD-TEMPLATE.md"));
  const template = await readText(taskCardTemplatePath);

  const requiredTypes = ["decision", "execution", "verification", "question", "investigation"];

  for (const type of requiredTypes) {
    assert.match(
      template,
      new RegExp(type),
      `Task Type enum must include ${type}`
    );
  }
});

// Model Class enum completeness
test("Model Class enum includes all required values", async () => {
  const taskCardTemplatePath = path.join(repoRoot, skillAsset("planner", "TASK-CARD-TEMPLATE.md"));
  const template = await readText(taskCardTemplatePath);

  const requiredClasses = ["cheap", "standard", "strong"];

  for (const cls of requiredClasses) {
    assert.match(
      template,
      new RegExp(cls),
      `Model Class enum must include ${cls}`
    );
  }
});
