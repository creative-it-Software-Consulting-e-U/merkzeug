#!/usr/bin/env python3
"""Collect a reviewable Marketplace upload kit from an already validated build."""
import hashlib, io, json, shutil, subprocess, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
version = (ROOT/'VERSION').read_text().strip()
subprocess.run(['node', str(ROOT / 'scripts/build-licenses.mjs')], cwd=ROOT, check=True)
archive = ROOT/f'intellij/dist/merkzeug-{version}.zip'
out = ROOT/f'release-artifacts/jetbrains-{version}/upload'
out.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(archive) as outer:
    assert outer.namelist() == ['merkzeug/lib/merkzeug.jar'], 'Unexpected distribution layout'
    with zipfile.ZipFile(io.BytesIO(outer.read(outer.namelist()[0]))) as jar:
        names = jar.namelist()
        assert not any(n.endswith('.mp4') or 'SmokeStarter' in n or 'CaptureStarter' in n for n in names), 'Unpublished/test assets in release'
        assert jar.read('META-INF/LICENSE') == ((ROOT/'resources/legal/EULA.en.md').read_text()+'\n'+(ROOT/'resources/legal/INTELLIJ-ADDENDUM.en.md').read_text()).encode(), 'Stale license'
        assert jar.read('META-INF/EULA.de.md') == ((ROOT/'resources/legal/EULA.de.md').read_text()+'\n'+(ROOT/'resources/legal/INTELLIJ-ADDENDUM.de.md').read_text()).encode(), 'Stale German license'
        (out/'EULA.en.md').write_bytes(jar.read('META-INF/LICENSE'))
        (out/'EULA.de.md').write_bytes(jar.read('META-INF/EULA.de.md'))
        plugin = ET.fromstring(jar.read('META-INF/plugin.xml'))
        assert plugin.findtext('version') == version
        assert plugin.findtext('id') == 'com.creativeit.merkzeug'
        assert plugin.find('vendor').get('email')
        assert '<li>' in plugin.findtext('change-notes')
        for name in ['pluginIcon.svg','THIRD_PARTY_NOTICES.txt']:
            (out/name).write_bytes(jar.read('META-INF/'+name))
        for name, tag in [('description-en.html','description'),('change-notes.html','change-notes')]:
            (out/name).write_text(plugin.findtext(tag).strip()+'\n')
shutil.copy2(archive,out/archive.name)
for source,name in [('store/jetbrains-marketplace.md','listing-en-de.md'),('store/jetbrains-upload.md','UPLOAD-GUIDE.md')]:
    shutil.copy2(ROOT/source,out/name)
capture = ROOT/'intellij/build/marketplace-capture'
for name in ['01-editor.png','02-template-preview.png']:
    shutil.copy2(capture/name,out/name)
(out/'SCREENSHOTS.md').write_text('Actual IntelliJ/JCEF plugin UI, captured with intellij/capture-marketplace.py from the synthetic Project plan.md fixture. The isolated plugin window is captured by window ID, without unrelated desktop content. Visually review both images before uploading. No personal notes. Screenshots show the dark IDE appearance and the light PDF template editing preview. UI controls and sample content are English.\n')
(out/'START-HERE.md').write_text(f'''# Merkzeug {version}: Marketplace upload kit

Upload **merkzeug-{version}.zip** unchanged. The other files are supporting material.

- Name: Merkzeug
- Vendor: creative-it Software & Consulting e.U.
- Price: Free
- License: MIT — the upload kit includes the exact license text.
- Channel: default (stable), after validation and approval.
- Source code URL: https://github.com/creative-it-Software-Consulting-e-U/merkzeug (set only after the repository is public).
- Website: https://merkzeug.creative-it.com/
- Support: https://support.apps.creative-it.com/?app=merkzeug&lang=en
- Compatibility: IntelliJ IDEA 2026.2.2, build 262.10315.125, JCEF enabled.

The ZIP includes the description, change notes, SVG logo, MIT license and third-party notices. Two screenshots are included here for the listing. Full English/German copy is in listing-en-de.md.

Marketplace license URLs: https://merkzeug.creative-it.com/license-intellij-en.html and https://merkzeug.creative-it.com/license-intellij-de.html. These URLs already exist, but retain the previous license until the coordinated website deployment. Before uploading a future version, verify that the hosted license matches the included EULA text; you can also paste the included text into the Marketplace form.

This kit has not been uploaded or published. Coordinate the first MIT release with the website and store license updates; do not upload as part of public-release preparation.
''')
manifest = {'version':version,'pluginId':'com.creativeit.merkzeug','sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'sourceDirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()),'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.iterdir()) if p.is_file() and p.name!='manifest.json'}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(out)
print('ZIP SHA-256: '+manifest['files'][archive.name])
