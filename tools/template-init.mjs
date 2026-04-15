#!/usr/bin/env node

import path from "node:path";
import { bootstrapTemplateRepo } from "./lib/bootstrap.mjs";

function parseArgs(argv) {
  const result = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      result._.push(token);
      continue;
    }

    const key = token.slice(2).replace(/-/g, "_");
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }

    result[key] = next;
    index += 1;
  }

  return result;
}

function requireArg(args, key) {
  if (!args[key]) {
    throw new Error(`Missing required argument --${key.replace(/_/g, "-")}`);
  }
  return args[key];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (command !== "init-repo") {
    throw new Error("Only `init-repo` is supported in this template source repository.");
  }

  const repoRoot = path.resolve(requireArg(args, "repo"));
  const template = args.template ?? "existing";
  const upgrade = args.upgrade === true;
  const dryRun = args.dry_run === true;

  const result = await bootstrapTemplateRepo({
    repoRoot,
    template,
    upgrade,
    dryRun
  });

  process.stdout.write(
    [
      `repo_root=${result.repoRoot}`,
      `initialized_git=${result.initializedGit}`,
      `template=${result.template}`,
      `mode=${result.mode}`,
      `dry_run=${result.dryRun}`
    ].join("\n")
  );
  process.stdout.write("\n");

  for (const action of result.actions) {
    process.stdout.write(`action=${action.kind} ${action.target}\n`);
  }
}

await main();