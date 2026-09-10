#!/usr/bin/env python3
"""Stage the prepared Electron bundle as the actual Xcode archive product."""
import os
from pathlib import Path
import plistlib
import shutil
import subprocess

root = Path(__file__).resolve().parents[2]
source = root / 'crossplatform/dist-mas/mas-dev-universal/Merkzeug.app'
target = Path(os.environ['TARGET_BUILD_DIR']) / os.environ['FULL_PRODUCT_NAME']
if target.name != 'Merkzeug.app' or target.resolve() == source.resolve():
    raise SystemExit('Unexpected Xcode product destination')
info = plistlib.loads((source / 'Contents/Info.plist').read_bytes())
if info['CFBundleIdentifier'] != 'com.creative-it.merkzeug':
    raise SystemExit('Prepared bundle is not Merkzeug')
for binary in ['Contents/MacOS/Merkzeug', 'Contents/Resources/calendar/merkzeug-calendar']:
    architectures = subprocess.check_output(['xcrun', 'lipo', '-archs', str(source / binary)], text=True).split()
    if set(architectures) != {'arm64', 'x86_64'}:
        raise SystemExit(f'Expected universal executable: {binary}')
contents = target / 'Contents'
contents.mkdir(parents=True, exist_ok=True)
for item in (source / 'Contents').iterdir():
    # Xcode owns Info.plist and the final app signature/provisioning profile.
    if item.name in {'Info.plist', '_CodeSignature', 'embedded.provisionprofile'}:
        continue
    destination = contents / item.name
    if destination.is_dir() and not destination.is_symlink(): shutil.rmtree(destination)
    elif destination.exists() or destination.is_symlink(): destination.unlink()
    if item.is_symlink(): destination.symlink_to(os.readlink(item))
    elif item.is_dir(): shutil.copytree(item, destination, symlinks=True)
    else: shutil.copy2(item, destination)
# Nested code needs sandbox entitlements before Xcode Cloud re-signs the archive.
# Sign only nested code here; Xcode owns the outer signature and Info.plist.
subprocess.run(['node', str(root / 'crossplatform/macos/sign-nested.cjs'), str(target)], check=True)
