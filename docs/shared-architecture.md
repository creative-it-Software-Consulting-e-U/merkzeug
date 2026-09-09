# Shared editor and export architecture

Applications import the same TypeScript sources through npm workspaces. Editor behavior is shared rather than copied into each shell.

| Package | Responsibility | Hosts |
| --- | --- | --- |
| `@merkzeug/core` | Frontmatter, titles, paths, export plans, template data and UI localization | Desktop, mobile, IntelliJ |
| `@merkzeug/editor` | Milkdown, Mermaid, frontmatter UI, search and conflict handling | Desktop, mobile, IntelliJ |
| `@merkzeug/export` | Print content, table of contents, links, diagrams and readiness | Desktop, IntelliJ |

## Host boundaries

`EditorHost` owns reading, writing, images, change notifications and diagram zoom. A read with `peek: true` must not advance the known write revision: checking external content must not accidentally authorize a stale write. Reloading or explicitly keeping the local version can accept a new revision. A successful write confirms that the host accepted the change; in IntelliJ this does not imply a disk save.

Desktop uses Electron IPC. iOS uses the Capacitor vault adapter and file-provider coordination. IntelliJ uses a local JCEF view and Java APIs for `Document`, `WriteCommandAction`, `UndoManager` and the virtual file system. Each editor has its own resource origin, and local resource access is restricted to the project root.

## PDF pipeline

The shared export plan chooses documents and applies title placeholders. The shared print view renders content and waits for Mermaid, images, fonts and the table of contents before reporting readiness. Electron and JCEF each provide their native `printToPDF` call. Template formats and content rendering are shared; the native print operation remains in the adapter. Different Chromium versions can produce different pagination.

The iOS app uses the editor but has no native PDF adapter yet. A future VS Code host can reuse the packages through Webview messaging and document edits; it still needs its own PDF output solution.

## Localization

English messages are the source keys. The shared translator selects German for German system/host locales and otherwise falls back to English, including for missing translations. Electron main supplies `app.getLocale()` (or an explicit Chromium language argument) to the renderer through preload before UI initialization; other web shells default to `navigator.language`, and IntelliJ supplies the Java host locale. Native adapters translate their own messages. Documentation is authored in English, with German bundled help maintained as a secondary translation.

Persisted identifiers are language-independent: existing frontmatter keys, template filenames and placeholders are not renamed by a UI language change. Document language metadata takes precedence over the host language when generating PDF headings.

## Builds

Install dependencies with `npm ci` at the repository root. One lockfile fixes workspace resolution. See the [development guide](development/README.md) and [release process](development/releases.md) for validation, versioning and platform packaging.

## Apple identity and possible paid features

macOS and iOS share `com.creative-it.merkzeug` and target a single multiplatform App Store Connect record. Their native shells, signing and sandbox requirements remain platform-specific. Both Apple editions are intended for App Store distribution; the existing desktop DMG build does not fulfill the Mac App Store requirements.

Premium/Pro subscriptions are an optional future direction. Keep the product identity stable and introduce purchase handling through native host adapters only when the feature is commissioned. A future shared feature-access interface should consume verified entitlements without embedding StoreKit in the editor or export packages. No billing system or paywall is currently planned for implementation. See the [Apple distribution decision](development/releases.md#apple-distribution-decision).
