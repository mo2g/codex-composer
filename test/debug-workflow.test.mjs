import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createExistingRepo, readText, runInstall } from "./helpers/repo.mjs";

test("install.sh copies debug workflow assets", async () => {
  const targetRepo = await createExistingRepo({ packageManager: "npm" });
  await runInstall(["--repo", targetRepo, "--template", "existing", "--source", path.resolve(".")]);

  const skill = await readText(path.join(targetRepo, ".agents", "skills", "codex-composer", "debug-investigation", "SKILL.md"));
  const implementer = await readText(path.join(targetRepo, ".agents", "skills", "codex-composer", "implementer", "SKILL.md"));
  const resumeWork = await readText(path.join(targetRepo, ".agents", "skills", "codex-composer", "resume-work", "SKILL.md"));
  const changeCheck = await readText(path.join(targetRepo, ".agents", "skills", "codex-composer", "change-check", "SKILL.md"));
  const template = await readText(path.join(targetRepo, ".agents", "skills", "codex-composer", "debug-investigation", "DEBUG-TEMPLATE.md"));

  assert.match(skill, /hypotheses/);
  assert.match(implementer, /root cause is still unconfirmed/);
  assert.match(resumeWork, /`debug\.md` when debug mode is active/);
  assert.match(changeCheck, /which hypothesis became the root cause/);
  assert.match(template, /Hypothesis table/);
  assert.match(template, /Confirmed root cause/);
});
