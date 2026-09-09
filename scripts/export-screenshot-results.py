#!/usr/bin/env python3
"""Export named screenshot attachments from a downloaded Xcode Cloud/local xcresult."""
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('result', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.output.exists() and any(args.output.iterdir()): parser.error('Use an empty output directory')
    with tempfile.TemporaryDirectory(prefix='merkzeug-xcresult-') as temporary:
        folder = Path(temporary)
        subprocess.run(['xcrun','xcresulttool','export','attachments','--path',str(args.result),'--output-path',str(folder)],check=True)
        count = 0
        for test in json.loads((folder/'manifest.json').read_text()):
            for attachment in test['attachments']:
                name = attachment['suggestedHumanReadableName']
                match = re.search(r'(raw|store)-(iphone|ipad)-(en|de)-(writing|diagram|frontmatter)', name)
                if not match: continue
                kind, edition, language, scene = match.groups()
                target = args.output/edition/kind/f'{edition}-{language}-{scene}.png'
                if target.exists(): raise ValueError(f'Duplicate screenshot: {target}. Export one successful run per device size.')
                target.parent.mkdir(parents=True,exist_ok=True)
                exported = attachment['exportedFileName']
                if Path(exported).name != exported: raise ValueError('Unsafe exported attachment path')
                shutil.copyfile(folder/exported,target)
                count += 1
        if not count: raise ValueError('No Merkzeug screenshot attachments found')
        for edition in ('iphone','ipad'):
            if not (args.output/edition).exists(): continue
            for kind in ('raw','store'):
                expected={f'{edition}-{language}-{scene}.png' for language in ('en','de') for scene in ('writing','diagram','frontmatter')}
                actual={p.name for p in (args.output/edition/kind).glob('*.png')}
                if actual != expected: raise ValueError(f'Incomplete {edition}/{kind}: missing {expected-actual}')
        shutil.copyfile(folder/'manifest.json',args.output/'xcresult-attachments.json')
        print(f'Exported {count} named screenshots to {args.output}')
if __name__ == '__main__': main()
