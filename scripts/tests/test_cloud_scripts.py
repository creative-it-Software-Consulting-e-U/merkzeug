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
