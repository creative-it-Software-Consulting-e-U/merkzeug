"""Exercise Cloud worker lifecycle without an Xcode installation or real signing."""
import os
import plistlib
import runpy
from unittest.mock import patch
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'crossplatform/macos'))


class CloudPreparation(unittest.TestCase):
    def test_separate_test_worker_needs_no_generated_source_resources(self):
        with tempfile.TemporaryDirectory() as folder:
            script = Path(folder) / 'ci_scripts/ci_pre_xcodebuild.sh'
            script.parent.mkdir()
            shutil.copyfile(ROOT / 'mobile/ios/App/ci_scripts/ci_pre_xcodebuild.sh', script)
            for action, expected in [('test-without-building', 0), ('build-for-testing', 1), ('archive', 1)]:
                with self.subTest(action=action):
                    result = subprocess.run(['bash', str(script)], env=dict(os.environ, CI_XCODEBUILD_ACTION=action), capture_output=True)
                    self.assertEqual(result.returncode, expected, result.stderr.decode())
            app = Path(folder) / 'App'
            (app / 'public').mkdir(parents=True)
            (app / 'public/index.html').write_text('<html>built</html>')
            (app / 'capacitor.config.json').write_text('{}')
            result = subprocess.run(['bash', str(script)], env=dict(os.environ, CI_XCODEBUILD_ACTION='build-for-testing'), capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr.decode())


    def test_archive_uses_store_version_and_cloud_counter(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            app = root / 'mobile/ios/App'
            (app / 'App/public').mkdir(parents=True)
            (app / 'App/public/index.html').write_text('built')
            (app / 'App/capacitor.config.json').write_text('{}')
            (app / 'ci_scripts').mkdir()
            script = app / 'ci_scripts/ci_pre_xcodebuild.sh'
            shutil.copyfile(ROOT / 'mobile/ios/App/ci_scripts/ci_pre_xcodebuild.sh', script)
            tools = root / 'bin'
            tools.mkdir()
            xcrun = tools / 'xcrun'
            xcrun.write_text('#!/bin/sh\nprintf "%s\\n" "$*" >> "$COMMAND_LOG"\n')
            xcrun.chmod(0o755)
            log = root / 'commands'
            for version, expected in [('1.0.0', '1.0'), ('1.1.0', '1.1'), ('1.1.2', '1.1.2')]:
                (root / 'VERSION').write_text(version+'\n')
                log.write_text('')
                result = subprocess.run(['bash', str(script)], env=dict(os.environ, PATH=str(tools)+os.pathsep+os.environ['PATH'], CI_PRIMARY_REPOSITORY_PATH=str(root), CI_BUILD_NUMBER='29', CI_XCODEBUILD_ACTION='archive', COMMAND_LOG=str(log)), capture_output=True)
                self.assertEqual(result.returncode, 0, result.stderr.decode())
                self.assertEqual(log.read_text().splitlines(), [f'agvtool new-marketing-version {expected}', 'agvtool new-version -all 29'])


class MacCloudPreparation(unittest.TestCase):
    def test_rejects_missing_or_already_used_build_number_before_packaging(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / '.nvmrc').write_text('24\n')
            tools = root / 'bin'
            tools.mkdir()
            node = tools / 'node'
            node.write_text('#!/bin/sh\necho 24\n')
            node.chmod(0o755)
            script = ROOT / 'crossplatform/macos/ci_scripts/ci_pre_xcodebuild.sh'
            for number in ['', '0', '1', '-1', 'abc']:
                with self.subTest(number=number):
                    result = subprocess.run(['bash', str(script)], env=dict(os.environ, PATH=str(tools)+os.pathsep+os.environ['PATH'], CI_PRIMARY_REPOSITORY_PATH=str(root), CI_BUILD_NUMBER=number), capture_output=True)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertTrue(b'build' in result.stderr.lower() or b'ci_build_number' in result.stderr.lower())

    def test_staging_scheme_packages_its_own_app_from_build_one(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / '.nvmrc').write_text('24\n')
            (root / 'VERSION').write_text('1.3.0\n')
            tools = root / 'bin'
            tools.mkdir()
            node = tools / 'node'
            node.write_text('#!/bin/sh\necho 24\n')
            node.chmod(0o755)
            (root / 'scripts').mkdir()
            (root / 'scripts/package-mas.py').write_text('import pathlib, sys\npathlib.Path("args").write_text(" ".join(sys.argv[1:]))\n')
            script = ROOT / 'crossplatform/macos/ci_scripts/ci_pre_xcodebuild.sh'
            env = dict(os.environ, PATH=str(tools)+os.pathsep+os.environ['PATH'], CI_PRIMARY_REPOSITORY_PATH=str(root), CI_BUILD_NUMBER='1')
            result = subprocess.run(['bash', str(script)], env=dict(env, CI_XCODE_SCHEME='Merkzeug-macOS-Staging'), capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr.decode())
            self.assertEqual((root / 'args').read_text(), 'universal --unsigned --variant staging --store-version 1.3 --build-number 1')
            result = subprocess.run(['bash', str(script)], env=dict(env, CI_XCODE_SCHEME='Unknown'), capture_output=True)
            self.assertNotEqual(result.returncode, 0)

    def test_post_build_skips_non_archive_actions(self):
        script = ROOT / 'crossplatform/macos/ci_scripts/ci_post_xcodebuild.sh'
        result = subprocess.run(['bash', str(script)], env=dict(os.environ, CI_XCODEBUILD_ACTION='build'), capture_output=True)
        self.assertEqual(result.returncode, 0)


def verify_fixture(folder, app_name, info, entitlements):
    contents = Path(folder) / 'Products/Applications' / app_name / 'Contents'
    resources = contents / 'Resources'
    (resources / 'help').mkdir(parents=True, exist_ok=True)
    for name in ['app.asar', 'LICENSE', 'THIRD_PARTY_NOTICES.txt', 'help/Help.en.md', 'help/Help.de.md']:
        (resources / name).write_text('fixture')
    (contents / 'Info.plist').write_bytes(plistlib.dumps(info))
    signed = plistlib.dumps(entitlements)
    def output(command, **kwargs):
        return signed if command[0] == 'codesign' else 'arm64 x86_64'
    with patch('sys.argv', ['verify-archive.py', folder, '42']), \
         patch('subprocess.check_output', side_effect=output), \
         patch('subprocess.run'):
        runpy.run_path(str(ROOT / 'crossplatform/macos/verify-archive.py'))


class MacArchiveEditions(unittest.TestCase):
    def test_staging_archive_requires_its_own_identity_group_and_container(self):
        from variants import VARIANTS
        staging, production = VARIANTS['staging'], VARIANTS['production']
        def info(edition, container):
            return {'CFBundleIdentifier': edition.bundle_id, 'CFBundleVersion': '42', 'CFBundleShortVersionString': '1.3',
                    'ITSAppUsesNonExemptEncryption': False, 'ElectronTeamID': '3BNJ4M9R56',
                    'NSUbiquitousContainers': {container: {'NSUbiquitousContainerIsDocumentScopePublic': True}}}
        def entitlements(group, container):
            return {'com.apple.security.app-sandbox': True, 'com.apple.security.application-groups': [group],
                    'com.apple.developer.ubiquity-container-identifiers': [container]}
        for app_name, plist, signed, error in [
            (staging.app, info(staging, staging.container), entitlements(staging.app_group, staging.container), None),
            (production.app, info(staging, staging.container), entitlements(staging.app_group, staging.container), 'identity'),
            (staging.app, info(staging, staging.container), entitlements(production.app_group, staging.container), 'app group'),
            (staging.app, info(staging, staging.container), entitlements(staging.app_group, production.container), 'iCloud container'),
            (staging.app, info(staging, production.container), entitlements(staging.app_group, staging.container), 'document folder'),
        ]:
            with self.subTest(app=app_name, error=error), tempfile.TemporaryDirectory() as folder:
                if error:
                    with self.assertRaisesRegex(SystemExit, error):
                        verify_fixture(folder, app_name, plist, signed)
                else:
                    verify_fixture(folder, app_name, plist, signed)


class MacArchiveSandbox(unittest.TestCase):
    def test_archive_requires_matching_electron_ipc_configuration(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = Path(folder)
            contents = archive / 'Products/Applications/Merkzeug.app/Contents'
            resources = contents / 'Resources'
            (resources / 'help').mkdir(parents=True)
            for name in ['app.asar', 'LICENSE', 'THIRD_PARTY_NOTICES.txt', 'help/Help.en.md', 'help/Help.de.md']:
                (resources / name).write_text('fixture')
            base = {'CFBundleIdentifier': 'com.creative-it.merkzeug',
                    'CFBundleVersion': '42', 'CFBundleShortVersionString': '1.0',
                    'ITSAppUsesNonExemptEncryption': False,
                    'NSUbiquitousContainers': {'iCloud.com.creative-it.merkzeug': {'NSUbiquitousContainerIsDocumentScopePublic': True}}}
            group = '3BNJ4M9R56.com.creative-it.merkzeug'
            for team, groups, sandbox, error in [
                (None, [], True, 'ElectronTeamID'),
                ('WRONG', [group], True, 'ElectronTeamID'),
                ('3BNJ4M9R56', [], True, 'app group'),
                ('3BNJ4M9R56', ['wrong.group'], True, 'app group'),
                ('3BNJ4M9R56', [group], False, 'app group'),
                ('3BNJ4M9R56', [group], True, None),
            ]:
                with self.subTest(team=team, groups=groups, sandbox=sandbox):
                    info = dict(base)
                    if team: info['ElectronTeamID'] = team
                    (contents / 'Info.plist').write_bytes(plistlib.dumps(info))
                    entitlements = plistlib.dumps({'com.apple.security.app-sandbox': sandbox,
                                                  'com.apple.security.application-groups': groups,
                                                  'com.apple.developer.ubiquity-container-identifiers': ['iCloud.com.creative-it.merkzeug']})
                    def output(command, **kwargs):
                        return entitlements if command[0] == 'codesign' else 'arm64 x86_64'
                    with patch('sys.argv', ['verify-archive.py', folder, '42']), \
                         patch('subprocess.check_output', side_effect=output), \
                         patch('subprocess.run'):
                        if error:
                            with self.assertRaisesRegex(SystemExit, error):
                                runpy.run_path(str(ROOT / 'crossplatform/macos/verify-archive.py'))
                        else:
                            runpy.run_path(str(ROOT / 'crossplatform/macos/verify-archive.py'))
