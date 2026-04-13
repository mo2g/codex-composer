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

  const plannerTemplate = await readText(plannerTemplatePath);
  const journalTemplate = await readText(journalTemplatePath);
  const evidenceTemplate = await readText(evidenceTemplatePath);

  assert.match(plannerTemplate, /One Task Card should represent one reviewable change\./);
  assert.match(plannerTemplate, /## Acceptance criteria/);

  assert.match(journalTemplate, /Treat the code and diff as source of truth/);
  assert.match(journalTemplate, /## Drift check/);

  assert.match(evidenceTemplate, /Map evidence to acceptance criteria directly\./);
  assert.match(evidenceTemplate, /## Criteria map/);
});
