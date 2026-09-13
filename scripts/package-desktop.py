#!/usr/bin/env python3
"""Build a desktop release artifact without publishing. Secrets come from the environment."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
from version import ROOT, check

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('platform', choices=['mac', 'win', 'linux'])
parser.add_argument('arch', choices=['x64', 'arm64'])
parser.add_argument('--signed', action='store_true')
args = parser.parse_args()
version = check()
if args.platform == 'linux' and args.arch != 'x64': parser.error('Only Linux x64 is in the current release matrix')
env = dict(os.environ)
env['ELECTRON_BUILDER_7Z_FILTER'] = 'BCJ2'
env['CSC_IDENTITY_AUTO_DISCOVERY'] = 'false'
config = {'extends': str(ROOT / 'crossplatform/electron-builder.yml'),
          'artifactName': f'Merkzeug-${{version}}-${{os}}-{args.arch}.${{ext}}',
          'forceCodeSigning': args.signed and args.platform != 'linux'}
if args.signed and args.platform in ['mac', 'win']:
    prefix = 'MAC' if args.platform == 'mac' else 'WINDOWS'
    for suffix in ['CSC_LINK', 'CSC_KEY_PASSWORD']:
        value = env.get(prefix + '_' + suffix)
        if not value: raise SystemExit(f'Missing signing secret: {prefix}_{suffix}')
        env[suffix] = value
    if args.platform == 'mac':
        for key in ['APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER']:
            if not env.get(key): raise SystemExit(f'Missing notarization configuration: {key}')
        if not Path(env.get('MERKZEUG_MAC_PROFILE', '')).is_file():
            raise SystemExit('Missing Developer ID iCloud profile: MERKZEUG_MAC_PROFILE')
        config['mac'] = {'notarize': True}
elif args.platform == 'mac':
    config['mac'] = {'identity': None, 'hardenedRuntime': False, 'notarize': False}
# Bundled help and third-party license texts travel with the application.
subprocess.run(['node', str(ROOT / 'scripts/third-party-notices.mjs')], cwd=ROOT, check=True)
subprocess.run(['npm.cmd' if os.name == 'nt' else 'npm', 'run', 'build:desktop'], cwd=ROOT, env=env, check=True)
if args.platform == 'mac':
    subprocess.run(['npm.cmd' if os.name == 'nt' else 'npm', 'run', 'build:calhelper', '-w', 'merkzeug'], cwd=ROOT, env=env, check=True)
    subprocess.run(['python3', str(ROOT / 'scripts/build-icloud-addon.py'), '--arch', args.arch], cwd=ROOT, env=env, check=True)
with tempfile.TemporaryDirectory(prefix='merkzeug-package-') as temp:
    path = Path(temp) / 'builder.json'; path.write_text(json.dumps(config))
    # Select the Windows command shim explicitly.
    npx = 'npx.cmd' if os.name == 'nt' else 'npx'
    command = [npx, 'electron-builder', '--config', str(path), '--' + args.platform]
    if args.platform == 'mac': command.append('dmg')
    command.extend(['--' + args.arch, '--publish', 'never'])
    subprocess.run(command, cwd=ROOT / 'crossplatform', env=env, check=True)
print(f'Built {version} for {args.platform}/{args.arch}; publishing was disabled.')
