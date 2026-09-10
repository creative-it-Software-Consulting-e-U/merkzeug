#!/bin/bash
set -euo pipefail
[[ "${CI_XCODEBUILD_ACTION:-}" == archive ]] || exit 0
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
python3 "$SCRIPT_DIR/../verify-archive.py" "${CI_ARCHIVE_PATH:?Missing Cloud archive}" "${CI_BUILD_NUMBER:?Missing Cloud build number}"
