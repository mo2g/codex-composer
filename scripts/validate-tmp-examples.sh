#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="/tmp/codex-composer"
EMPTY_REPO="$BASE_DIR/empty-login"
REACT_REPO="$BASE_DIR/react-go-login"
EMPTY_HOME="$BASE_DIR/home-empty"
REACT_HOME="$BASE_DIR/home-react"
REQUIREMENT="做一个前后端分离的项目，前端用react，后端用golang,实现登录模块"
FAKE_CODEX="$ROOT_DIR/fixtures/fake-codex.mjs"

ensure_absent() {
  local target="$1"
  if [ -e "$target" ]; then
    echo "Refusing to overwrite existing path: $target" >&2
    exit 1
  fi
}

write_fake_config() {
  local repo_root="$1"
  cat > "$repo_root/.codex-composer.toml" <<EOF
[project]
main_branch = "main"
branch_prefix = "codex/"
repo_type = "validation"

[codex]
binary = "$FAKE_CODEX"
profile = "default"
sandbox = "workspace-write"
approval_policy = "on-request"

[planner]
max_parallel = 2
require_plan_approval = true
require_integrate_approval = true

[budget]
max_codex_runs = 5
allow_auto_replan = false

[hooks]
branch_verify = ["test -f task-a-output.txt || test -f task-b-output.txt"]
integration_verify = ["test -f task-a-output.txt && test -f task-b-output.txt"]
main_verify = ["git rev-parse --verify HEAD >/dev/null"]

[[path_rules]]
globs = ["frontend/**"]
component = "frontend"
conflict_group = "frontend"
core = false

[[path_rules]]
globs = ["backend/**"]
component = "backend"
conflict_group = "backend"
core = false

[[path_rules]]
globs = ["backend/internal/auth/**"]
component = "auth-core"
conflict_group = "auth-core"
core = true

[[parallel_rules]]
action = "deny"
when_component = "auth-core"
reason = "auth-core work must be serialized."
EOF
}

bootstrap_repo() {
  local repo_root="$1"
  local template="$2"
  local home_root="$3"

  ensure_absent "$repo_root"
  mkdir -p "$home_root/.codex"
  : > "$home_root/.codex/session_index.jsonl"

  "$ROOT_DIR/scripts/composer-init-repo.sh" --repo "$repo_root" --template "$template" >/dev/null
  write_fake_config "$repo_root"
  git -C "$repo_root" config user.email "validation@example.com"
  git -C "$repo_root" config user.name "Codex Composer Validation"
  git -C "$repo_root" add .
  git -C "$repo_root" commit -m "chore: bootstrap codex composer" >/dev/null
}

run_empty_validation() {
  bootstrap_repo "$EMPTY_REPO" "empty" "$EMPTY_HOME"

  (
    cd "$EMPTY_REPO"
    HOME="$EMPTY_HOME" ./scripts/composer-new-run.sh --run login --requirement "$REQUIREMENT" >/dev/null
    HOME="$EMPTY_HOME" ./scripts/composer-chat-control.sh --run login --checkpoint clarify >/dev/null
    node ./tools/composer.mjs checkpoint --run login --checkpoint clarify --decision clarified --note "No stable frontend/backend layout exists yet"
    ./scripts/composer-plan.sh --run login >/dev/null
  )

  node --input-type=module -e '
    import fs from "node:fs/promises";
    const plan = JSON.parse(await fs.readFile(process.argv[1], "utf8"));
    if (plan.recommended_mode !== "serial") {
      throw new Error(`empty-login expected serial, received ${plan.recommended_mode}`);
    }
    const reasons = plan.policy_evaluation?.reasons ?? [];
    if (!reasons.some((entry) => entry.includes("matched no repository files"))) {
      throw new Error("empty-login missing boundary-evidence downgrade reason");
    }
  ' "$EMPTY_REPO/.codex-composer/runs/login/plan.json"
}

