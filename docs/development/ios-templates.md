# iOS templates — issue #51

Work in progress on `codex/ios-template-sync`.

Implemented and tested independently of iCloud account configuration:

- Native Files folder picker, persistent security-scoped bookmark and coordinated template reads.
- Template selection stored in the shared vault setting; content-style preview and Mermaid light mode.
- Shared asynchronous template loader including embedded images and template metadata.
- Print preview content styles and cover, with title/date substitution.
- Conflict-checked copy utility for desktop migration, retaining originals as a recovery copy. Not connected to the desktop settings yet.

Still required before closing #51:

- Confirm/register the shared iCloud container. The Apple app ID currently has no iCloud capability; the repository has no iCloud entitlements.
- Configure iOS and macOS document-container entitlements, provisioning and native URL discovery. Do not infer a container ID from an arbitrary filesystem path.
- Adopt the available iCloud folder as the macOS default with first-run migration; offer explicit migration for custom folders and Windows iCloud Drive.
- Integrate desktop migration into settings, report conflicts clearly, and validate actual cloud availability and sync on signed builds.
- Complete iOS template print pagination, including headers, footers and custom margins; current draft preview supports content CSS and cover only.
- Validate folder-picker bookmarks with an actual Files provider and signed iCloud access. Simulator fixtures exercise native coordinated reads, preview switching and cover rendering, not real cloud synchronization.

Validation: `npm test` includes template loader and migration tests. `ScreenshotTests/testTemplates` runs on an isolated iOS simulator with synthetic note/template fixtures; it opens the preview without invoking a native print dialog. Never use the user's private iPhone 16 Pro.
