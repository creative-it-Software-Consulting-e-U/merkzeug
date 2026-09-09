#!/usr/bin/env python3
"""Scan all local Git history and the current source snapshot; never print secret values."""
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def main():
    with tempfile.TemporaryDirectory(prefix='merkzeug-secrets-') as directory:
        temp = Path(directory)
        executable = os.environ.get('GITLEAKS_BIN')
        if not executable:
            pin = json.loads((ROOT / 'scripts/security-tools.json').read_text())['gitleaks']
            target = {('Darwin', 'arm64'): 'darwin_arm64', ('Linux', 'x86_64'): 'linux_x64'}.get((platform.system(), platform.machine()))
            if not target: raise SystemExit('Set GITLEAKS_BIN to a trusted local Gitleaks executable on this platform.')
            name = f'gitleaks_{pin["version"]}_{target}.tar.gz'
            archive = temp / name
            with urllib.request.urlopen(f'https://github.com/gitleaks/gitleaks/releases/download/v{pin["version"]}/{name}') as response:
                with archive.open('wb') as output: shutil.copyfileobj(response, output)
            if hashlib.sha256(archive.read_bytes()).hexdigest() != pin['archives'][name]:
                raise SystemExit('Gitleaks download checksum mismatch; refusing execution.')
            with tarfile.open(archive) as bundle: bundle.extractall(temp, filter='data')
            executable = str(temp / 'gitleaks')
        paths = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
        snapshot = temp / 'source'; snapshot.mkdir()
        forbidden = {'.p12', '.pfx', '.p8', '.pem', '.key', '.cer', '.cert', '.mobileprovision', '.provisionprofile', '.keychain', '.keychain-db'}
        violations = []
        for name in sorted(set(paths) - {''}):
            source = ROOT / name
            if source.suffix.lower() in forbidden or (source.name.startswith('.env') and not source.name.endswith('.example')):
                violations.append(name)
            if source.is_file() and not source.is_symlink():
                target = snapshot / name; target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
        if violations: raise SystemExit('Credential filenames must not be tracked: ' + ', '.join(violations))
        flags = ['--redact', '--no-banner', '--gitleaks-ignore-path', str(ROOT / '.gitleaksignore')]
        results = [subprocess.run([executable, 'git', *flags, '--log-opts=--all', str(ROOT)], cwd=ROOT).returncode,
                   subprocess.run([executable, 'dir', *flags, str(snapshot)], cwd=ROOT).returncode]
        if any(results): raise SystemExit('Secret scan failed. Review redacted findings privately before publishing.')
        print('History and current source scan passed; reviewed historical exceptions are recorded in .gitleaksignore.')

if __name__ == '__main__': main()
