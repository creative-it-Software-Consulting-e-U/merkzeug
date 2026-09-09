#!/usr/bin/env python3
"""Check local website destinations, anchors and image descriptions before publishing."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
root=Path(__file__).resolve().parents[1]/'website'
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__(); self.refs=[]; self.ids=set(); self.errors=[]; self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a: self.ids.add(a['id'])
  if tag=='img' and 'alt' not in a: self.errors.append('image has no alt attribute')
  for key in ('href','src'):
   if a.get(key): self.refs.append(a[key])
pages={p:Page(p.read_text()) for p in root.glob('*.html')}
errors=[]
for path,page in pages.items():
 errors.extend(f'{path.name}: {e}' for e in page.errors)
 for ref in page.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc: continue
  target=(path.parent/unquote(u.path)).resolve() if u.path else path
  if not target.is_relative_to(root): errors.append(f'{path.name}: destination escapes site: {ref}');continue
  if not target.is_file(): errors.append(f'{path.name}: missing {ref}');continue
  if u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:
   errors.append(f'{path.name}: missing anchor {ref}')
if errors: raise SystemExit('\n'.join(errors))
print(f'Checked {len(pages)} pages: local links, anchors and image descriptions passed.')
