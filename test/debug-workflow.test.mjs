import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { TEMPLATE_DOCS } from "../tools/lib/template-contract.mjs";
import { createExistingRepo, readText, runInstall } from "./helpers/repo.mjs";

test("install.sh copies debug workflow assets", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "npm" });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const skill = await readText(path.join(targetRepo, ".agents", "skills", "codex-template", "debug-investigation", "SKILL.md"));
  const template = await readText(path.join(targetRepo, ".agents", "skills", "codex-template", "debug-investigation", "DEBUG-TEMPLATE.md"));
  const doc = await readText(path.join(targetRepo, "docs", "codex-debug-workflow.md"));

  assert.match(skill, /hypotheses/);
  assert.match(template, /Hypothesis table/);
  assert.match(doc, /Codex Debug Workflow/);
  assert.ok(TEMPLATE_DOCS.includes("docs/codex-debug-workflow.md"));
});
