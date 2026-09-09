#!/usr/bin/env python3
"""Resolve the requested independent editions into a build matrix."""
import importlib.util
import json
import os
from pathlib import Path
spec=importlib.util.spec_from_file_location('release_artifacts',Path(__file__).with_name('release-artifacts.py'))
module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
editions=module.selected_editions(os.environ.get('RELEASE_EDITIONS') or None)
runner={'mac-arm64':'macos-15','mac-x64':'macos-15-intel','win-x64':'windows-2025','win-arm64':'windows-2025','linux-x64':'ubuntu-24.04'}
rows=[dict(os=runner[e],platform=e.split('-')[0],arch=e.split('-')[1]) for e in editions if e!='intellij']
# An ignored placeholder keeps GitHub's matrix valid for IntelliJ-only releases.
values={'editions':','.join(editions),'desktop':str(bool(rows)).lower(),'intellij':str('intellij' in editions).lower(),'matrix':json.dumps({'include':rows or [{'os':'ubuntu-24.04','platform':'linux','arch':'x64'}]})}
with open(os.environ['GITHUB_OUTPUT'],'a') as output:
    for key,value in values.items():output.write(f'{key}={value}\n')
