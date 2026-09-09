#!/bin/bash
# Fail before archiving if the post-clone web build is missing.
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
test -s "$APP_DIR/App/public/index.html"
test -s "$APP_DIR/App/capacitor.config.json"
# Cloud build numbers increase independently of the marketing version.
if [[ "${CI_XCODEBUILD_ACTION:-}" == archive ]]; then
  [[ "${CI_BUILD_NUMBER:-}" =~ ^[1-9][0-9]*$ ]] || { echo 'Missing positive Xcode Cloud build number.' >&2; exit 1; }
  cd "$APP_DIR"
  xcrun agvtool new-version -all "$CI_BUILD_NUMBER"
fi
