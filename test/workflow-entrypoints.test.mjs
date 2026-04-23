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

function assertIncludesAll(content, patterns) {
  for (const pattern of patterns) {
    assert.match(content, pattern);
  }
}

test("install.sh copies default workflow entry and external memory contract", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "npm" });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const workflow = await readText(path.join(targetRepo, skillFile("WORKFLOW.md")));
  const memory = await readText(path.join(targetRepo, skillFile("EXTERNAL-MEMORY.md")));

  assertIncludesAll(workflow, [
    /Default Task-Card Workflow/,
    /docs\/codex-task-card-workflow\.md/,
    /docs\/codex-debug-workflow\.md/,
    /\.codex\/codex-composer\/<task-slug>\//,
    /planner\/TASK-CARD-TEMPLATE\.md/,
    /minimal experiment mode/,
    /`debug-investigation`/,
    /acceptance-evidence\.md/
  ]);

  assertIncludesAll(memory, [
    /Code truth beats note truth\./,
    /task-card\.md/,
    /journal\.md/,
    /acceptance-evidence\.md/,
    /debug\.md/,
    /root-cause status when debug mode is active/,
    /recover from repository artifacts first/
  ]);
});
