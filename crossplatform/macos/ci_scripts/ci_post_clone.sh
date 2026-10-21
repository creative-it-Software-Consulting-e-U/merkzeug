#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
REPOSITORY="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
cd "$REPOSITORY"
NODE_MAJOR="$(tr -d '[:space:]' < .nvmrc)"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]]; then
  # macOS 27 Cloud images lack this Node major. Homebrew's parallel downloads can
  # lock each other out ("already locked .../openssl@3"), so install sequentially
  # without auto-update/cleanup and retry once.
  export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1 HOMEBREW_NO_ENV_HINTS=1 HOMEBREW_DOWNLOAD_CONCURRENCY=1
  brew install "node@$NODE_MAJOR" || { sleep 5; brew install "node@$NODE_MAJOR"; }
  export PATH="$(brew --prefix "node@$NODE_MAJOR")/bin:$PATH"
fi
npm ci --no-audit --no-fund
npm run check:version
npm test
