#!/usr/bin/env python3
"""Compose deterministic store artwork from real captures; never upload."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SIZES = {'macos': {(1280,800),(1440,900),(2560,1600),(2880,1800)},
         'iphone': {(1260,2736),(1290,2796),(1320,2868)}, 'ipad': {(2048,2732),(2064,2752)}}

def inspect(path):
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n': raise ValueError(f'Not PNG: {path}')
    width, height = struct.unpack('>II', data[16:24])
    return width, height, hashlib.sha256(data).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('raw', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--edition', choices=SIZES, required=True)
    args = parser.parse_args()
    expected = {f'{args.edition}-{lang}-{scene}.png' for lang in ('en','de') for scene in (('writing','diagram','frontmatter','git','pdf','calendar') if args.edition == 'macos' else ('writing','diagram','git','frontmatter'))}
    if {p.name for p in args.raw.glob('*.png')} != expected: parser.error('Require the complete set of localized scene PNGs in raw folder')
    for name in expected:
        dimensions = inspect(args.raw/name)[:2]
        if dimensions not in SIZES[args.edition]: parser.error(f'Unexpected store dimensions: {name}: {dimensions}')
    if args.output.exists() and any(args.output.iterdir()): parser.error('Use an empty output folder to avoid mixing builds')
    with tempfile.TemporaryDirectory(prefix='merkzeug-frame-') as temporary:
        executable = Path(temporary)/'frame'
        subprocess.run(['xcrun','swiftc','-module-cache-path',str(Path(temporary)/'cache'),str(ROOT/'store/automation/ScreenshotFrame.swift'),str(ROOT/'store/automation/FrameMain.swift'),'-o',str(executable)],check=True)
        subprocess.run([str(executable),str(ROOT/'store/automation/captions.json'),str(args.raw.resolve()),str(args.output.resolve())],check=True)
    manifest = {'status':'candidates requiring visual review against submitted build','edition':args.edition,
                'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
                'dirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()),
                'xcode':subprocess.check_output(['xcodebuild','-version'],text=True).strip(),
                'captionsSHA256':hashlib.sha256((ROOT/'store/automation/captions.json').read_bytes()).hexdigest(), 'screenshots':[]}
    for name in sorted(expected):
        w,h,digest=inspect(args.output/name)
        manifest['screenshots'].append({'file':name,'width':w,'height':h,'sha256':digest,'rawSHA256':inspect(args.raw/name)[2]})
    (args.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(args.output.resolve())
if __name__ == '__main__': main()
