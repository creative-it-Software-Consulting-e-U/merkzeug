#!/usr/bin/env bash
set -euo pipefail
# Disposable container only. Run the application as an ordinary user, with its
# Chromium sandbox enabled; no host installation or user profile is touched.
dnf install -y nodejs npm python3 sudo git xorg-x11-server-Xvfb procps-ng
useradd -m tester
printf 'tester ALL=(ALL) NOPASSWD: ALL\n' > /etc/sudoers.d/tester
version=$(cat VERSION)
dnf install -y "crossplatform/dist/Merkzeug-$version-linux-x64.rpm"
mkdir -p release-artifacts/linux-validation/rpm
chmod 777 release-artifacts/linux-validation/rpm
runuser -u tester -- git config --global --add safe.directory /workspace
runuser -u tester -- xvfb-run -a python3 scripts/install-validation-package.py \
  "crossplatform/dist/Merkzeug-$version-linux-x64.rpm" release-artifacts/linux-validation/rpm --arch x64
