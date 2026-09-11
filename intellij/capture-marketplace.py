#!/usr/bin/env python3
"""Capture real plugin UI with synthetic notes. Never reads the user's IDE profile."""
import os, subprocess, zipfile, shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
IDE = Path(os.environ.get('IDEA_HOME', '/Applications/IntelliJ IDEA.app/Contents'))
TEST = ROOT / 'intellij/build/marketplace-capture'
TEST.mkdir(parents=True, exist_ok=True)
# Reuse only the isolated smoke profile's completed first-run setup.
if not (TEST/'config/disabled_plugins.txt').exists():
    source_config = ROOT/'intellij/build/smoke/config'
    if not source_config.exists(): raise SystemExit('Run intellij/smoke.py first to initialize the isolated IDE test profile.')
    shutil.copytree(source_config,TEST/'config',dirs_exist_ok=True)
(TEST/'config/disabled_plugins.txt').write_text('com.intellij.modules.ultimate\n')
(TEST/'Project plan.md').write_text('''---
title: Project plan
status: Draft
---
# A place for your next idea

Write clear **Markdown notes** with diagrams, images and useful structure.
Your files stay in your project, ready for Git and your usual tools.

## From an idea to a finished document

```mermaid
flowchart LR
  A[Capture an idea] --> B[Shape your notes]
  B --> C[Add diagrams]
  C --> D[Export a PDF]
```

## Everything stays together

| File | Purpose |
| --- | --- |
| Project plan.md | Your Markdown document |
| Project plan.assets/ | Images belonging to this note |

> Rename or move a note with IntelliJ refactoring: its companion image folder follows.

- [x] Outline the idea
- [x] Connect the pieces
- [ ] Share the finished document
''')
shutil.copytree(ROOT/'resources/pdf-templates/Merkzeug', TEST/'Template', dirs_exist_ok=True)
classes=TEST/'classes'; classes.mkdir(exist_ok=True)
jars=list((IDE/'lib').glob('*.jar'))+list((IDE/'plugins/jcef-plugin').rglob('*.jar'))+[ROOT/'intellij/build/merkzeug.jar']
subprocess.run([str(IDE/'jbr/Contents/Home/bin/javac'),'--release','21','-classpath',os.pathsep.join(map(str,jars)),'-d',str(classes),str(ROOT/'intellij/src/test/java/com/creativeit/merkzeug/MarketplaceCaptureStarter.java')],check=True)
plugin=TEST/'plugins/merkzeug/lib';plugin.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(ROOT/'intellij/build/merkzeug.jar') as src,zipfile.ZipFile(plugin/'merkzeug.jar','w',zipfile.ZIP_DEFLATED) as dst:
    for name in src.namelist():
        data=src.read(name)
        if name=='META-INF/plugin.xml':data=data.decode().replace('<fileEditorProvider ', '<appStarter id="merkzeugCapture" implementation="com.creativeit.merkzeug.MarketplaceCaptureStarter"/><fileEditorProvider ').encode()
        dst.writestr(name,data)
    for path in classes.rglob('*.class'):dst.write(path,path.relative_to(classes).as_posix())
props=TEST/'idea.properties'
props.write_text('\n'.join([f'idea.config.path={TEST}/config',f'idea.system.path={TEST}/system-{os.getpid()}',f'idea.plugins.path={TEST}/plugins',f'idea.log.path={TEST}/log',f'merkzeug.capture.root={TEST}','idea.initially.ask.config=never']))
subprocess.run([str(IDE/'MacOS/idea'),'merkzeugCapture'],env=dict(os.environ,IDEA_PROPERTIES=str(props),IDEA_VM_OPTIONS=str(IDE/'bin/idea.vmoptions')),check=True,timeout=120)
print(TEST)
