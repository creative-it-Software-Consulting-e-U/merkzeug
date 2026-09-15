"""Run the production Foundation resolver on macOS, including missing-file paths."""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@unittest.skipUnless(sys.platform == 'darwin' and shutil.which('swift'), 'Requires Apple Foundation')
class IOSVaultPaths(unittest.TestCase):
    def test_existing_and_new_files_in_private_alias_vault(self):
        source = (ROOT / 'mobile/ios/App/App/VaultPlugin.swift').read_text()
        resolver = source.split('// BEGIN VAULT PATH RESOLVER', 1)[1].split('// END VAULT PATH RESOLVER', 1)[0]
        resolver = resolver[resolver.index('enum VaultPathResolver'):]
        fixture = r'''
import Foundation
let fm = FileManager.default
let root = URL(fileURLWithPath: "/private/tmp/merkzeug-path-" + UUID().uuidString, isDirectory: true)
defer { try? fm.removeItem(at: root) }
try fm.createDirectory(at: root.appendingPathComponent("Meetings"), withIntermediateDirectories: true)
let note = "/meeting-0123456789abcdef.md"
// Reproduce the old comparison rejecting a brand-new root-level meeting note.
let oldTarget = root.appendingPathComponent(String(note.dropFirst())).standardizedFileURL
precondition(!oldTarget.path.hasPrefix(root.standardizedFileURL.path + "/"))
for path in [note, "/Meetings/new.md", "Meetings/relative.md"] {
    guard let url = VaultPathResolver.resolve(path, in: root) else { fatalError("Rejected new note: \(path)") }
    precondition(!fm.fileExists(atPath: url.path))
    try "# Synthetic meeting".write(to: url, atomically: true, encoding: .utf8)
    guard let reopened = VaultPathResolver.resolve(path, in: root) else { fatalError("Rejected existing note") }
    let content = try String(contentsOf: reopened, encoding: .utf8)
    precondition(content == "# Synthetic meeting")
}
for path in ["/../outside.md", "/Meetings/../../outside.md", "/../" + root.lastPathComponent + "-other/note.md"] {
    precondition(VaultPathResolver.resolve(path, in: root) == nil, "Accepted traversal")
}
precondition(VaultPathResolver.resolve("/", in: root) != nil)
print("Native vault path regression passed")
'''
        with tempfile.TemporaryDirectory() as folder:
            script = Path(folder) / 'main.swift'
            script.write_text('import Foundation\n' + resolver + fixture)
            result = subprocess.run(['swift', str(script)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
