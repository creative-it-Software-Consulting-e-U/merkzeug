#!/usr/bin/env python3
"""Adapt Capacitor's generated package to the pinned local binary package."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PIN = '8.5.0'
package = ROOT / 'mobile/ios/App/CapApp-SPM/Package.swift'
installed = ROOT / 'mobile/node_modules/@capacitor/ios/package.json'
if not installed.exists():
    installed = ROOT / 'node_modules/@capacitor/ios/package.json'
if json.loads(installed.read_text())['version'] != PIN:
    raise SystemExit('Update the reviewed CapacitorRuntime URLs/checksums before upgrading Capacitor.')
source = package.read_text()
remote = f'.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "{PIN}")'
local = '.package(name: "capacitor-swift-pm", path: "../CapacitorRuntime")'
if remote not in source and local not in source:
    raise SystemExit('Unexpected Capacitor package layout; inspect before adapting it.')
package.write_text(source.replace(remote, local))
# Remove the obsolete remote pin so Xcode's Cloud onboarding does not retain it.
resolved = ROOT / 'mobile/ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'
if resolved.exists():
    lock = json.loads(resolved.read_text())
    lock['pins'] = [pin for pin in lock['pins'] if pin['identity'] != 'capacitor-swift-pm']
    lock.pop('originHash', None)
    resolved.write_text(json.dumps(lock, indent=2) + '\n')
print(f'Prepared local Capacitor runtime package {PIN}; upstream binary checksums retained.')
