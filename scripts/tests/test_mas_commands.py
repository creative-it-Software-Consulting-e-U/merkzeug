"""Distribution commands must fail before building/uploading with incomplete inputs."""
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class MasCommandTests(unittest.TestCase):
    def reject(self, script, arguments, message):
        result = subprocess.run([sys.executable, str(ROOT / 'scripts' / script), *arguments], cwd=ROOT, text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(message, result.stderr)

    def test_distribution_requires_build_number(self):
        self.reject('package-mas.py', ['universal', '--distribution'], 'positive --build-number')

    def test_distribution_cannot_be_unsigned(self):
        self.reject('package-mas.py', ['universal', '--distribution', '--unsigned'], 'Distribution requires signing')

    def test_store_version_must_be_numeric(self):
        self.reject('package-mas.py', ['universal', '--distribution', '--build-number', '1', '--store-version', '1.beta'], 'Invalid Store version')

    def test_upload_requires_existing_package(self):
        self.reject('upload-mas.py', [str(ROOT / 'scripts' / 'upload-mas.py'), '--upload'], 'existing signed .pkg')
