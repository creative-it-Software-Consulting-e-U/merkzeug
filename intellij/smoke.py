#!/usr/bin/env python3
"""Isolated integration test with the installed IntelliJ/JCEF runtime.
Does not restart, reconfigure or install plugins in the user's running IDE.
"""
import os, subprocess, zipfile, json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
IDE = Path(os.environ.get('IDEA_HOME', '/Applications/IntelliJ IDEA.app/Contents'))
TEST = ROOT / 'intellij/build/smoke'
TEST.mkdir(parents=True, exist_ok=True)
for name in ['actual.pdf', 'passed.txt']:
    (TEST / name).unlink(missing_ok=True)
markdown = '''---
title: Merkzeug Integrationstest
pdf-toc: true
language: de
---
# Merkzeug Integrationstest

Gemeinsamer Editor und PDF-Export mit Umlauten: Äpfel, Größe, Übersicht.

## Diagramm

```mermaid
flowchart LR
  Markdown --> Editor
  Editor --> PDF
```

## Tabelle

| Plattform | Editor | PDF |
| --- | --- | --- |
| Desktop | Gemeinsam | Electron |
| IntelliJ | Gemeinsam | JCEF |

[Zum Anhang](anhang.md)
'''
(TEST / 'index.md').write_text(markdown)
(TEST / 'anhang.md').write_text('# Anhang\n\nVerlinktes Dokument mit **fetter Schrift**.\n')
payload = {'vault':str(TEST),'docs':[{'path':str(TEST/'index.md'),'content':markdown},{'path':str(TEST/'anhang.md'),'content':(TEST/'anhang.md').read_text()}], 'template':{'name':'Smoke','header':'<div style="font-size:9px;width:100%;text-align:center">MERKZEUG TEST HEADER</div>','footer':'<div style="font-size:9px;width:100%;text-align:center">Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>','cover':'<div style="padding:100px 30px"><h1>Merkzeug</h1><p>Gemeinsame PDF-Basis</p></div>','margins':{'top':24,'bottom':18,'left':15,'right':15}}}
(TEST/'payload.json').write_text(json.dumps(payload))
classes=TEST/'classes';classes.mkdir(exist_ok=True)
jars=list((IDE/'lib').glob('*.jar'))+list((IDE/'plugins/jcef-plugin').rglob('*.jar'))+[ROOT/'intellij/build/merkzeug.jar']
subprocess.run([str(IDE/'jbr/Contents/Home/bin/javac'),'--release','21','-classpath',os.pathsep.join(map(str,jars)),'-d',str(classes),str(ROOT/'intellij/src/test/java/com/creativeit/merkzeug/SmokeStarter.java')],check=True)
plugin=TEST/'plugins/merkzeug/lib';plugin.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(ROOT/'intellij/build/merkzeug.jar') as src,zipfile.ZipFile(plugin/'merkzeug.jar','w',zipfile.ZIP_DEFLATED) as dst:
    for name in src.namelist():
        data=src.read(name)
        if name=='META-INF/plugin.xml': data=data.decode().replace('<fileEditorProvider ', '<appStarter id="merkzeugSmoke" implementation="com.creativeit.merkzeug.SmokeStarter"/><fileEditorProvider ').encode()
        dst.writestr(name,data)
    for path in classes.rglob('*.class'):dst.write(path,path.relative_to(classes).as_posix())
props=TEST/'idea.properties'
props.write_text('\n'.join([f'idea.config.path={TEST}/config',f'idea.system.path={TEST}/system-{os.getpid()}',f'idea.plugins.path={TEST}/plugins',f'idea.log.path={TEST}/log',f'merkzeug.smoke.root={TEST}','idea.initially.ask.config=never']))
env=dict(os.environ,IDEA_PROPERTIES=str(props), IDEA_VM_OPTIONS=str(IDE / "bin/idea.vmoptions"))
subprocess.run([str(IDE/'MacOS/idea'),'merkzeugSmoke'],env=env,check=True,timeout=160)
