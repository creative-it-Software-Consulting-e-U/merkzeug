#!/usr/bin/env python3
"""Build the Foundation iCloud bridge using stable Node-API, without downloading SDKs."""
import argparse
import platform
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--arch', choices=['arm64', 'x64', 'universal'], default='arm64' if platform.machine() == 'arm64' else 'x64')
args = parser.parse_args()
node = Path(subprocess.check_output(['node', '-p', 'process.execPath'], text=True).strip()).resolve()
headers = node.parent.parent / 'include/node'
if not (headers / 'node_api.h').is_file():
    raise SystemExit('Node distribution headers missing: ' + str(headers))
output = ROOT / 'crossplatform/resources/icloud/merkzeug-icloud.node'
arches = ['arm64', 'x86_64'] if args.arch == 'universal' else ['x86_64' if args.arch == 'x64' else args.arch]
with tempfile.TemporaryDirectory(prefix='merkzeug-icloud-build-') as folder:
    slices = []
    for arch in arches:
        target = str(Path(folder) / arch)
        subprocess.run(['xcrun', 'clang', '-arch', arch, '-mmacosx-version-min=12.0', '-fobjc-arc', '-bundle', '-undefined', 'dynamic_lookup', '-framework', 'Foundation', '-DNAPI_VERSION=8', '-I', str(headers), str(output.with_name('container.m')), '-o', target], check=True)
        slices.append(target)
    subprocess.run(['xcrun', 'lipo', '-create', *slices, '-output', str(output)], check=True)
print(output)
