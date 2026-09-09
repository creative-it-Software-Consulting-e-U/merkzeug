#!/usr/bin/env python3
"""Capture desktop screenshot candidates with a fresh app profile and synthetic notes."""
import argparse
import os
from pathlib import Path
import subprocess
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
parser.add_argument('--locale', choices=['en', 'de'])
parser.add_argument('--scene', choices=['writing', 'diagram'])
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
electron = ROOT / 'crossplatform/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
if not electron.exists(): raise SystemExit('Install dependencies and run npm run build:desktop first.')
for language, scenes in {'en': {'writing': 'Welcome', 'diagram': 'Projects;;Garden'},
                         'de': {'writing': 'Willkommen', 'diagram': 'Projekte;;Garten'}}.items():
    if args.locale and language != args.locale: continue
    for scene, clicks in scenes.items():
        if args.scene and scene != args.scene: continue
        with tempfile.TemporaryDirectory(prefix='merkzeug-capture-') as profile:
            target = (args.output / f'macos-{language}-{scene}.png').resolve()
            target.unlink(missing_ok=True)
            demo = Path(profile) / 'Demo Vault'
            shutil.copytree(ROOT / 'store/demo' / language, demo)
            env = dict(os.environ, MERKZEUG_SCREENSHOT=str(target), MERKZEUG_SCREENSHOT_PROFILE=profile,
                       MERKZEUG_VAULT=str(demo), MERKZEUG_CLICK=clicks,
                       MERKZEUG_SCREENSHOT_READY='.mermaid-preview svg' if scene == 'diagram' else '.ProseMirror h1')
            env.pop('ELECTRON_RUN_AS_NODE', None)
            subprocess.run([str(electron), str(ROOT / 'crossplatform'), '--lang=' + language], env=env, check=True, timeout=90)
            if not target.is_file(): raise SystemExit('Capture failed: ' + str(target))
            print(target, flush=True)
print('Desktop build candidates; recapture from the signed MAS build before store upload.')
