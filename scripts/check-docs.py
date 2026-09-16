#!/usr/bin/env python3
"""Check local Markdown file links in maintained documentation (not remote availability)."""
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT=Path(__file__).resolve().parents[1]
files=list((ROOT/'docs').rglob('*.md'))+list((ROOT/'store').rglob('*.md'))+[ROOT/name for name in ['README.md','CONTRIBUTING.md','SECURITY.md','CHANGELOG.md','crossplatform/README.md','mobile/README.md','intellij/README.md','legacy/README.md']]
errors=[]
for file in files:
    text=re.sub(r'```[\s\S]*?```','',file.read_text())
    text=re.sub(r'`[^`\n]+`','',text)
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
        target=target.split('#')[0].strip('<>')
        if not target or re.match(r'[a-zA-Z][a-zA-Z\d+.-]*:',target):continue
        target=unquote(target)
        resolved=(file.parent/target).resolve()
        if not resolved.exists():errors.append(f'{file.relative_to(ROOT)}: missing {target}')
# English user-facing prose must not regress to untranslated German UI labels.
# Persisted template filenames and placeholder keys inside code remain unchanged.
english_help = [ROOT/'crossplatform/resources/help/Help.en.md', ROOT/'mobile/src/help/Help.en.md'] + [p for p in (ROOT/'docs/user').glob('*.md') if not p.name.endswith('.de.md')]
german_labels = ['Ablage', 'Neue Notiz', 'Neue Meeting-Notiz', 'Frühere anzeigen', 'Suchen', 'Ersetzen', 'Anlegen', '+ Feld', 'Inhaltsverzeichnis', 'Neustrukturierung']
for file in english_help:
    prose = re.sub(r'```[\s\S]*?```', '', file.read_text())
    prose = re.sub(r'`[^`\n]+`', '', prose)
    prose = re.sub(r'\s+', ' ', prose)
    for label in german_labels:
        if re.search(r'(?<!\w)' + re.escape(label) + r'(?!\w)', prose):
            errors.append(f'{file.relative_to(ROOT)}: untranslated German label: {label}')
if errors:
    print('\n'.join(errors),file=sys.stderr);sys.exit(1)
print(f'Checked local file links in {len(files)} documentation files.')
