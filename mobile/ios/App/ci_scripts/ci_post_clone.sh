#!/bin/bash
# Xcode Cloud: prepare the Capacitor application before dependency resolution/build.
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
REPOSITORY="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../../../.." && pwd)}"
cd "$REPOSITORY"
NODE_MAJOR="$(tr -d '[:space:]' < .nvmrc)"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]]; then
  brew install "node@$NODE_MAJOR"
  export PATH="$(brew --prefix "node@$NODE_MAJOR")/bin:$PATH"
fi
node -e 'if (process.versions.node.split(".")[0] !== process.argv[1]) process.exit(1)' "$NODE_MAJOR"
# Electron binaries are irrelevant to the native iOS archive.
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
npm ci --no-audit --no-fund
npm run check:version
npm test
npm run sync -w merkzeug-mobile
