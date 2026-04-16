#!/usr/bin/env bash
set -euo pipefail

TARGET_REPO="."
TEMPLATE="existing"
SOURCE_DIR=""
REPO_SLUG="${CODEX_TEMPLATE_REPO:-mo2g/codex-composer}"
REF="${CODEX_TEMPLATE_REF:-main}"
UPGRADE="false"
DRY_RUN="false"

usage() {
  cat <<'EOF'
Usage: install.sh [--repo PATH] [--template existing|blank] [--source DIR] [--repo-slug OWNER/REPO] [--ref BRANCH|TAG|COMMIT] [--upgrade] [--dry-run]

Examples:
  bash install.sh --repo . --template existing
  bash install.sh --repo . --template existing --ref main
  bash install.sh --repo . --template existing --ref v1.0.0
  bash install.sh --repo . --template existing --ref 3c8cb5746aa57efa4ffcc2ca013239c63b1ebd3a
  bash install.sh --repo . --template existing --source . --upgrade --dry-run
  bash install.sh --repo . --template existing --source . --upgrade
  curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | \
    bash -s -- --repo . --template existing --ref 3c8cb5746aa57efa4ffcc2ca013239c63b1ebd3a
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) TARGET_REPO="$2"; shift 2 ;;
    --template) TEMPLATE="$2"; shift 2 ;;
    --source) SOURCE_DIR="$2"; shift 2 ;;
    --repo-slug) REPO_SLUG="$2"; shift 2 ;;
    --ref) REF="$2"; shift 2 ;;
    --upgrade) UPGRADE="true"; shift ;;
    --dry-run) DRY_RUN="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

download_source() {
  local temp_root archive_url archive_path extracted
  temp_root="$(mktemp -d "${TMPDIR:-/tmp}/codex-app-template-install-XXXXXX")"
  archive_path="$temp_root/codex-app-template.tar.gz"
  archive_url="https://codeload.github.com/${REPO_SLUG}/tar.gz/${REF}"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$archive_url" -o "$archive_path"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$archive_path" "$archive_url"
  else
    echo "install.sh needs curl or wget when --source is not provided" >&2
    exit 1
  fi

  tar -xzf "$archive_path" -C "$temp_root"
  extracted="$(find "$temp_root" -maxdepth 1 -mindepth 1 -type d | head -n 1)"
  if [[ -z "$extracted" ]]; then
    echo "Unable to extract Codex App Template archive" >&2
    exit 1
  fi

  trap "rm -rf -- '$temp_root'" EXIT
  SOURCE_DIR="$extracted"
}

if [[ -z "$SOURCE_DIR" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [[ -f "$SCRIPT_DIR/tools/template-init.mjs" ]]; then
    SOURCE_DIR="$SCRIPT_DIR"
  fi
fi

if [[ -z "$SOURCE_DIR" ]]; then
  download_source
fi

NODE_ARGS=(
  "$SOURCE_DIR/tools/template-init.mjs"
  init-repo
  --repo "$TARGET_REPO"
  --template "$TEMPLATE"
)

if [[ "$UPGRADE" == "true" ]]; then
  NODE_ARGS+=(--upgrade)
fi

if [[ "$DRY_RUN" == "true" ]]; then
  NODE_ARGS+=(--dry-run)
fi

node "${NODE_ARGS[@]}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Codex App Template dry run completed for $TARGET_REPO with template $TEMPLATE from ref $REF"
elif [[ "$UPGRADE" == "true" ]]; then
  echo "Codex App Template upgraded in $TARGET_REPO with template $TEMPLATE from ref $REF"
else
  echo "Codex App Template installed into $TARGET_REPO with template $TEMPLATE from ref $REF"
fi