run_react_validation() {
  bootstrap_repo "$REACT_REPO" "react-go-minimal" "$REACT_HOME"

  (
    cd "$REACT_REPO"
    HOME="$REACT_HOME" ./scripts/composer-new-run.sh --run login --requirement "$REQUIREMENT" >/dev/null
    HOME="$REACT_HOME" ./scripts/composer-chat-control.sh --run login --checkpoint clarify >/dev/null
    node ./tools/composer.mjs checkpoint --run login --checkpoint clarify --decision clarified --note "Frontend and backend scaffolds already exist"
    ./scripts/composer-plan.sh --run login >/dev/null
    HOME="$REACT_HOME" ./scripts/composer-chat-control.sh --run login --checkpoint plan-review >/dev/null
    node ./tools/composer.mjs checkpoint --run login --checkpoint plan-review --decision approve_parallel --mode parallel_ab
    ./scripts/composer-split.sh --run login >/dev/null
    ./scripts/composer-run-task.sh --run login --task a >/dev/null
    ./scripts/composer-run-task.sh --run login --task b >/dev/null
    ./scripts/composer-verify.sh --run login --target a >/dev/null
    ./scripts/composer-verify.sh --run login --target b >/dev/null
    ./scripts/composer-commit.sh --run login --task a >/dev/null
    ./scripts/composer-commit.sh --run login --task b >/dev/null
    HOME="$REACT_HOME" ./scripts/composer-chat-control.sh --run login --checkpoint pre-integrate >/dev/null
    node ./tools/composer.mjs checkpoint --run login --checkpoint pre-integrate --decision approve_ab
    ./scripts/composer-integrate.sh --run login >/dev/null
    ./scripts/composer-verify.sh --run login --target ab >/dev/null
    HOME="$REACT_HOME" ./scripts/composer-chat-control.sh --run login --checkpoint publish >/dev/null
    node ./tools/composer.mjs checkpoint --run login --checkpoint publish --decision approve_publish
    ./scripts/composer-integrate.sh --run login >/dev/null
    ./scripts/composer-verify.sh --run login --target main >/dev/null
    ./scripts/composer-summarize.sh --run login >/dev/null
  )

  node --input-type=module -e '
    import fs from "node:fs/promises";
    const plan = JSON.parse(await fs.readFile(process.argv[1], "utf8"));
    const status = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
    if (plan.recommended_mode !== "parallel_ab") {
      throw new Error(`react-go-login expected parallel_ab, received ${plan.recommended_mode}`);
    }
    if (status.phase !== "completed") {
      throw new Error(`react-go-login expected completed phase, received ${status.phase}`);
    }
  ' \
    "$REACT_REPO/.codex-composer/runs/login/plan.json" \
    "$REACT_REPO/.codex-composer/runs/login/status.json"
}

write_report() {
  local empty_mode
  local empty_reasons
  local react_mode
  local react_phase

  empty_mode="$(node --input-type=module -e 'import fs from "node:fs/promises"; const plan = JSON.parse(await fs.readFile(process.argv[1], "utf8")); process.stdout.write(plan.recommended_mode);' "$EMPTY_REPO/.codex-composer/runs/login/plan.json")"
  empty_reasons="$(node --input-type=module -e 'import fs from "node:fs/promises"; const plan = JSON.parse(await fs.readFile(process.argv[1], "utf8")); process.stdout.write((plan.policy_evaluation?.reasons ?? []).join(" | "));' "$EMPTY_REPO/.codex-composer/runs/login/plan.json")"
  react_mode="$(node --input-type=module -e 'import fs from "node:fs/promises"; const plan = JSON.parse(await fs.readFile(process.argv[1], "utf8")); process.stdout.write(plan.recommended_mode);' "$REACT_REPO/.codex-composer/runs/login/plan.json")"
  react_phase="$(node --input-type=module -e 'import fs from "node:fs/promises"; const status = JSON.parse(await fs.readFile(process.argv[1], "utf8")); process.stdout.write(status.phase);' "$REACT_REPO/.codex-composer/runs/login/status.json")"

  cat > "$BASE_DIR/validation-report.md" <<EOF
# Validation Report

- empty-login repo: $EMPTY_REPO
- react-go-login repo: $REACT_REPO
- requirement: $REQUIREMENT

## empty-login

- recommended_mode: $empty_mode
- reasons: $empty_reasons

## react-go-login

- recommended_mode: $react_mode
- final_phase: $react_phase
- summary: $REACT_REPO/.codex-composer/runs/login/SUMMARY.md
- pr_body: $REACT_REPO/.codex-composer/runs/login/PR_BODY.md
EOF
}

mkdir -p "$BASE_DIR"
run_empty_validation
run_react_validation
write_report

echo "Validation completed. Report: $BASE_DIR/validation-report.md"
