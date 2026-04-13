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
  assert.match(workflow, /docs\/codex-task-card-workflow\.md/);
  assert.match(workflow, /docs\/codex-debug-workflow\.md/);
  assert.match(workflow, /docs\/_codex\/<task-slug>\//);
  assert.match(workflow, /planner\/TASK-CARD-TEMPLATE\.md/);
  assert.match(workflow, /Do not begin implementation until the Task Card is bounded\./);
  assert.match(workflow, /stay in minimal experiment mode/);
  assert.match(workflow, /`debug-investigation`/);
  assert.match(workflow, /acceptance-evidence\.md/);
  assert.match(workflow, /debug-investigation\/DEBUG-TEMPLATE\.md/);

  assert.match(memory, /Code truth beats note truth\./);
  assert.match(memory, /task-card\.md/);
  assert.match(memory, /journal\.md/);
  assert.match(memory, /acceptance-evidence\.md/);
  assert.match(memory, /debug\.md/);
  assert.match(memory, /root-cause status when debug mode is active/);
  assert.match(memory, /recover from repository artifacts first/);
  assert.match(memory, /without rereading the full Codex conversation\./);
});
