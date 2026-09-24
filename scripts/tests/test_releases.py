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

class IndependentEditions(unittest.TestCase):
    def test_unknown_duplicate_or_empty_editions_are_rejected(self):
        for value in ['mac-arm64,mac-arm64', 'unknown', ',']:
            with self.assertRaises(ValueError): artifacts.selected_editions(value)

    def test_subset_requires_all_of_its_formats_and_rejects_unselected_assets(self):
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp)
            with self.assertRaisesRegex(ValueError, 'Release asset mismatch'):
                artifacts.assemble(directory, editions='linux-x64')
            for name in artifacts.EDITIONS['linux-x64']:
                (directory/name.format(version=version.check())).write_bytes(b'candidate')
            artifacts.assemble(directory, editions='linux-x64')
            manifest=json.loads((directory/'release-manifest.json').read_text())
            self.assertEqual(manifest['selectedEditions'],['linux-x64'])
            self.assertFalse(manifest['completeMatrix'])
            (directory/f'merkzeug-{version.check()}.zip').write_bytes(b'extra')
            with self.assertRaisesRegex(ValueError, 'unexpected'):
                artifacts.assemble(directory, editions='linux-x64')

class ReleaseProtection(unittest.TestCase):
    def test_actions_are_pinned_and_contributor_checks_have_no_secrets(self):
        import re
        for file in (SCRIPTS.parent/'.github/workflows').glob('*.yml'):
            text=file.read_text()
            self.assertNotIn('pull_request_target:',text)
            for action in re.findall(r'uses:\s+([^\s#]+)',text):
                if action.startswith('./'): continue
                self.assertRegex(action,r'^actions/[\w-]+@[0-9a-f]{40}$')
        checks=(SCRIPTS.parent/'.github/workflows/ci.yml').read_text()
        self.assertNotIn('secrets.',checks)
        self.assertNotIn('contents: write',checks)

    def test_public_environment_requires_expected_reviewer_and_exact_refs(self):
        spec=importlib.util.spec_from_file_location('public_environments',SCRIPTS/'configure-public-environments.py')
        public=importlib.util.module_from_spec(spec);spec.loader.exec_module(public)
        environment={'protection_rules':[{'type':'required_reviewers','reviewers':[{'type':'User','reviewer':{'id':7}}]}],
                     'deployment_branch_policy':{'custom_branch_policies':True}}
        policies={'branch_policies':[{'type':'tag','name':'v*'}]}
        public.validate(environment,policies,{('tag','v*')},7)
        with self.assertRaises(ValueError): public.validate(environment,policies,{('tag','v*')},8)
        with self.assertRaises(ValueError): public.validate(environment,{'branch_policies':[{'type':'branch','name':'*'}]},{('tag','v*')},7)
        with self.assertRaises(ValueError): public.validate({},policies,{('tag','v*')},7)

    def test_missing_reviewers_or_branch_access_is_rejected(self):
        spec=importlib.util.spec_from_file_location('protection',SCRIPTS/'check-release-protection.py')
        protection=importlib.util.module_from_spec(spec);spec.loader.exec_module(protection)
        environment={'protection_rules':[{'type':'required_reviewers','reviewers':[{'id':1}]}], 'deployment_branch_policy':{'custom_branch_policies':True}}
        policy={'branch_policies':[{'name':'v*','type':'tag'}]}
        protection.validate(environment,policy)
        with self.assertRaises(ValueError): protection.validate({},policy)
        with self.assertRaises(ValueError): protection.validate(environment,{'branch_policies':[{'name':'*','type':'branch'}]})

class DocumentationSafety(unittest.TestCase):
    def test_untracked_store_files_never_enter_documentation_archive(self):
        import subprocess
        import zipfile
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)/'source'; (root/'store').mkdir(parents=True)
            (root/'README.md').write_text('Reviewed documentation')
            (root/'store/private.key').write_text('must never be archived')
            output=Path(temp)/'out'
            tracked=subprocess.CompletedProcess([],0,stdout='README.md\0',stderr='')
            with patch.object(artifacts,'ROOT',root), patch.object(artifacts.subprocess,'run',return_value=tracked), patch.object(artifacts.subprocess,'check_output',side_effect=['abc123\n','']):
                artifacts.assemble(output)
            with zipfile.ZipFile(next(output.glob('*documentation.zip'))) as archive:
                self.assertEqual(archive.namelist(),['README.md'])
