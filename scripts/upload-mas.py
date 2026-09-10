#!/usr/bin/env python3
"""Validate a signed Merkzeug MAS package; upload only with --upload."""
import argparse
import base64
import os
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package', type=Path)
    parser.add_argument('--upload', action='store_true')
    args = parser.parse_args()
    package = args.package.resolve()
    if not package.is_file() or package.suffix != '.pkg': parser.error('Expected an existing signed .pkg')
    env = dict(os.environ)
    key_id, issuer = env.get('ASC_KEY_ID', ''), env.get('ASC_ISSUER_ID', '')
    if not re.fullmatch(r'[A-Z0-9]{10}', key_id) or not re.fullmatch(r'[a-fA-F0-9-]{36}', issuer):
        parser.error('Set ASC_KEY_ID and ASC_ISSUER_ID')
    try:
        key = base64.b64decode(env['ASC_PRIVATE_KEY_BASE64'], validate=True)
        if b'-----BEGIN PRIVATE KEY-----' not in key: raise ValueError()
    except (KeyError, ValueError): parser.error('Set ASC_PRIVATE_KEY_BASE64 to the private API key outside source control')
    signature = subprocess.check_output(['pkgutil', '--check-signature', str(package)], text=True)
    if '3rd Party Mac Developer Installer: creative-it (3BNJ4M9R56)' not in signature:
        parser.error('Package must be signed by the expected Mac App Store installer identity')
    with tempfile.TemporaryDirectory(prefix='merkzeug-pkg-check-') as folder:
        expanded = Path(folder) / 'expanded'
        subprocess.run(['pkgutil', '--expand', str(package), str(expanded)], check=True)
        bundles = [b.attrib.get('id') for p in expanded.rglob('PackageInfo') for b in ET.parse(p).iter('bundle')]
        if 'com.creative-it.merkzeug' not in bundles:
            parser.error('Package does not contain the Merkzeug application')
    with tempfile.TemporaryDirectory(prefix='merkzeug-store-key-') as folder:
        keyfile = Path(folder) / f'AuthKey_{key_id}.p8'
        keyfile.write_bytes(key)
        keyfile.chmod(0o600)
        env['API_PRIVATE_KEYS_DIR'] = folder
        env.pop('ASC_PRIVATE_KEY_BASE64', None)
        auth = ['--api-key', key_id, '--api-issuer', issuer]
        subprocess.run(['xcrun', 'altool', '--validate-app', str(package), *auth], env=env, check=True)
        if args.upload:
            subprocess.run(['xcrun', 'altool', '--upload-package', str(package), *auth, '--wait'], env=env, check=True)
        else:
            print('Validation complete. Nothing uploaded; use --upload explicitly.')


if __name__ == '__main__':
    main()
