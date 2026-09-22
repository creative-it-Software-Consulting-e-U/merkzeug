#!/bin/bash
# Fail before archiving if the post-clone web build is missing.
set -euo pipefail
# Cloud's test workers receive built products, not post-clone web resources.
# Their UI-test fixtures are already embedded in the test bundle.
if [[ "${CI_XCODEBUILD_ACTION:-}" == test-without-building ]]; then
  echo 'Using validated build-for-testing products on the test worker.'
  exit 0
fi
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
test -s "$APP_DIR/App/public/index.html"
test -s "$APP_DIR/App/capacitor.config.json"
# Cloud build numbers increase independently of the marketing version.
if [[ "${CI_XCODEBUILD_ACTION:-}" == archive ]]; then
  [[ "${CI_BUILD_NUMBER:-}" =~ ^[1-9][0-9]*$ ]] || { echo 'Missing positive Xcode Cloud build number.' >&2; exit 1; }
  REPOSITORY="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$APP_DIR/../../.." && pwd)}"
  STORE_VERSION="$(tr -d '[:space:]' < "$REPOSITORY/VERSION")"
  # Use major.minor for zero-patch Store versions (1.1.0 → 1.1).
  STORE_VERSION="${STORE_VERSION%.0}"
  cd "$APP_DIR"
  xcrun agvtool new-marketing-version "$STORE_VERSION"
  xcrun agvtool new-version -all "$CI_BUILD_NUMBER"
fi
