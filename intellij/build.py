#!/usr/bin/env python3
"""Build against the installed IDE SDK, without downloading a second IntelliJ.

IDEA_HOME may point to an IntelliJ installation; defaults to the macOS app.
Produces an installable ZIP. No installation or IDE restart is performed here.
"""
import os
import json
import sys
from pathlib import Path
import shutil
import subprocess
import zipfile

MARKETPLACE = '--marketplace' in sys.argv
ROOT = Path(__file__).resolve().parent.parent
IDE = Path(os.environ.get('IDEA_HOME', '/Applications/IntelliJ IDEA.app/Contents'))
BUILD = ROOT / 'intellij/build'
sys.path.insert(0, str(ROOT / 'scripts'))
from version import check
version = check()
pin = json.loads((ROOT / 'intellij/sdk.json').read_text())
info_path = IDE / 'product-info.json'
if not info_path.exists(): info_path = IDE / 'Resources/product-info.json'
info = json.loads(info_path.read_text())
if info['version'] != pin['version'] or info['buildNumber'] != pin['build']:
    raise SystemExit('IDEA_HOME must match intellij/sdk.json; update and verify compatibility before changing SDKs')
subprocess.run(['node', str(ROOT / 'scripts/third-party-notices.mjs')], cwd=ROOT, check=True)
subprocess.run(['npm.cmd' if os.name == 'nt' else 'npm', 'run', 'build', '-w', 'merkzeug-intellij-web'], cwd=ROOT, check=True, env=dict(os.environ, **({'VITE_MERKZEUG_TOURS': 'disabled'} if MARKETPLACE else {})))
javac = IDE / 'jbr/Contents/Home/bin/javac'
if not javac.exists():
    javac = IDE / 'jbr/bin/javac'
if not javac.exists():
    javac = Path(shutil.which('javac') or 'javac')
jars = list((IDE / 'lib').glob('*.jar')) + list((IDE / 'plugins/jcef-plugin').rglob('*.jar'))
classes = BUILD / 'classes'
if classes.exists(): shutil.rmtree(classes)
classes.mkdir(parents=True)
sources = sorted((ROOT / 'intellij/src/main/java').rglob('*.java'))
subprocess.run([str(javac), '-encoding', 'UTF-8', '--release', '21', '-classpath', os.pathsep.join(map(str, jars)), '-d', str(classes), *map(str, sources)], check=True)
jar = BUILD / 'merkzeug.jar'
with zipfile.ZipFile(jar, 'w', zipfile.ZIP_DEFLATED) as out:
    out.writestr('META-INF/merkzeug-version.txt', version + '\n')
    out.write(ROOT / 'LICENSE', 'META-INF/LICENSE')
    out.write(ROOT / 'resources/legal/EULA.de.md', 'META-INF/EULA.de.md')
    out.write(ROOT / 'crossplatform/resources/THIRD_PARTY_NOTICES.txt', 'META-INF/THIRD_PARTY_NOTICES.txt')
    for base, prefix in [(ROOT / 'resources/pdf-templates', 'pdf-templates/'), (classes, ''), (ROOT / 'intellij/src/main/resources', ''), (BUILD / 'web', 'web/')]:
        for file in sorted(base.rglob('*')):
            if file.is_file(): out.write(file, prefix + file.relative_to(base).as_posix())
dist = ROOT / 'intellij/dist'
dist.mkdir(exist_ok=True)
target = dist / f'merkzeug-{version}.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as out:
    out.write(jar, 'merkzeug/lib/merkzeug.jar')
print(target)
