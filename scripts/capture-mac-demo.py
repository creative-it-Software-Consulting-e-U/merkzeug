#!/usr/bin/env python3
"""Capture desktop screenshot candidates with a fresh app profile and synthetic notes."""
import argparse
import hashlib
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
parser.add_argument('--scene', choices=['writing', 'diagram', 'frontmatter', 'git', 'pdf', 'calendar'])
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
    scenes['calendar'] = welcome + ";;js:Date.now = () => Date.parse('2026-09-10T08:00:00Z'); undefined;;menu:newMeetingNote;;js:document.querySelector('.meeting-row')?.click(); undefined;;menu:newMeetingNote"
    scenes['pdf'] = welcome + ';;menu:exportPdf'
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
                shutil.copytree(ROOT/'resources/pdf-templates/Merkzeug', template_dir)
                (demo/'.merkzeug').mkdir(exist_ok=True)
                (demo/'.merkzeug/settings.json').write_text(json.dumps({'pdfTemplate':template}))
            if scene == 'calendar':
                title = 'Garden project planning' if language == 'en' else 'Planung Gemeinschaftsgarten'
                fixture = Path(profile)/'calendar.json'
                fixture.write_text(json.dumps({'events':[{'id':'demo-planning','title':title,'start':'2026-09-10T09:00:00Z','end':'2026-09-10T10:00:00Z','allDay':False,'location':'Garden studio' if language == 'en' else 'Gartenatelier','calendar':'Project team' if language == 'en' else 'Projektteam','organizer':{'name':'Alex Example'},'attendees':[{'name':'Sam Example'},{'name':'Robin Example'}]}]}))
            env = dict(os.environ, MERKZEUG_SCREENSHOT=str(target), MERKZEUG_SCREENSHOT_PROFILE=profile,
                       MERKZEUG_VAULT=str(demo), MERKZEUG_CLICK=clicks, MERKZEUG_TEMPLATES_ROOT=str(Path(profile)/'PDF Templates'),
                       MERKZEUG_SCREENSHOT_READY='.mermaid-preview svg' if scene == 'diagram' else '.git-detail' if scene == 'git' else '.meeting-row' if scene == 'calendar' else '.ProseMirror h1')
            if scene == 'pdf':
                (args.output/f'macos-{language}-template-proof.pdf').unlink(missing_ok=True)
                env.update(MERKZEUG_PDF_TARGET=str((args.output/f'macos-{language}-template-proof.pdf').resolve()), MERKZEUG_PDF_TEMPLATE=template)
            if scene == 'calendar':
                env.update(MERKZEUG_CALENDAR_FIXTURE=str(fixture), TZ='UTC')
            env.pop('ELECTRON_RUN_AS_NODE', None)
            subprocess.run([str(electron), str(ROOT / 'crossplatform'), '--lang=' + language], env=env, check=True, timeout=90)
            if scene == 'pdf':
                proof = args.output/f'macos-{language}-template-proof.pdf'
                if not proof.is_file() or not proof.read_bytes().startswith(b'%PDF-'): raise SystemExit('Template PDF export did not finish')
                subprocess.run(['xcrun', 'swift', str(ROOT/'store/automation/PdfSpread.swift'), str(proof), str(target)], check=True, timeout=90)
                target.with_suffix('.json').write_text(json.dumps({
                    'source': 'Actual app PDF export, composed with PDFKit',
                    'pdf': proof.name, 'pdfSHA256': hashlib.sha256(proof.read_bytes()).hexdigest(),
                    'imageSHA256': hashlib.sha256(target.read_bytes()).hexdigest(),
                    'templateSHA256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                                       for p in sorted((ROOT/'resources/pdf-templates/Merkzeug').iterdir()) if p.is_file()}
                }, indent=2) + '\n')
            if scene == 'calendar':
                notes = list(demo.rglob('2026-09-10-*.md'))
                if len(notes) != 1 or 'attendees:' not in notes[0].read_text(): raise SystemExit('Calendar event did not create a meeting note')
            if not target.is_file(): raise SystemExit('Capture failed: ' + str(target))
            print(target, flush=True)
print('Desktop build candidates; recapture from the signed MAS build before store upload.')
