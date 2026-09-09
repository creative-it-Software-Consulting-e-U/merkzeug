#!/usr/bin/env python3
"""Capture real Simulator screenshots using the Debug-only demo vault hook. No uploads."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
APP_ID = 'com.creative-it.merkzeug'


def run(*args, **kwargs):
    return subprocess.check_output(['xcrun', 'simctl', *args], text=True, **kwargs).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('device', help='UUID of an already booted Simulator dedicated to Merkzeug tests')
    parser.add_argument('app', type=Path, help='Debug-iphonesimulator/App.app from the Merkzeug scheme')
    parser.add_argument('output', type=Path, help='Private review folder for raw screenshots')
    parser.add_argument('--settle-seconds', type=int, default=20, help='Initial render wait; increase on slow/new simulator runtimes')
    parser.add_argument('--edition', choices=['iphone', 'ipad'], required=True)
    args = parser.parse_args()
    if not args.app.is_dir(): parser.error('Simulator app does not exist')
    executable = args.app / 'App'
    candidates = [executable, args.app / 'App.debug.dylib']
    if not any(p.is_file() and b'MERKZEUG_DEMO_MODE' in p.read_bytes() for p in candidates):
        parser.error('Use a Debug simulator build containing the demo hook')
    args.output.mkdir(parents=True, exist_ok=True)
    run('install', args.device, str(args.app.resolve()))
    container = Path(run('get_app_container', args.device, APP_ID, 'data'))
    destination = container / 'Documents/Demo Vault'
    run('status_bar', args.device, 'override', '--time', '9:41', '--dataNetwork', 'wifi', '--wifiMode', 'active', '--wifiBars', '3', '--batteryState', 'charged', '--batteryLevel', '100')
    run('ui', args.device, 'appearance', 'light')
    scenes = {'en': {'writing': '/Welcome.md', 'diagram': '/Projects/Garden.md'},
              'de': {'writing': '/Willkommen.md', 'diagram': '/Projekte/Garten.md'}}
    for locale, notes in scenes.items():
        subprocess.run(['xcrun', 'simctl', 'terminate', args.device, APP_ID], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if destination.exists(): shutil.rmtree(destination) # Only our explicitly named synthetic fixture.
        shutil.copytree(ROOT / 'store/demo' / locale, destination)
        for scene, note in notes.items():
            subprocess.run(['xcrun', 'simctl', 'terminate', args.device, APP_ID], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            env = dict(os.environ, SIMCTL_CHILD_MERKZEUG_DEMO_MODE='1', SIMCTL_CHILD_MERKZEUG_DEMO_NOTE=note)
            run('launch', args.device, APP_ID, '-AppleLanguages', f'({locale})', '-AppleLocale', 'de_AT' if locale == 'de' else 'en_US', env=env)
            time.sleep(args.settle_seconds) # Allow the real editor, fonts and Mermaid to settle; visually review every result.
            target = args.output / f'{args.edition}-{locale}-{scene}.png'
            run('io', args.device, 'screenshot', str(target.resolve()))
            print(target, flush=True)
    print('Raw candidates only. Review images before copying them to the public repository.')

if __name__ == '__main__': main()
