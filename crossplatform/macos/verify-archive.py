#!/usr/bin/env python3
"""Verify that a Cloud archive contains the real universal Merkzeug product."""
import hashlib
import json
from pathlib import Path
import plistlib
import subprocess
import sys

archive, build = Path(sys.argv[1]), sys.argv[2]
app = archive / 'Products/Applications/Merkzeug.app'
info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
if info.get('CFBundleIdentifier') != 'com.creative-it.merkzeug' or info.get('CFBundleVersion') != build:
    raise SystemExit('Archive app identity or build number differs from the Cloud run')
for name in ['Contents/MacOS/Merkzeug', 'Contents/Resources/calendar/merkzeug-calendar']:
    architectures = subprocess.check_output(['xcrun', 'lipo', '-archs', str(app / name)], text=True).split()
    if set(architectures) != {'arm64', 'x86_64'}: raise SystemExit(f'Archive is not universal: {name}')
subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
resources = app / 'Contents/Resources'
for name in ['app.asar', 'LICENSE', 'THIRD_PARTY_NOTICES.txt', 'help/Help.en.md', 'help/Help.de.md']:
    if not (resources / name).is_file(): raise SystemExit(f'Missing archive resource: {name}')
with (resources / 'app.asar').open('rb') as data:
    checksum = hashlib.sha256()
    for chunk in iter(lambda: data.read(1024 * 1024), b''):
        checksum.update(chunk)
    digest = checksum.hexdigest()
print(json.dumps({'bundleId': info['CFBundleIdentifier'], 'version': info['CFBundleShortVersionString'], 'build': build, 'architectures': ['arm64', 'x86_64'], 'appAsarSHA256': digest, 'signature': 'verified'}))
