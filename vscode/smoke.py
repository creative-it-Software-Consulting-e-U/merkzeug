#!/usr/bin/env python3
"""Isolated native integration test in a separate VS Code profile.

Builds the extension, creates a synthetic workspace and runs test/smoke.cjs inside the real
extension host: web shell boot, document synchronization, undo/redo, save, images, templates,
headless-Chromium PDF output and rename/move refactoring. The user's normal VS Code profile and
extensions are not touched. Set VSCODE_BINARY to use another VS Code installation.
"""
import base64
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT / 'vscode'
BUILD = HERE / 'build/smoke'
DEFAULT = {'darwin': '/Applications/Visual Studio Code.app/Contents/MacOS/Code', 'win32': os.path.expandvars(r'%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe')}
binary = os.environ.get('VSCODE_BINARY') or DEFAULT.get(sys.platform) or shutil.which('code') or 'code'
if '--no-build' not in sys.argv: subprocess.run([sys.executable, str(HERE / 'build.py')], check=True)
if BUILD.exists(): shutil.rmtree(BUILD)
workspace = BUILD / 'workspace'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
files = {
    'Note.md': '---\ntitle: Smoke Test\n---\n# Hello Merkzeug\n\nHello world with Umlauts äöü.\n\n![Pic](Note.assets/pic.png)\n\nSee [Other](Other.md).\n\n```mermaid\ngraph TD\n  A-->B\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n',
    'Other.md': '# Other\n\nLinked appendix.\n',
    'Linker.md': '# Linker\n\n[Note](Note.md) and ![pic](Note.assets/pic.png)\n',
    '.merkzeug/templates/Smoke/stil.css': '/* Smoke template */ h1 { color: #2f6feb; }\n',
    '.merkzeug/templates/Smoke/kopfzeile.html': '<div style="font-size:8px;width:100%;text-align:center"><img src="logo.png" style="height:8px"> {{titel}}</div>\n',
    '.merkzeug/templates/Smoke/fusszeile.html': '<div style="font-size:8px;width:100%;text-align:center"><span class="pageNumber"></span></div>\n',
    '.merkzeug/templates/Smoke/vorlage.json': '{"margins":{"top":20,"bottom":15,"left":15,"right":15}}\n',
}
for name, content in files.items():
    (workspace / name).parent.mkdir(parents=True, exist_ok=True)
    (workspace / name).write_text(content)
for name in ['Note.assets/pic.png', '.merkzeug/templates/Smoke/logo.png']:
    (workspace / name).parent.mkdir(parents=True, exist_ok=True)
    (workspace / name).write_bytes(PNG)
env = {key: value for key, value in os.environ.items() if key != 'ELECTRON_RUN_AS_NODE'}
env['MERKZEUG_PDF_TARGET'] = str(BUILD / 'actual.pdf')
# The profile path must stay short: VS Code's IPC socket path is limited to 103 characters.
profile = tempfile.mkdtemp(prefix='mz-vsc-', dir='/tmp' if os.path.isdir('/tmp') else None)
(Path(profile) / 'User').mkdir(parents=True)
(Path(profile) / 'User/settings.json').write_text('{"explorer.confirmUndo": "light", "workbench.startupEditor": "none"}')
result = subprocess.run([binary, '--user-data-dir', profile, '--extensions-dir', str(BUILD / 'extensions'),
    '--disable-extensions', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes', '--disable-telemetry', '--new-window',
    f'--extensionDevelopmentPath={HERE / "build/extension"}', f'--extensionTestsPath={HERE / "test/smoke.cjs"}', str(workspace)], env=env)
shutil.rmtree(profile, ignore_errors=True)
if result.returncode: raise SystemExit(f'VS Code smoke test failed ({result.returncode})')
print('Inspect', BUILD / 'actual.pdf', 'visually after rendering changes.')
