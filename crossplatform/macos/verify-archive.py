#!/usr/bin/env python3
"""Verify that a Cloud archive contains the real universal Merkzeug product (production or staging)."""
import hashlib
import json
from pathlib import Path
import plistlib
import subprocess
import sys
from variants import TEAM_ID, by_bundle_id

archive, build = Path(sys.argv[1]), sys.argv[2]
apps = list((archive / 'Products/Applications').glob('*.app'))
if len(apps) != 1: raise SystemExit('Archive must contain exactly one application')
app = apps[0]
info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
edition = by_bundle_id(info.get('CFBundleIdentifier', ''))
if app.name != edition.app or info.get('CFBundleVersion') != build:
    raise SystemExit('Archive app identity or build number differs from the Cloud run')
if info.get('ITSAppUsesNonExemptEncryption') is not False:
    raise SystemExit('Archive is missing the existing export-compliance declaration')
if info.get('ElectronTeamID') != TEAM_ID:
    raise SystemExit('Archive is missing ElectronTeamID for sandbox Mach IPC')
entitlements = plistlib.loads(subprocess.check_output([
    'codesign', '--display', '--entitlements', ':-', str(app)]))
if (entitlements.get('com.apple.security.app-sandbox') is not True or
        edition.app_group not in
        entitlements.get('com.apple.security.application-groups', [])):
    raise SystemExit('Archive is missing the Electron sandbox app group for Mach IPC')
container = edition.container
if container not in entitlements.get('com.apple.developer.ubiquity-container-identifiers', []):
    raise SystemExit('Archive is missing its edition iCloud container entitlement')
if list(info.get('NSUbiquitousContainers', {})) != [container] or \
        not info['NSUbiquitousContainers'][container].get('NSUbiquitousContainerIsDocumentScopePublic'):
    raise SystemExit('Archive is missing the public iCloud document folder declaration')
for name in [f'Contents/MacOS/{edition.product}', 'Contents/Resources/calendar/merkzeug-calendar', 'Contents/Resources/icloud/merkzeug-icloud.node']:
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
