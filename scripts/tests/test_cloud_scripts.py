"""Exercise Cloud worker lifecycle without an Xcode installation or real signing."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


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
            for version, expected in [('1.0.0', '1.0'), ('1.1.2', '1.1.2')]:
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

    def test_post_build_skips_non_archive_actions(self):
        script = ROOT / 'crossplatform/macos/ci_scripts/ci_post_xcodebuild.sh'
        result = subprocess.run(['bash', str(script)], env=dict(os.environ, CI_XCODEBUILD_ACTION='build'), capture_output=True)
        self.assertEqual(result.returncode, 0)
