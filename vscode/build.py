#!/usr/bin/env python3
"""Build the VS Code extension as an installable VSIX. Nothing is installed or published here.

--marketplace omits the unpublished guided tour, like the IntelliJ Marketplace build.
The unpacked extension in vscode/build/extension can be used with --extensionDevelopmentPath.
"""
import json
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

MARKETPLACE = '--marketplace' in sys.argv
ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT / 'vscode'
STAGE = HERE / 'build/extension'
sys.path.insert(0, str(ROOT / 'scripts'))
from version import check
version = check()

npm = 'npm.cmd' if os.name == 'nt' else 'npm'
if STAGE.exists(): shutil.rmtree(STAGE)
subprocess.run(['node', str(ROOT / 'scripts/third-party-notices.mjs')], cwd=ROOT, check=True)
subprocess.run([npm, 'run', 'build', '-w', 'merkzeug-vscode'], cwd=ROOT, check=True,
               env=dict(os.environ, **({'VITE_MERKZEUG_TOURS': 'disabled'} if MARKETPLACE else {})))

source = json.loads((HERE / 'package.json').read_text())
nls = json.loads((HERE / 'package.nls.json').read_text())
manifest = {key: value for key, value in source.items() if key not in ('private', 'scripts', 'dependencies', 'devDependencies')}
manifest['name'] = 'merkzeug'
manifest['repository'] = {'type': 'git', 'url': 'https://github.com/creative-it-Software-Consulting-e-U/merkzeug.git'}
manifest['bugs'] = {'url': 'https://support.apps.creative-it.com/?app=merkzeug&environment=VS%20Code'}
(STAGE / 'package.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
for name in ['package.nls.json', 'package.nls.de.json']: shutil.copy(HERE / name, STAGE / name)
(STAGE / 'resources').mkdir(exist_ok=True)
shutil.copy(HERE / 'resources/icon.png', STAGE / 'resources/icon.png')
shutil.copytree(ROOT / 'resources/pdf-templates', STAGE / 'resources/pdf-templates')
shutil.copy(HERE / 'resources/marketplace.md', STAGE / 'README.md')
shutil.copy(ROOT / 'LICENSE', STAGE / 'LICENSE.txt')
shutil.copy(ROOT / 'crossplatform/resources/THIRD_PARTY_NOTICES.txt', STAGE / 'THIRD_PARTY_NOTICES.txt')
for required in ['extension.js', 'web/index.html']:
    if not (STAGE / required).is_file(): raise SystemExit(f'Missing build output: {required}')

def text(value):
    return nls.get(value[1:-1], value) if value.startswith('%') and value.endswith('%') else value

identity = f'<Identity Language="en-US" Id="{manifest["name"]}" Version="{version}" Publisher="{manifest["publisher"]}" />'
properties = {
    'Microsoft.VisualStudio.Code.Engine': manifest['engines']['vscode'],
    'Microsoft.VisualStudio.Code.ExtensionDependencies': '', 'Microsoft.VisualStudio.Code.ExtensionPack': '',
    'Microsoft.VisualStudio.Code.ExtensionKind': ','.join(manifest['extensionKind']),
    'Microsoft.VisualStudio.Code.LocalizedLanguages': '',
    'Microsoft.VisualStudio.Services.Links.Source': manifest['repository']['url'],
    'Microsoft.VisualStudio.Services.Links.Learn': manifest['homepage'],
    'Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown': 'true',
    'Microsoft.VisualStudio.Services.Content.Pricing': 'Free',
}
vsixmanifest = f'''<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    {identity}
    <DisplayName>{escape(text(manifest["displayName"]))}</DisplayName>
    <Description xml:space="preserve">{escape(text(manifest["description"]))}</Description>
    <Tags>{escape(",".join(manifest["keywords"]))}</Tags>
    <Categories>{escape(",".join(manifest["categories"]))}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
{chr(10).join(f'      <Property Id="{key}" Value="{escape(value)}" />' for key, value in properties.items())}
    </Properties>
    <License>extension/LICENSE.txt</License>
    <Icon>extension/resources/icon.png</Icon>
  </Metadata>
  <Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE.txt" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/resources/icon.png" Addressable="true" />
  </Assets>
</PackageManifest>
'''
files = sorted(p for p in STAGE.rglob('*') if p.is_file())
types = {'.vsixmanifest': 'text/xml', '.json': 'application/json', '.js': 'application/javascript', '.md': 'text/markdown',
         '.txt': 'text/plain', '.png': 'image/png', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml',
         '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.jpg': 'image/jpeg'}
extensions = sorted({'.vsixmanifest', *(p.suffix.lower() for p in files if p.suffix)})
content_types = '<?xml version="1.0" encoding="utf-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' + ''.join(
    f'<Default Extension="{extension}" ContentType="{types.get(extension, "application/octet-stream")}"/>' for extension in extensions) + '</Types>\n'
dist = HERE / 'dist'
dist.mkdir(exist_ok=True)
target = dist / f'merkzeug-{version}.vsix'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as out:
    out.writestr('extension.vsixmanifest', vsixmanifest)
    out.writestr('[Content_Types].xml', content_types)
    for file in files: out.write(file, 'extension/' + file.relative_to(STAGE).as_posix())
print(target)
