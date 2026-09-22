#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
REPOSITORY="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
cd "$REPOSITORY"
NODE_MAJOR="$(tr -d '[:space:]' < .nvmrc)"
if [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]]; then
  export PATH="$(brew --prefix "node@$NODE_MAJOR")/bin:$PATH"
fi
[[ "${CI_BUILD_NUMBER:-}" =~ ^[1-9][0-9]*$ ]] || { echo 'A positive CI_BUILD_NUMBER is required.' >&2; exit 1; }
[[ "$CI_BUILD_NUMBER" -ge 2 ]] || { echo 'macOS build 1 is already uploaded; use a higher Cloud build number.' >&2; exit 1; }
# Use major.minor for zero-patch Store versions (1.1.0 → 1.1).
STORE_VERSION="$(python3 -c 'from pathlib import Path; v=Path("VERSION").read_text().strip(); print(v.removesuffix(".0"))')"
python3 scripts/package-mas.py universal --unsigned --store-version "$STORE_VERSION" --build-number "$CI_BUILD_NUMBER"
