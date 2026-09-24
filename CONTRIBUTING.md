# Contributing to Merkzeug

Thank you for helping improve Merkzeug. Start by checking existing issues and discussing substantial changes before implementing them.

## Language

Write source messages, primary documentation, issues, pull requests and release notes in English. The UI follows the host language: German on German systems, English as the fallback. Keep the German translation and German user help in sync when behavior changes.

Shared UI messages use `t` from `@merkzeug/core/i18n`; the English text is the source key, and German translations live in `packages/core/src/locales/de.ts`. Electron main sets the OS locale at startup; web shells use the browser locale, and IntelliJ supplies its host locale. Native Java and Swift adapters localize their own errors and dialogs. Do not translate persisted frontmatter keys, template filenames, protocol names or user content.

## Development

Follow the [development guide](docs/development/README.md). Use the workspace root lockfile and Node.js 24. Do not maintain separate lockfiles in individual applications.

Before proposing a change:

```sh
npm ci
npm test
npm run typecheck
npm run check:version
npm run check:docs
npm run test:release
npm run build:desktop
npm run build:mobile
```

Run the native integration checks relevant to your change as well. A mobile web build is not an iOS device test. IntelliJ changes need the pinned SDK and, for behavior changes, an IDE smoke test. Never run GUI tests inside a filesystem sandbox that prevents macOS application registration.

## Pull requests

Explain the user-visible problem, the resulting behavior and how you verified it. Add focused tests for behavior with meaningful failure modes. Update the relevant user guide, bundled help in both languages, and the Unreleased section of the changelog.

Keep platform-specific file access and OS behavior in their adapters. Shared packages must not depend on Electron, Capacitor or IntelliJ globals. Never weaken conflict checks to make a save succeed.

Do not include credentials, signing certificates, provisioning profiles, private notes or calendar data. Do not commit generated SDKs, build output or installed dependencies. Follow the [security reporting guide](SECURITY.md) for vulnerabilities.

## Contribution license

By submitting a contribution for inclusion, you agree to license it under this project's [MIT License](LICENSE). You retain your copyright; no copyright assignment is required. Submit only work you have the right to license, including any necessary employer permission. Identify third-party material and preserve its license and attribution notices. New dependencies must be disclosed in the pull request.

Names, logos and claims of official affiliation are described separately in [BRANDING.md](BRANDING.md); this does not add restrictions to the MIT license for the code.
