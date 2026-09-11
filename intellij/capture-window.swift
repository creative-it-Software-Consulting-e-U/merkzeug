import AppKit
import CoreGraphics
import Foundation

// Capture the fixture window by identity, never whichever app covers its bounds.
let pid = pid_t(CommandLine.arguments[1])!
let destination = CommandLine.arguments[2]
let windows = CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID) as? [[String: Any]] ?? []
guard let window = windows.first(where: {
    ($0[kCGWindowOwnerPID as String] as? Int) == Int(pid)
    && ($0[kCGWindowName as String] as? String) == "Project plan.md — Merkzeug (IntelliJ IDEA)"
}), let id = window[kCGWindowNumber as String] as? Int else {
    fputs("Cannot identify the Merkzeug fixture window; refusing desktop capture.\n", stderr)
    exit(1)
}
let capture = Process()
capture.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
capture.arguments = ["-x", "-o", "-l", String(id), destination]
try capture.run()
capture.waitUntilExit()
exit(capture.terminationStatus)
