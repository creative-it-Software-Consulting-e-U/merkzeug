#!/usr/bin/env python3
"""Capture desktop screenshot candidates with a fresh app profile and synthetic notes."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
parser.add_argument('--locale', choices=['en', 'de'])
parser.add_argument('--scene', choices=['writing', 'diagram', 'frontmatter', 'git', 'pdf'])
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
resolved = subprocess.check_output(['node', '-e', "const executable = require('electron'); console.log(JSON.stringify(executable))"], cwd=ROOT/'crossplatform', text=True)
# Electron may download its binary lazily and log to stdout on a clean runner.
electron = Path(json.loads(resolved.strip().splitlines()[-1]))
if not electron.exists(): raise SystemExit('Install dependencies and run npm run build:desktop first.')
for language, scenes in {'en': {'writing': 'Welcome', 'diagram': 'Projects;;Garden', 'frontmatter': "Welcome;;js:document.querySelector('.frontmatter-toggle')?.click()"},
                         'de': {'writing': 'Willkommen', 'diagram': 'Projekte;;Garten', 'frontmatter': "Willkommen;;js:document.querySelector('.frontmatter-toggle')?.click()"}}.items():
    if args.locale and language != args.locale: continue
    welcome = 'Welcome' if language == 'en' else 'Willkommen'
    template = 'Project report' if language == 'en' else 'Projektbericht'
    scenes['git'] = welcome + ";;js:document.querySelector('.git-summary')?.click()"
    scenes['pdf'] = welcome + ';;menu:exportPdf;;settingswindow'
    for scene, clicks in scenes.items():
        if args.scene and scene != args.scene: continue
        with tempfile.TemporaryDirectory(prefix='merkzeug-capture-') as profile:
            target = (args.output / f'macos-{language}-{scene}.png').resolve()
            target.unlink(missing_ok=True)
            demo = Path(profile) / 'Demo Vault'
            shutil.copytree(ROOT / 'store/demo' / language, demo)
            if scene == 'git':
                def git(*args):
                    subprocess.run(['git', '-c', 'user.name=Demo Author', '-c', 'user.email=demo@example.invalid', *args], cwd=demo, check=True, stdout=subprocess.DEVNULL)
                git('init', '-b', 'main')
                git('add', '.')
                git('commit', '-m', 'Create shared notebook')
                # A real local-only remote enables the UI without contacting any server.
                remote = Path(profile) / 'shared-notes.git'
                subprocess.run(['git', 'init', '--bare', str(remote)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                git('remote', 'add', 'origin', str(remote))
                git('push', '-u', 'origin', 'main')
                note = demo / (welcome + '.md')
                note.write_text(note.read_text() + ('\nNext step: share the project plan.\n' if language == 'en' else '\nNächster Schritt: den Projektplan teilen.\n'))
            if scene == 'pdf':
                template_dir = Path(profile) / 'PDF Templates' / template
                template_dir.mkdir(parents=True)
                (template_dir/'kopfzeile.html').write_text('<div style="font-size:9px;width:100%;text-align:center">{{titel}}</div>')
                (template_dir/'fusszeile.html').write_text('<div style="font-size:9px;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>')
                (template_dir/'deckblatt.html').write_text('<h1>{{titel}}</h1>')
                (demo/'.merkzeug').mkdir(exist_ok=True)
                (demo/'.merkzeug/settings.json').write_text(json.dumps({'pdfTemplate':template}))
            env = dict(os.environ, MERKZEUG_SCREENSHOT=str(target), MERKZEUG_SCREENSHOT_PROFILE=profile,
                       MERKZEUG_VAULT=str(demo), MERKZEUG_CLICK=clicks, MERKZEUG_TEMPLATES_ROOT=str(Path(profile)/'PDF Templates'),
                       MERKZEUG_SCREENSHOT_READY='.mermaid-preview svg' if scene == 'diagram' else '.git-detail' if scene == 'git' else '.ProseMirror h1')
            if scene == 'pdf':
                env.update(MERKZEUG_PDF_TARGET=str((args.output/f'macos-{language}-template-proof.pdf').resolve()), MERKZEUG_PDF_TEMPLATE=template)
            env.pop('ELECTRON_RUN_AS_NODE', None)
            subprocess.run([str(electron), str(ROOT / 'crossplatform'), '--lang=' + language], env=env, check=True, timeout=90)
            if scene == 'pdf':
                proof = args.output/f'macos-{language}-template-proof.pdf'
                if not proof.is_file() or not proof.read_bytes().startswith(b'%PDF-'): raise SystemExit('Template PDF export did not finish')
                target.with_name(target.stem + '-settings.png').replace(target)
            if not target.is_file(): raise SystemExit('Capture failed: ' + str(target))
            print(target, flush=True)
print('Desktop build candidates; recapture from the signed MAS build before store upload.')
