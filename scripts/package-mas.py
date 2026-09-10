#!/usr/bin/env python3
"""Build Electron's Mac App Store variant locally; never upload or install it."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
from version import ROOT, check


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('arch', choices=['arm64', 'x64', 'universal'])
    parser.add_argument('--distribution', action='store_true', help='Build for App Store upload instead of development testing')
    parser.add_argument('--unsigned', action='store_true', help='Packaging check only; cannot validate sandbox execution or upload')
    parser.add_argument('--build-number', type=int, help='Unused positive App Store build number')
    parser.add_argument('--store-version', help='Equivalent Store spelling of VERSION, for example 1.0 for 1.0.0')
    args = parser.parse_args()
    if args.unsigned and args.distribution: parser.error('Distribution requires signing')
    version = check()
    if args.distribution and (not args.build_number or args.build_number < 1): parser.error('Distribution requires a positive --build-number')
    if args.store_version:
        parts = args.store_version.split('.')
        if not 1 <= len(parts) <= 3 or not all(p.isdigit() for p in parts): parser.error('Invalid Store version')
        normalized = '.'.join(parts + ['0'] * (3 - len(parts)))
        if normalized != version: parser.error('Store version must match VERSION')
    if os.uname().sysname != 'Darwin': parser.error('Run this build on macOS')
    env = dict(os.environ)
    config = {'extends': str(ROOT / 'crossplatform/electron-builder.yml'),
              'directories': {'output': str(ROOT / 'crossplatform/dist-mas')},
              'forceCodeSigning': not args.unsigned,
              'mac': {'hardenedRuntime': False, 'notarize': False},
              'mas': {'hardenedRuntime': False, 'sign': str(ROOT / 'crossplatform/build/sign-mas.cjs'),
                      # Cloud packages unsigned and lets Xcode sign, so osx-sign's
                      # automatic ElectronTeamID/app-group setup never runs there.
                      'extendInfo': {'ElectronTeamID': '3BNJ4M9R56'},
                      'entitlements': 'build/entitlements.mas.plist',
                      'entitlementsInherit': 'build/entitlements.mas.inherit.plist',
                      'binaries': ['Resources/calendar/merkzeug-calendar']}}
    if args.build_number: config['mas']['bundleVersion'] = str(args.build_number)
    if args.store_version: config['mas']['bundleShortVersion'] = args.store_version
    variant = 'mas' if args.distribution else 'masDev'
    config[variant] = dict(config['mas'])
    if args.unsigned:
        config[variant]['identity'] = None
        env['CSC_IDENTITY_AUTO_DISCOVERY'] = 'false'
    else:
        profile = Path(env.get('MERKZEUG_MAS_PROFILE', '')).expanduser()
        identity = env.get('MERKZEUG_MAS_IDENTITY')
        if not identity or not profile.is_file(): parser.error('Set MERKZEUG_MAS_IDENTITY and MERKZEUG_MAS_PROFILE outside the repository')
        if profile.resolve().is_relative_to(ROOT): parser.error('Provisioning profiles must live outside the repository')
        if args.distribution and identity.startswith('Apple Distribution: '):
            identity = identity.removeprefix('Apple Distribution: ')
        config[variant].update(identity=identity, provisioningProfile=str(profile.resolve()))
        # Signing identities are supplied by a local/private temporary keychain.
    subprocess.run(['node', 'scripts/third-party-notices.mjs'], cwd=ROOT, env=env, check=True)
    subprocess.run(['npm', 'run', 'build:desktop'], cwd=ROOT, env=env, check=True)
    # Compile both helper slices before universal packaging; do not ship a host-only helper.
    sdk = env.get('MERKZEUG_MACOS_SDK') or subprocess.check_output(['xcrun', '--sdk', 'macosx', '--show-sdk-path'], env=env, text=True).strip()
    with tempfile.TemporaryDirectory(prefix='merkzeug-calendar-') as helper_tmp:
        arches = ['arm64', 'x86_64'] if args.arch == 'universal' else ['x86_64' if args.arch == 'x64' else 'arm64']
        slices = []
        for arch in arches:
            output = str(Path(helper_tmp) / arch)
            subprocess.run(['xcrun', 'swiftc', '-O', '-sdk', sdk, '-target', f'{arch}-apple-macos12.0',
                            'crossplatform/resources/calendar/MerkzeugCalendar.swift', '-o', output], cwd=ROOT, env=env, check=True)
            slices.append(output)
        subprocess.run(['xcrun', 'lipo', '-create', *slices, '-output', str(ROOT / 'crossplatform/resources/calendar/merkzeug-calendar')], env=env, check=True)
    with tempfile.TemporaryDirectory(prefix='merkzeug-mas-') as temporary:
        path = Path(temporary) / 'builder.json'
        path.write_text(json.dumps(config))
        subprocess.run(['npx', 'electron-builder', '--config', str(path), '--mac',
                        'mas' if args.distribution else 'mas-dev', '--' + args.arch, '--publish', 'never'],
                       cwd=ROOT / 'crossplatform', env=env, check=True)
    print('MAS packaging complete. Nothing uploaded. ' + ('Unsigned output is NOT an installable sandbox test.' if args.unsigned else 'Native sandbox testing and App Store validation are still required.'))

if __name__ == '__main__': main()
