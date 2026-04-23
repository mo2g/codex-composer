import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { TEMPLATE_NAMESPACE } from "../tools/lib/template-contract.mjs";
import { createExistingRepo, readText, runInstall } from "./helpers/repo.mjs";

function skillAsset(skill, filename) {
  return path.join(
    ".agents",
    "skills",
    TEMPLATE_NAMESPACE,
    skill,
    filename
  );
}

test("install.sh copies task-card, journal, and evidence templates into installed skill folders", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "npm" });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const plannerTemplatePath = path.join(targetRepo, skillAsset("planner", "TASK-CARD-TEMPLATE.md"));
  const journalTemplatePath = path.join(targetRepo, skillAsset("resume-work", "TASK-JOURNAL-TEMPLATE.md"));
  const evidenceTemplatePath = path.join(targetRepo, skillAsset("change-check", "ACCEPTANCE-EVIDENCE-TEMPLATE.md"));
  const epicTemplatePath = path.join(targetRepo, skillAsset("planner", "EPIC-CARD-TEMPLATE.md"));
  const blockerTemplatePath = path.join(targetRepo, skillAsset("planner", "BLOCKER-TEMPLATE.md"));
  const orchestratorSkillPath = path.join(targetRepo, skillAsset("task-orchestrator", "SKILL.md"));
  const stateMachinePath = path.join(targetRepo, skillAsset("task-orchestrator", "STATE-MACHINE.md"));

  const plannerTemplate = await readText(plannerTemplatePath);
  const journalTemplate = await readText(journalTemplatePath);
  const evidenceTemplate = await readText(evidenceTemplatePath);
  const epicTemplate = await readText(epicTemplatePath);
  const blockerTemplate = await readText(blockerTemplatePath);
  const orchestratorSkill = await readText(orchestratorSkillPath);
  const stateMachine = await readText(stateMachinePath);

  // Task Card Template: required sections for executable workflow
  assert.match(plannerTemplate, /reviewable change/);
  assert.match(plannerTemplate, /- Mode: implementation \| debug/);
  assert.match(plannerTemplate, /- Root-cause status: n\/a \| unconfirmed \| confirmed/);
  assert.match(plannerTemplate, /## Acceptance criteria/);
  assert.match(plannerTemplate, /## Verification commands/);
  assert.match(plannerTemplate, /## Done criteria/);
  assert.match(plannerTemplate, /## Review expectations/);

  // Plan mode fields in Task Card
  assert.match(plannerTemplate, /Task ID:/);
  assert.match(plannerTemplate, /Task Type:/);
  assert.match(plannerTemplate, /Dependencies:/);
  assert.match(plannerTemplate, /Complexity Score:/);
  assert.match(plannerTemplate, /Failure Budget:/);
  assert.match(plannerTemplate, /Max attempts:/);
  assert.match(plannerTemplate, /Structure Impact:/);

  // Unified state enumeration must include all states
  assert.match(plannerTemplate, /planned.*in-progress.*verifying.*blocked-needs-user.*blocked-needs-evidence.*replanning.*done.*abandoned/);

  // Task Journal Template: required sections for resumability
  assert.match(journalTemplate, /source of truth/);
  assert.match(journalTemplate, /- Root-cause status: <n\/a \| unconfirmed \| confirmed>/);
  assert.match(journalTemplate, /## Drift check/);
  assert.match(journalTemplate, /## Attempts/);
  assert.match(journalTemplate, /## Evidence Gained/);
  assert.match(journalTemplate, /## Next smallest step/);
  assert.match(journalTemplate, /Recovery priority/);
  assert.match(journalTemplate, /Required fields for long-running work resumability/);

  // Acceptance Evidence Template: required sections
  assert.match(evidenceTemplate, /acceptance criteria/);
  assert.match(evidenceTemplate, /## Debug closure \(debug tasks only\)/);
  assert.match(evidenceTemplate, /## Criteria map/);
  assert.match(evidenceTemplate, /## Structural Checks/);

  // Epic Card Template: required sections for plan mode
  assert.match(epicTemplate, /Epic Card/);
  assert.match(epicTemplate, /## Task List/);
  assert.match(epicTemplate, /## Dependency Graph/);
  assert.match(epicTemplate, /## Progress Summary/);
  assert.match(epicTemplate, /## Epic done criteria/);
  assert.match(epicTemplate, /planned.*in-progress.*verifying.*blocked-needs-user.*blocked-needs-evidence.*replanning.*done.*abandoned/);

  // Blocker Template: required sections
  assert.match(blockerTemplate, /Blocker/);
  assert.match(blockerTemplate, /## Missing Information/);
  assert.match(blockerTemplate, /## Required User Input/);
  assert.match(blockerTemplate, /## Attempt History/);

  // Task Orchestrator Skill: required capabilities
  assert.match(orchestratorSkill, /task-orchestrator/);
  assert.match(orchestratorSkill, /single entry point/);
  assert.match(orchestratorSkill, /hard constraints/);
  assert.match(orchestratorSkill, /Phase 1: Load and validate state/);
  assert.match(orchestratorSkill, /Phase 4: Select and dispatch/);

  // State Machine: complete state definitions
  assert.match(stateMachine, /State Machine/);
  assert.match(stateMachine, /blocked-needs-user/);
  assert.match(stateMachine, /blocked-needs-evidence/);
  assert.match(stateMachine, /replanning/);
  assert.match(stateMachine, /planned.*in-progress.*verifying.*done/);
  assert.match(stateMachine, /State transitions \(orchestrator-enforced\)/);
});
