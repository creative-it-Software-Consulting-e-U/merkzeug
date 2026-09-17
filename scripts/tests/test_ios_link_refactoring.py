"""Run the production iOS rename transaction with real Apple file coordination."""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

@unittest.skipUnless(sys.platform == 'darwin' and shutil.which('swift'), 'Requires Apple Foundation')
class IOSLinkRefactoring(unittest.TestCase):
    def test_coordinated_links_collisions_and_stale_plan(self):
        source = (ROOT / 'mobile/ios/App/App/VaultPlugin.swift').read_text()
        resolver = source.split('// BEGIN VAULT PATH RESOLVER', 1)[1].split('// END VAULT PATH RESOLVER', 1)[0]
        resolver = resolver[resolver.index('enum VaultPathResolver'):]
        rename = source[source.index('    @objc func rename('):source.index('    // MARK: - Suche')].replace('@objc ', '')
        bridge = r'''
import Foundation
typealias JSObject = [String: Any]
func localized(_ en: String, _ de: String) -> String { en }
final class CAPPluginCall {
 let data: JSObject; var done = false; var failure: String?
 init(_ data: JSObject) { self.data = data }
 func getString(_ key: String) -> String? { data[key] as? String }
 func getArray<T>(_ key: String, _ type: T.Type) -> [T]? { data[key] as? [T] }
 func resolve() { done = true }
 func reject(_ message: String) { failure = message; done = true }
}
final class Harness {
 let root: URL
 init(_ root: URL) { self.root = root }
 func fileURL(for path: String, call: CAPPluginCall) -> URL? { VaultPathResolver.resolve(path, in: root) }
'''
        fixture = r'''
}
let fm = FileManager.default
let root = URL(fileURLWithPath: NSTemporaryDirectory()).resolvingSymlinksInPath().appendingPathComponent("merkzeug-links-" + UUID().uuidString)
try fm.createDirectory(at: root.appendingPathComponent("Old.assets"), withIntermediateDirectories: true)
defer { try? fm.removeItem(at: root) }
try "image".write(to: root.appendingPathComponent("Old.assets/x.png"), atomically: true, encoding: .utf8)
try "![x](Old.assets/x.png)".write(to: root.appendingPathComponent("Old.md"), atomically: true, encoding: .utf8)
try "[x](Old.md#topic)".write(to: root.appendingPathComponent("Index.md"), atomically: true, encoding: .utf8)
let harness = Harness(root)
func run(_ data: JSObject) -> CAPPluginCall {
 let call = CAPPluginCall(data); harness.rename(call)
 let limit = Date().addingTimeInterval(10)
 while !call.done && Date() < limit { RunLoop.main.run(until: Date().addingTimeInterval(0.01)) }
 precondition(call.done, "Coordinator timed out")
 return call
}
func text(_ name: String) throws -> String { try String(contentsOf: root.appendingPathComponent(name), encoding: .utf8) }
let edits: [JSObject] = [
 ["path":"/Old.md", "target":"/New.md", "before":"![x](Old.assets/x.png)", "after":"![x](New.assets/x.png)"],
 ["path":"/Index.md", "target":"/Index.md", "before":"[x](Old.md#topic)", "after":"[x](New.md#topic)"]
]
let stale: [JSObject] = [ ["path":"/Index.md", "target":"/Index.md", "before":"stale", "after":"bad"] ]
precondition(run(["from":"/Old.md", "to":"/New.md", "edits":stale]).failure != nil)
precondition(fm.fileExists(atPath: root.appendingPathComponent("Old.md").path))
let before = try text("Index.md"); precondition(before == "[x](Old.md#topic)")
precondition(run(["from":"/Old.md", "to":"/New.md", "edits":edits]).failure == nil)
let index = try text("Index.md"), note = try text("New.md")
precondition(index == "[x](New.md#topic)" && note == "![x](New.assets/x.png)")
precondition(fm.fileExists(atPath: root.appendingPathComponent("New.assets/x.png").path))
precondition(!fm.fileExists(atPath: root.appendingPathComponent("Old.md").path))
precondition(run(["from":"/New.md", "to":"/Index.md", "edits":[]]).failure != nil)
let retained = try text("New.md"); precondition(retained == note)
let locked = root.appendingPathComponent("locked")
try fm.createDirectory(at: locked, withIntermediateDirectories: true)
try "[x](New.md)".write(to: locked.appendingPathComponent("Locked.md"), atomically: true, encoding: .utf8)
try fm.setAttributes([.posixPermissions: 0o555], ofItemAtPath: locked.path)
let rollback: [JSObject] = [
 ["path":"/New.md", "target":"/Failed.md", "before":note, "after":"![x](Failed.assets/x.png)"],
 ["path":"/locked/Locked.md", "target":"/locked/Locked.md", "before":"[x](New.md)", "after":"[x](Failed.md)"]
]
let failed = run(["from":"/New.md", "to":"/Failed.md", "edits":rollback])
try fm.setAttributes([.posixPermissions: 0o755], ofItemAtPath: locked.path)
precondition(failed.failure != nil, "Expected atomic write failure")
precondition(fm.fileExists(atPath: root.appendingPathComponent("New.assets/x.png").path))
let restored = try text("New.md"); precondition(restored == note)
precondition(!fm.fileExists(atPath: root.appendingPathComponent("Failed.md").path))
print("Native iOS link refactoring, companion, stale plan, collision and rollback tests passed")
'''
        with tempfile.TemporaryDirectory() as folder:
            script = Path(folder) / 'main.swift'
            script.write_text('import Foundation\n' + resolver + bridge + rename + fixture)
            result = subprocess.run(['swift', str(script)], capture_output=True, text=True, timeout=60)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
