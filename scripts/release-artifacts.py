#!/usr/bin/env python3
"""Assemble documentation, checksums and release metadata without publishing."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile
from version import ROOT, check


EDITIONS = {
    'mac-arm64': ['Merkzeug-{version}-mac-arm64.dmg'],
    'mac-x64': ['Merkzeug-{version}-mac-x64.dmg'],
    'win-x64': ['Merkzeug-{version}-win-x64.exe'],
    'win-arm64': ['Merkzeug-{version}-win-arm64.exe'],
    'linux-x64': ['Merkzeug-{version}-linux-x64.AppImage', 'Merkzeug-{version}-linux-x64.deb', 'Merkzeug-{version}-linux-x64.rpm'],
    'intellij': ['merkzeug-{version}.zip'],
}

def selected_editions(value):
    result = value.split(',') if value else list(EDITIONS)
    if not result or len(result) != len(set(result)) or any(e not in EDITIONS for e in result):
        raise ValueError('Select unique known editions: ' + ','.join(EDITIONS))
    return result

def assemble(directory: Path, complete=False, editions=None):
    version = check()
    directory.mkdir(parents=True, exist_ok=True)
    docs = directory / f'merkzeug-{version}-documentation.zip'
    sources = [ROOT / name for name in ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md']]
    if (ROOT / 'LICENSE').exists(): sources.append(ROOT / 'LICENSE')
    sources += list((ROOT / 'docs').rglob('*.md'))
    sources += [ROOT / 'crossplatform/resources/help/Help.en.md', ROOT / 'crossplatform/resources/help/Help.de.md',
                ROOT / 'mobile/src/help/Help.en.md', ROOT / 'mobile/src/help/Help.de.md',
                ROOT / 'crossplatform/README.md', ROOT / 'intellij/README.md', ROOT / 'mobile/README.md']
    sources += [p for p in (ROOT / 'store').rglob('*') if p.is_file()]
    with zipfile.ZipFile(docs, 'w', zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(set(sources)):
            archive.write(source, source.relative_to(ROOT).as_posix())
    allowed = {'.dmg', '.exe', '.AppImage', '.deb', '.rpm', '.zip'}
    assets = sorted(p for p in directory.iterdir() if p.is_file() and p.suffix in allowed)
    selected = selected_editions(editions) if editions is not None else list(EDITIONS)
    if complete or editions is not None:
        expected = {name.format(version=version) for edition in selected for name in EDITIONS[edition]} | {docs.name}
        actual = {p.name for p in assets}
        if actual != expected: raise ValueError(f'Release asset mismatch: missing={sorted(expected-actual)}, unexpected={sorted(actual-expected)}')
    entries = []
    for asset in assets:
        if version not in asset.name: raise ValueError(f'Artifact has wrong version: {asset.name}')
        with asset.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        entries.append({'file':asset.name,'bytes':asset.stat().st_size,'sha256':digest})
    (directory/'SHA256SUMS.txt').write_text(''.join(f"{a['sha256']}  {a['file']}\n" for a in entries))
    commit = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    dirty = bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip())
    manifest = {'version':version,'sourceCommit':commit,'workingTreeModified':dirty,
                'workflowRun':os.environ.get('GITHUB_RUN_ID'),'completeMatrix':complete and set(selected)==set(EDITIONS),'selectedEditions':selected if complete or editions is not None else [],'artifacts':entries,
                'signing':os.environ.get('MERKZEUG_RELEASE_SIGNING','not recorded; local build')}
    (directory/'release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    notes = f'''# Merkzeug {version}

Included editions: {", ".join(selected) if complete or editions is not None else "local subset; not release validated"}.
Unselected editions are not part of this release candidate.
The IntelliJ plugin targets IDEA 2026.2.2 / build 262.10315+ within 262, with JCEF enabled.
iOS is not distributed in this release; no VS Code binary is included.

Signing: {manifest['signing']}.

Verify downloads with SHA256SUMS.txt. See the documentation ZIP for installation,
PDF templates and troubleshooting. Automatic updates are not implemented.

Known limitations: IntelliJ dark-theme contrast and cross-document heading navigation;
iOS native regression testing remains separate from web builds.

Source commit: {commit}. Local working-tree modifications: {dirty}.

Maintainer: replace this paragraph with the reviewed changelog, platform smoke-test
results and signing verification before publishing this draft.
'''
    (directory/'release-notes.md').write_text(notes)
    print(f'Prepared {len(entries)} assets in {directory}; nothing published.')

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory',type=Path);parser.add_argument('--complete',action='store_true')
    parser.add_argument('--editions',help='Comma-separated edition keys; enforces exactly that subset')
    args=parser.parse_args()
    try: assemble(args.directory.resolve(),args.complete,args.editions)
    except ValueError as error: parser.exit(1,str(error)+'\n')
