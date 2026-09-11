#!/usr/bin/env python3
"""Collect a reviewable Marketplace upload kit from an already validated build."""
import hashlib, io, json, shutil, subprocess, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
version = (ROOT/'VERSION').read_text().strip()
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
(out/'SCREENSHOTS.md').write_text('Actual IntelliJ/JCEF plugin UI, captured with intellij/capture-marketplace.py from the synthetic Project plan.md fixture. The editor area is captured without unrelated IDE or desktop content. No personal notes. Screenshots show the dark IDE appearance and the light PDF template editing preview. UI controls use German; sample content is English.\n')
(out/'START-HERE.md').write_text(f'''# Merkzeug {version}: Marketplace upload kit

Upload **merkzeug-{version}.zip** unchanged. The other files are supporting material.

- Name: Merkzeug
- Vendor: creative-it Software Consulting e.U.
- Price: Free
- License: Custom / proprietary — paste EULA.en.md, after reviewing the new terms.
- Suggested channel: beta (or keep the first upload hidden until ready).
- Source code URL: leave empty; the repository stays private.
- Website: https://merkzeug.creative-it.com/
- Support: https://support.apps.creative-it.com/?app=merkzeug&lang=en
- Compatibility: IntelliJ IDEA 2026.2.2, build 262.10315.125, JCEF enabled.

The ZIP includes the description, change notes, SVG logo, proprietary license and third-party notices. Two screenshots are included here for the listing. Full English/German copy is in listing-en-de.md.

The website license pages are prepared in the repository but have not been published. Until then, paste the included EULA text in the Marketplace form rather than supplying an unverified URL. Planned URLs: https://merkzeug.creative-it.com/license-intellij-en.html and https://merkzeug.creative-it.com/license-intellij-de.html.

This kit has not been uploaded or published. Do not use older MIT-labeled preview ZIPs for this release. Review the new contract text before public distribution.
''')
manifest = {'version':version,'pluginId':'com.creativeit.merkzeug','sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'sourceDirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()),'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.iterdir()) if p.is_file() and p.name!='manifest.json'}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(out)
print('ZIP SHA-256: '+manifest['files'][archive.name])
