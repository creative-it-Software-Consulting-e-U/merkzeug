#!/usr/bin/env python3
"""Keep all actively released editions on one version. Does not commit or tag."""
import argparse
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = ['package.json', 'crossplatform/package.json', 'mobile/package.json',
            'intellij/web/package.json', 'packages/core/package.json',
            'packages/editor/package.json', 'packages/export/package.json']
PATTERN = re.compile(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:alpha|beta|rc)\.(0|[1-9]\d*))?')
PLUGIN = 'intellij/src/main/resources/META-INF/plugin.xml'
IOS = 'mobile/ios/App/App.xcodeproj/project.pbxproj'


def read_version(root=ROOT):
    version = (root / 'VERSION').read_text().strip()
    if not PATTERN.fullmatch(version):
        raise ValueError('Version must be X.Y.Z or X.Y.Z-(alpha|beta|rc).N')
    return version


def check(root=ROOT, tag=None):
    version = read_version(root)
    if tag is not None and tag != 'v' + version:
        raise ValueError(f'Tag {tag!r} does not match VERSION v{version}')
    for name in PACKAGES:
        data = json.loads((root / name).read_text())
        if data.get('version') != version:
            raise ValueError(f'{name}: version differs from {version}')
        for section in ['dependencies', 'devDependencies', 'peerDependencies']:
            for dependency, value in data.get(section, {}).items():
                if dependency.startswith('@merkzeug/') and value != version:
                    raise ValueError(f'{name}: {dependency} must be {version}')
    if ET.parse(root / PLUGIN).getroot().findtext('version') != version:
        raise ValueError('IntelliJ plugin.xml version differs from VERSION')
    ios = (root / IOS).read_text()
    versions = re.findall(r'MARKETING_VERSION = ([^;]+);', ios)
    if not versions or set(versions) != {version.split('-')[0]}:
        raise ValueError('iOS marketing version differs from VERSION')
    builds = re.findall(r'CURRENT_PROJECT_VERSION = ([^;]+);', ios)
    if not builds or len(set(builds)) != 1 or not builds[0].isdigit() or int(builds[0]) < 1:
        raise ValueError('iOS build number must be a consistent positive integer')
    lock = json.loads((root / 'package-lock.json').read_text())
    if lock.get('version') != version:
        raise ValueError('Root lockfile version differs from VERSION; run npm install --package-lock-only')
    for name in PACKAGES:
        key = str(Path(name).parent).replace('\\', '/')
        if key == '.': key = ''
        package = lock['packages'].get(key, {})
        if package.get('version') != version:
            raise ValueError(f'Lockfile entry {key!r} has the wrong version')
        expected = json.loads((root / name).read_text())
        for section in ['dependencies', 'devDependencies', 'peerDependencies']:
            if package.get(section, {}) != expected.get(section, {}):
                raise ValueError(f'Lockfile dependency drift in {key!r}/{section}')
    return version


def set_version(version, build=None, root=ROOT):
    if not PATTERN.fullmatch(version):
        raise ValueError('Version must be X.Y.Z or X.Y.Z-(alpha|beta|rc).N')
    if build is not None and build < 1: raise ValueError('iOS build number must be positive')
    for name in PACKAGES:
        path = root / name
        data = json.loads(path.read_text())
        data['version'] = version
        for section in ['dependencies', 'devDependencies', 'peerDependencies']:
            for dependency in data.get(section, {}):
                if dependency.startswith('@merkzeug/'): data[section][dependency] = version
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    (root / 'VERSION').write_text(version + '\n')
    path = root / PLUGIN
    path.write_text(re.sub(r'<version>[^<]+</version>', f'<version>{version}</version>', path.read_text(), count=1))
    path = root / IOS
    text = re.sub(r'MARKETING_VERSION = [^;]+;', f'MARKETING_VERSION = {version.split("-")[0]};', path.read_text())
    if build is not None: text = re.sub(r'CURRENT_PROJECT_VERSION = [^;]+;', f'CURRENT_PROJECT_VERSION = {build};', text)
    path.write_text(text)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['check', 'set'])
    parser.add_argument('version', nargs='?')
    parser.add_argument('--tag')
    parser.add_argument('--ios-build', type=int)
    args = parser.parse_args()
    try:
        if args.command == 'set':
            if not args.version: parser.error('set requires a version')
            set_version(args.version, args.ios_build)
            print('Updated manifests. Run npm install --package-lock-only, then python3 scripts/version.py check.')
        else: print(check(tag=args.tag))
    except (ValueError, KeyError, OSError) as error:
        parser.exit(1, str(error) + '\n')

if __name__ == '__main__': main()
