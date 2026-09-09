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
    parser.add_argument('arch', choices=['arm64', 'x64'])
    parser.add_argument('--distribution', action='store_true', help='Build for App Store upload instead of development testing')
    parser.add_argument('--unsigned', action='store_true', help='Packaging check only; cannot validate sandbox execution or upload')
    args = parser.parse_args()
    if args.unsigned and args.distribution: parser.error('Distribution requires signing')
    check()
    if os.uname().sysname != 'Darwin': parser.error('Run this build on macOS')
    env = dict(os.environ)
    config = {'extends': str(ROOT / 'crossplatform/electron-builder.yml'),
              'directories': {'output': str(ROOT / 'crossplatform/dist-mas')},
              'forceCodeSigning': not args.unsigned,
              'mac': {'hardenedRuntime': False, 'notarize': False},
              'mas': {'hardenedRuntime': False, 'sign': str(ROOT / 'crossplatform/build/sign-mas.cjs'),
                      'entitlements': 'build/entitlements.mas.plist',
                      'entitlementsInherit': 'build/entitlements.mas.inherit.plist',
                      'binaries': ['Resources/calendar/merkzeug-calendar']}}
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
        config[variant].update(identity=identity, provisioningProfile=str(profile.resolve()))
        # Signing identities are supplied by a local/private temporary keychain.
    subprocess.run(['node', 'scripts/third-party-notices.mjs'], cwd=ROOT, env=env, check=True)
    subprocess.run(['npm', 'run', 'build:desktop'], cwd=ROOT, env=env, check=True)
    subprocess.run(['npm', 'run', 'build:calhelper', '-w', 'merkzeug'], cwd=ROOT, env=env, check=True)
    with tempfile.TemporaryDirectory(prefix='merkzeug-mas-') as temporary:
        path = Path(temporary) / 'builder.json'
        path.write_text(json.dumps(config))
        subprocess.run(['npx', 'electron-builder', '--config', str(path), '--mac',
                        'mas' if args.distribution else 'mas-dev', '--' + args.arch, '--publish', 'never'],
                       cwd=ROOT / 'crossplatform', env=env, check=True)
    print('MAS packaging complete. Nothing uploaded. ' + ('Unsigned output is NOT an installable sandbox test.' if args.unsigned else 'Native sandbox testing and App Store validation are still required.'))

if __name__ == '__main__': main()
