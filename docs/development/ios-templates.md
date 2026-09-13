# Shared iCloud templates — issue #51

Implemented on `codex/ios-template-sync` (PR #52):

- Native Files folder picker, persistent security-scoped bookmark and coordinated template reads on iOS.
- Shared template loader with embedded images, metadata and per-vault selection; optional content-style preview including Mermaid.
- Shared `iCloud.com.creative-it.merkzeug` CloudDocuments container for iOS and macOS, exposed as Merkzeug / Templates in iCloud Drive. iOS installs a missing starter template without replacing existing files.
- Foundation container discovery inside Electron's main process, with matching app entitlements and replacement provisioning profiles for App Store, development and Developer ID distribution.
- First-use migration of the macOS default templates folder, preserving originals and refusing conflicting files. Custom roots remain unchanged until explicit migration in settings. Windows discovers an existing Merkzeug folder in the registered or conventional iCloud Drive location; Linux retains custom-folder support.
- iOS AirPrint uses template CSS, cover, custom margins, repeated headers/footers and page counters. The native AirPrint preview shows pagination; the preceding HTML content preview does not. Page furniture is rasterized by a separate WebKit view, while the document body retains PDF text.

## Validation

`npm test` covers the shared loader, verified migration, conflict handling, custom-root retention and Windows path discovery. The isolated iOS simulator tests exercise native coordinated reads, preview switching and multi-page AirPrint preparation using synthetic fixtures. The resulting three-page PDF was inspected, including its Mermaid diagram, repeated header and first/last page numbers. The dialog was cancelled without printing.

A signed sandboxed macOS build resolved the real container, wrote and read back a temporary sentinel, then removed its test directory. Signed distribution checks also cover Developer ID packaging. These checks do not establish end-to-end synchronization between two Apple devices, an actual third-party Files provider bookmark lifecycle, or output from a physical printer. Those remain acceptance checks before closing the issue. Never use the user's private iPhone 16 Pro.
