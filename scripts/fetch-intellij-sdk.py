#!/usr/bin/env python3
"""Download the pinned Linux IDE SDK for CI; never install it in a user's IDE."""
import hashlib
import json
import shutil
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
config = json.loads((root / 'intellij/sdk.json').read_text())
target = Path(sys.argv[1]).resolve()
if target.exists(): raise SystemExit(f'Target already exists: {target}')
target.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(dir=target.parent) as temp:
    temp = Path(temp)
    archive = temp / 'sdk.tar.gz'
    digest = hashlib.sha256()
    with urllib.request.urlopen(config['linuxUrl'], timeout=60) as response, archive.open('wb') as out:
        while chunk := response.read(1024 * 1024):
            out.write(chunk); digest.update(chunk)
    if digest.hexdigest() != config['linuxSha256']:
        raise SystemExit('IntelliJ SDK checksum mismatch')
    unpack = temp / 'unpacked'; unpack.mkdir()
    with tarfile.open(archive) as tar: tar.extractall(unpack, filter='data')
    roots = [p for p in unpack.iterdir() if (p / 'product-info.json').is_file()]
    if len(roots) != 1: raise SystemExit('Unexpected SDK archive layout')
    info = json.loads((roots[0] / 'product-info.json').read_text())
    if info['version'] != config['version'] or info['buildNumber'] != config['build']:
        raise SystemExit('SDK version does not match the pinned manifest')
    shutil.move(str(roots[0]), target)
print(target)
