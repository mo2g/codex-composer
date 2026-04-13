import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { TEMPLATE_NAMESPACE } from "../tools/lib/template-contract.mjs";
import { createExistingRepo, readText, runInstall } from "./helpers/repo.mjs";

function skillFile(...parts) {
  return path.join(
    ".agents",
    "skills",
    TEMPLATE_NAMESPACE,
    ...parts
  );
}

test("install.sh copies default workflow entry and external memory contract", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "npm" });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const workflow = await readText(path.join(targetRepo, skillFile("WORKFLOW.md")));
  const memory = await readText(path.join(targetRepo, skillFile("EXTERNAL-MEMORY.md")));

  assert.match(workflow, /Default Task-Card Workflow/);
  assert.match(workflow, /docs\/_codex\/<task-slug>\//);
  assert.match(workflow, /Do not begin implementation until the Task Card is bounded\./);

  assert.match(memory, /Code truth beats note truth\./);
  assert.match(memory, /recover from repository artifacts first/);
  assert.match(memory, /without rereading the entire Codex conversation\./);
});
