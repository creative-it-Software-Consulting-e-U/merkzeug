#!/usr/bin/env python3
"""Recompose verified native Cloud captures after caption-only changes."""
import argparse, hashlib, json, shutil, subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('source', type=Path)
p.add_argument('output', type=Path)
a=p.parse_args()
if a.output.exists() and any(a.output.iterdir()): p.error('Use an empty output directory')
original=json.loads((a.source/'manifest.json').read_text())
entries={entry['file']:entry for entry in original['screenshots']}
result={'testSummary':original.get('testSummary'), 'sourceManifestSHA256':hashlib.sha256((a.source/'manifest.json').read_bytes()).hexdigest(), 'status':'Existing native captures with updated captions; visual review required', 'screenshots':[]}
for edition in ('iphone','ipad'):
 for language in ('en','de'):
  for scene in ('writing','diagram','frontmatter'):
   name=f'{edition}/raw/{edition}-{language}-{scene}.png'
   data=(a.source/name).read_bytes()
   if hashlib.sha256(data).hexdigest()!=entries[name]['sha256']: p.error('Raw capture checksum mismatch')
   target=a.output/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(a.source/name,target)
   result['screenshots'].append(entries[name])
 subprocess.run(['python3',str(Path(__file__).with_name('frame-store-screenshots.py')),str(a.output/edition/'raw'),str(a.output/edition/'store'),'--edition',edition],check=True)
 framed=json.loads((a.output/edition/'store/manifest.json').read_text())
 result.setdefault('composition',{})[edition]={k:v for k,v in framed.items() if k!='screenshots'}
 for item in framed['screenshots']:
  result['screenshots'].append({**item,'file':f'{edition}/store/'+item['file']})
(a.output/'manifest.json').write_text(json.dumps(result,indent=2)+'\n')
