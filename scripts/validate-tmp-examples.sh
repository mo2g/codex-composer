#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BASE_DIR="${BASE_DIR:-/tmp/codex-composer}"
EXISTING_REPO="$BASE_DIR/existing-node"
EMPTY_REPO="$BASE_DIR/empty-repo"
REACT_REPO="$BASE_DIR/react-go-minimal"

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
  git -C "$EXISTING_REPO" config user.name "Codex Composer Validation"

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

assert_minimal_layout() {
  local repo_root="$1"
  assert_exists "$repo_root/AGENTS.md"
  assert_exists "$repo_root/.codex/config.toml"
  assert_exists "$repo_root/.agents/skills/codex-composer/planner/SKILL.md"
  assert_exists "$repo_root/.agents/skills/codex-composer/implementer/SKILL.md"
  assert_exists "$repo_root/.agents/skills/codex-composer/merge-check/SKILL.md"
  assert_exists "$repo_root/docs/codex-quickstart.md"
  assert_exists "$repo_root/docs/manual-merge-checklist.md"
  assert_missing "$repo_root/codex-composer"
  assert_missing "$repo_root/composer-next"
  assert_missing "$repo_root/.codex/protocol"
  assert_missing "$repo_root/.codex/local"
  assert_missing "$repo_root/.codex/rules"
}

validate_existing_repo() {
  bootstrap_existing_repo
  install_template "$EXISTING_REPO" "existing"
  assert_minimal_layout "$EXISTING_REPO"

  node --input-type=module -e '
    import fs from "node:fs/promises";
    const config = await fs.readFile(process.argv[1], "utf8");
    if (!config.includes("npm test")) throw new Error("expected npm test hook");
    if (config.includes("[codex]")) throw new Error("did not expect [codex] section");
    if (config.includes("parallel_ab")) throw new Error("did not expect protocol parallel mode");
  ' "$EXISTING_REPO/.codex/config.toml"

  (
    cd "$EXISTING_REPO"
    npm test >/dev/null
  )
}

validate_empty_repo() {
  ensure_absent "$EMPTY_REPO"
  mkdir -p "$EMPTY_REPO"
  install_template "$EMPTY_REPO" "empty"
  assert_minimal_layout "$EMPTY_REPO"

  node --input-type=module -e '
    import fs from "node:fs/promises";
    const config = await fs.readFile(process.argv[1], "utf8");
    if (!config.includes("repo_type = \"empty\"")) throw new Error("expected empty repo type");
    if (/npm test|pnpm test|yarn test|go test|cargo test/.test(config)) {
      throw new Error("did not expect stack-specific hooks for an empty repo");
    }
  ' "$EMPTY_REPO/.codex/config.toml"
}

validate_react_go_repo() {
  ensure_absent "$REACT_REPO"
  install_template "$REACT_REPO" "react-go-minimal"
  assert_minimal_layout "$REACT_REPO"
  assert_exists "$REACT_REPO/frontend/src/App.jsx"
  assert_exists "$REACT_REPO/backend/go.mod"

  node --input-type=module -e '
    import fs from "node:fs/promises";
    const config = await fs.readFile(process.argv[1], "utf8");
    if (!config.includes("repo_type = \"react-go-minimal\"")) throw new Error("expected react-go-minimal repo type");
    if (!config.includes("backend/go.mod")) throw new Error("expected backend go test hook");
    if (!config.includes("go test ./...")) throw new Error("expected go test command");
  ' "$REACT_REPO/.codex/config.toml"

  (
    cd "$REACT_REPO/backend"
    go test ./... >/dev/null
  )
}

write_report() {
  cat > "$BASE_DIR/validation-report.md" <<EOF
# Validation Report

- existing repo: $EXISTING_REPO
- empty repo: $EMPTY_REPO
- react-go-minimal repo: $REACT_REPO

## Checks

- minimal template layout installed into existing, empty, and react-go-minimal repos
- no launcher, protocol bundle, runtime state directory, or generated rules were installed
- Node hook detection selected \`npm test\`
- react-go-minimal generated backend scaffold and passed \`go test ./...\`
EOF
}

mkdir -p "$BASE_DIR"
validate_existing_repo
validate_empty_repo
validate_react_go_repo
write_report

echo "Validation completed. Report: $BASE_DIR/validation-report.md"
