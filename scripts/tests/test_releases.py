import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import version
spec = importlib.util.spec_from_file_location("artifacts", SCRIPTS / "release-artifacts.py")
artifacts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(artifacts)

class Versions(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in version.PACKAGES + [version.PLUGIN, version.IOS, 'VERSION', 'package-lock.json']:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(version.ROOT / name, target)

    def test_matching_tag_and_rejecting_mismatched_tag(self):
        current = version.read_version(self.root)
        self.assertEqual(version.check(self.root, 'v' + current), current)
        with self.assertRaises(ValueError): version.check(self.root, 'v99.0.0')

    def test_rejects_manifest_and_lock_drift(self):
        for name in ['packages/core/package.json', 'package-lock.json']:
            with self.subTest(name=name):
                path = self.root / name
                original = path.read_text()
                data = json.loads(original)
                data['version'] = '99.0.0'
                path.write_text(json.dumps(data))
                with self.assertRaises(ValueError): version.check(self.root)
                path.write_text(original)

    def test_prerelease_keeps_numeric_ios_version_and_requires_new_lock(self):
        version.set_version('0.2.0-beta.1', build=2, root=self.root)
        self.assertIn('MARKETING_VERSION = 0.2.0;', (self.root / version.IOS).read_text())
        self.assertIn('CURRENT_PROJECT_VERSION = 2;', (self.root / version.IOS).read_text())
        self.assertEqual(json.loads((self.root / 'packages/editor/package.json').read_text())['version'], '0.2.0-beta.1')
        with self.assertRaisesRegex(ValueError, 'lockfile'): version.check(self.root)

    def test_rejects_invalid_version_before_mutation(self):
        for invalid in ['01.0.0', '0.1', '0.1.0-beta', '../escape']:
            with self.assertRaises(ValueError): version.set_version(invalid, root=self.root)
        self.assertEqual(version.check(self.root), version.read_version(version.ROOT))

class Artifacts(unittest.TestCase):
    def test_incomplete_matrix_cannot_be_released(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(ValueError, 'Release asset mismatch'):
                artifacts.assemble(Path(temp), complete=True)

    def test_manifest_records_actual_bytes_and_checksums(self):
        import hashlib
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            name = 'merkzeug-' + version.check() + '.zip'
            (directory / name).write_bytes(b'test artifact')
            with patch.object(artifacts.subprocess, 'check_output', side_effect=['abc123\n', ' M README.md\n']):
                artifacts.assemble(directory)
            manifest = json.loads((directory / 'release-manifest.json').read_text())
            item = next(item for item in manifest['artifacts'] if item['file'] == name)
            self.assertEqual(item['sha256'], hashlib.sha256(b'test artifact').hexdigest())
            self.assertEqual(item['bytes'], 13)
            self.assertTrue(manifest['workingTreeModified'])
            self.assertFalse(manifest['completeMatrix'])
            self.assertIn(item['sha256'] + '  ' + name, (directory / 'SHA256SUMS.txt').read_text())
