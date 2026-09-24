#!/usr/bin/env bash
set -euo pipefail
# Disposable container only. Run the application as an ordinary user, with its
# Chromium sandbox enabled; no host installation or user profile is touched.
dnf install -y nodejs npm python3 sudo git xorg-x11-server-Xvfb procps-ng
useradd -m tester
printf 'tester ALL=(ALL) NOPASSWD: ALL\n' > /etc/sudoers.d/tester
arch=${PACKAGE_ARCH:?PACKAGE_ARCH must be x64 or arm64}
case "$arch" in x64|arm64) ;; *) exit 1 ;; esac
version=$(cat VERSION)
dnf install -y "crossplatform/dist/Merkzeug-$version-linux-$arch.rpm"
mkdir -p release-artifacts/linux-validation/rpm
chmod 777 release-artifacts/linux-validation/rpm
runuser -u tester -- git config --global --add safe.directory /workspace
runuser -u tester -- xvfb-run -a python3 scripts/install-validation-package.py \
  "crossplatform/dist/Merkzeug-$version-linux-$arch.rpm" release-artifacts/linux-validation/rpm --arch "$arch"
