#!/usr/bin/env python3
"""Promote reviewed captioned Cloud/Electron images into a version-controlled upload bundle."""
import argparse, hashlib, json, shutil
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--ios',required=True,type=Path,help='export-screenshot-results.py output')
p.add_argument('--mac',required=True,type=Path,help='frame-store-screenshots.py output')
p.add_argument('--output',required=True,type=Path)
a=p.parse_args()
if a.output.exists() and any(a.output.iterdir()): p.error('Use an empty destination; review a bundle replacement as a source change')
manifest={'schema':1,'appId':'6799114334','provenance':{},'groups':[]}
for edition,source,display in [('iphone',a.ios/'iphone/store','APP_IPHONE_67'),('ipad',a.ios/'ipad/store','APP_IPAD_PRO_3GEN_129'),('macos',a.mac,'APP_DESKTOP')]:
 origin=a.mac/'manifest.json' if edition=='macos' else a.ios/'manifest.json'
 source_manifest=json.loads(origin.read_text())
 entries={x['file']:x for x in source_manifest['screenshots']}
 manifest['provenance'][edition]={'manifestSHA256':hashlib.sha256(origin.read_bytes()).hexdigest(),'commit':source_manifest.get('commit'),'source':'Electron CI' if edition=='macos' else 'Xcode Cloud xcresult'}
 for lang,locale in [('en','en-US'),('de','de-DE')]:
  group={'platform':'MAC_OS' if edition=='macos' else 'IOS','locale':locale,'displayType':display,'images':[]}
  for scene in (['writing','diagram','calendar','pdf','git','frontmatter'] if edition=='macos' else ['writing','diagram','git','frontmatter']):
   name=f'{edition}-{lang}-{scene}.png';image=source/name;digest=hashlib.sha256(image.read_bytes()).hexdigest()
   key=name if edition=='macos' else f'{edition}/store/{name}'
   if entries[key]['sha256']!=digest: p.error(f'Capture provenance mismatch: {name}')
   target=a.output/'images'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(image,target)
   group['images'].append({'scene':scene,'file':f'images/{name}','sha256':digest})
  manifest['groups'].append(group)
a.output.mkdir(parents=True,exist_ok=True)
(a.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared captioned images. Review the source change before release upload.')
