#!/usr/bin/env bash
set -euo pipefail

TARGET_REPO="."
TEMPLATE="existing"
CODEX_BINARY="codex"
SOURCE_DIR=""
REPO_SLUG="${CODEX_COMPOSER_REPO:-mo2g/codex-composer}"
REF="${CODEX_COMPOSER_REF:-main}"

usage() {
  cat <<'EOF'
Usage: install.sh [--repo <path>] [--template existing|empty|react-go-minimal] [--codex-binary <path>] [--source <local-path>] [--repo-slug <owner/name>] [--ref <git-ref>]

Examples:
  bash install.sh --repo . --template existing
  curl -fsSL https://raw.githubusercontent.com/mo2g/codex-composer/main/install.sh | bash -s -- --repo . --template existing
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      TARGET_REPO="$2"
      shift 2
      ;;
    --template)
      TEMPLATE="$2"
      shift 2
      ;;
    --codex-binary)
      CODEX_BINARY="$2"
      shift 2
      ;;
    --source)
      SOURCE_DIR="$2"
      shift 2
      ;;
    --repo-slug)
      REPO_SLUG="$2"
      shift 2
      ;;
    --ref)
      REF="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

download_source() {
  local temp_root archive_url archive_path extracted
  temp_root="$(mktemp -d "${TMPDIR:-/tmp}/codex-composer-install-XXXXXX")"
  archive_path="$temp_root/codex-composer.tar.gz"
  archive_url="https://codeload.github.com/${REPO_SLUG}/tar.gz/refs/heads/${REF}"

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
    echo "Unable to extract Codex Composer archive" >&2
    exit 1
  fi

  trap 'rm -rf "$temp_root"' EXIT
  SOURCE_DIR="$extracted"
}

if [[ -z "$SOURCE_DIR" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [[ -f "$SCRIPT_DIR/tools/composer.mjs" ]]; then
    SOURCE_DIR="$SCRIPT_DIR"
  fi
fi

if [[ -z "$SOURCE_DIR" ]]; then
  download_source
fi

"$SOURCE_DIR/scripts/composer-init-repo.sh" \
  --repo "$TARGET_REPO" \
  --template "$TEMPLATE" \
  --codex-binary "$CODEX_BINARY"

echo "Codex Composer installed into $TARGET_REPO with template $TEMPLATE"
