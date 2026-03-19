#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BASE_DIR="${BASE_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/codex-app-template-XXXXXX")}"
EXISTING_REPO="$BASE_DIR/existing-node"
BLANK_REPO="$BASE_DIR/blank-repo"
FULLSTACK_REPO="$BASE_DIR/fullstack-example"

ensure_absent() {
  local target="$1"
  if [ -e "$target" ]; then
    echo "Refusing to overwrite existing path: $target" >&2
    exit 1
  fi
}

assert_exists() {
  local target="$1"
  if [ ! -e "$target" ]; then
    echo "Expected path to exist: $target" >&2
    exit 1
  fi
}

assert_missing() {
  local target="$1"
  if [ -e "$target" ]; then
    echo "Expected path to be absent: $target" >&2
    exit 1
  fi
}

bootstrap_existing_repo() {
  ensure_absent "$EXISTING_REPO"
  mkdir -p "$EXISTING_REPO"
  git -C "$EXISTING_REPO" init -b main >/dev/null
  git -C "$EXISTING_REPO" config user.email "validation@example.com"
  git -C "$EXISTING_REPO" config user.name "Codex App Template Validation"

  cat > "$EXISTING_REPO/package.json" <<'EOF'
{
  "name": "existing-node",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
EOF

  cat > "$EXISTING_REPO/app.test.mjs" <<'EOF'
import test from "node:test";
import assert from "node:assert/strict";

test("existing node repo", () => {
  assert.equal(2 + 2, 4);
});
EOF

  cat > "$EXISTING_REPO/README.md" <<'EOF'
# Existing Node Repo
EOF

  mkdir -p "$EXISTING_REPO/scripts" "$EXISTING_REPO/tools"
  cat > "$EXISTING_REPO/scripts/existing.sh" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "$EXISTING_REPO/scripts/existing.sh"
  cat > "$EXISTING_REPO/tools/existing.mjs" <<'EOF'
export const existing = true;
EOF

  git -C "$EXISTING_REPO" add .
  git -C "$EXISTING_REPO" commit -m "chore: bootstrap existing repo" >/dev/null
}

install_template() {
  local repo_root="$1"
  local template="$2"
  bash "$ROOT_DIR/install.sh" --repo "$repo_root" --template "$template" --source "$ROOT_DIR" >/dev/null
}

assert_template_layout() {
  local repo_root="$1"
  assert_exists "$repo_root/AGENTS.md"
  assert_exists "$repo_root/.codex/config.toml"
  assert_exists "$repo_root/.agents/skills/codex-template/planner/SKILL.md"
  assert_exists "$repo_root/.agents/skills/codex-template/implementer/SKILL.md"
  assert_exists "$repo_root/.agents/skills/codex-template/merge-check/SKILL.md"
  assert_exists "$repo_root/docs/codex-quickstart.md"
  assert_exists "$repo_root/docs/manual-merge-checklist.md"
  assert_missing "$repo_root/.agents/skills/codex-composer"
  assert_missing "$repo_root/.codex/protocol"
  assert_missing "$repo_root/tools/composer.mjs"
}

validate_existing_repo() {
  bootstrap_existing_repo
  install_template "$EXISTING_REPO" "existing"
  assert_template_layout "$EXISTING_REPO"

  node --input-type=module -e '
    import fs from "node:fs/promises";
    const config = await fs.readFile(process.argv[1], "utf8");
    const agents = await fs.readFile(process.argv[2], "utf8");
    if (!config.includes("npm test")) throw new Error("expected npm test hook");
    if (config.includes("repo_type")) throw new Error("did not expect repo_type");
    if (!agents.includes("Codex App Template")) throw new Error("expected Codex App Template wording");
  ' "$EXISTING_REPO/.codex/config.toml" "$EXISTING_REPO/AGENTS.md"

  (
    cd "$EXISTING_REPO"
    npm test >/dev/null
  )
}

validate_blank_repo() {
  ensure_absent "$BLANK_REPO"
  mkdir -p "$BLANK_REPO"
  install_template "$BLANK_REPO" "blank"
  assert_template_layout "$BLANK_REPO"
  assert_exists "$BLANK_REPO/README.md"

  node --input-type=module -e '
    import fs from "node:fs/promises";
    const config = await fs.readFile(process.argv[1], "utf8");
    if (/npm test|pnpm test|yarn test|go test|cargo test/.test(config)) {
      throw new Error("did not expect stack-specific hooks for a blank repo");
    }
  ' "$BLANK_REPO/.codex/config.toml"
}

validate_fullstack_repo() {
  ensure_absent "$FULLSTACK_REPO"
  mkdir -p "$FULLSTACK_REPO"
  install_template "$FULLSTACK_REPO" "fullstack-example"
  assert_template_layout "$FULLSTACK_REPO"
  assert_exists "$FULLSTACK_REPO/frontend/src/App.jsx"
  assert_exists "$FULLSTACK_REPO/backend/go.mod"

  node --input-type=module -e '
    import fs from "node:fs/promises";
    const config = await fs.readFile(process.argv[1], "utf8");
    if (!config.includes("backend/go.mod")) throw new Error("expected backend go test hook");
    if (!config.includes("go test ./...")) throw new Error("expected go test command");
  ' "$FULLSTACK_REPO/.codex/config.toml"

  (
    cd "$FULLSTACK_REPO/backend"
    go test ./... >/dev/null
  )
}

write_report() {
  cat > "$BASE_DIR/verification-report.md" <<EOF
# Verification Report

- existing repo: $EXISTING_REPO
- blank repo: $BLANK_REPO
- fullstack example repo: $FULLSTACK_REPO

## Checks

- template assets installed into existing, blank, and fullstack-example repositories
- only the new codex-template skill namespace is present
- no protocol-centric files or repo_type keys were installed
- fullstack example generated backend scaffold and passed \`go test ./...\`
EOF
}

mkdir -p "$BASE_DIR"
validate_existing_repo
validate_blank_repo
validate_fullstack_repo
write_report

echo "Verification completed. Report: $BASE_DIR/verification-report.md"
