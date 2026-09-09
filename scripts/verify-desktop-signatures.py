#!/usr/bin/env python3
"""Inspect signed outputs before a release draft can receive their binaries."""
import argparse
import json
from pathlib import Path
import subprocess
from version import ROOT, check

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('platform', choices=['mac', 'win'])
p.add_argument('arch', choices=['arm64', 'x64'])
a = p.parse_args()
version = check()
dist = ROOT / 'crossplatform/dist'
if a.platform == 'mac':
    app = dist / ('mac-arm64' if a.arch == 'arm64' else 'mac') / 'Merkzeug.app'
    subprocess.run(['codesign', '--verify', '--deep', '--strict', '--verbose=2', str(app)], check=True)
    subprocess.run(['spctl', '--assess', '--type', 'execute', '--verbose=2', str(app)], check=True)
    subprocess.run(['xcrun', 'stapler', 'validate', str(app)], check=True)
else:
    import os
    for binary in [dist / f'Merkzeug-{version}-win-{a.arch}.exe',
                   dist / ('win-arm64-unpacked' if a.arch == 'arm64' else 'win-unpacked') / 'Merkzeug.exe']:
        # Pass a literal path as data, never concatenate it into PowerShell source.
        env = {**os.environ, 'MERKZEUG_SIGNATURE_FILE': str(binary)}
        subprocess.run(['pwsh', '-NoProfile', '-NonInteractive', '-Command',
                        "$s = Get-AuthenticodeSignature -LiteralPath $env:MERKZEUG_SIGNATURE_FILE; "
                        "if ($s.Status -ne 'Valid' -or -not $s.SignerCertificate -or -not $s.TimeStamperCertificate) "
                        "{ throw 'Missing valid timestamped publisher signature' }; "
                        "$s | Select-Object Path,Status | ConvertTo-Json"], env=env, check=True)
print(json.dumps({'platform': a.platform, 'arch': a.arch, 'version': version, 'signatures': 'verified'}))
