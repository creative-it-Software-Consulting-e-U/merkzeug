# Merkzeug contributor instructions

Merkzeug is a visual Markdown editor with shared TypeScript packages and platform adapters.

- `crossplatform/`: active Electron desktop application.
- `mobile/`: active Capacitor iOS application.
- `intellij/`: IntelliJ plugin preview.
- `packages/`: shared core, editor and PDF rendering.
- `legacy/`: archived native macOS implementation; only modify when explicitly requested.

## Language and documentation

English is the primary source language for project documentation and UI messages. The UI uses German on German systems and falls back to English otherwise. Maintain the shared German translation catalog and native adapter translations. Never translate persisted keys or user documents.

For each feature or behavior change, update the affected user guides and both bundled help languages:

- Desktop: `crossplatform/resources/help/Help.en.md` and `Help.de.md`.
- iOS: `mobile/src/help/Help.en.md` and `Help.de.md`.
- IntelliJ: `docs/user/intellij.md`.

Update shortcut references when shortcuts change. Avoid Mermaid examples in bundled help views that do not render diagrams. Keep developer READMEs focused on development; user instructions belong in `docs/user/` or the bundled manuals.

## Build and test

Run `npm ci` from the repository root. Use the shared lockfile.

```sh
npm test
npm run typecheck
npm run check:version
npm run check:docs
npm run test:release
npm run build:desktop
npm run build:mobile
npm run build:intellij
```

The IntelliJ build requires the pinned SDK. Native behavior needs native tests, not just successful web builds. Do not run a GUI IDE in a filesystem sandbox that prevents OS application registration.

## Releases

Use `scripts/version.py` to update active versions, then regenerate the root lockfile. Follow `docs/development/releases.md`. Build scripts must not publish implicitly. Never commit signing credentials, SDK downloads or generated binaries.

The legacy `make install` replaces `/Applications/Merkzeug.app`; do not run it during active desktop development.
