# Development guide

## Prerequisites

- Node.js 24 LTS (the `.nvmrc` file selects the major version) and npm.
- Python 3.12 or later for build and release scripts.
- Git for repository operations.
- For IntelliJ: an IDE installation matching `intellij/sdk.json`, including JCEF and its JBR/JDK.
- For native iOS/macOS work: macOS, Xcode and the appropriate developer signing setup.

## Workspace commands

Run dependency installation from the repository root:

```sh
npm ci
npm test
npm run typecheck
npm run check:version
npm run check:docs
npm run test:release
```

`npm run build:desktop` builds Electron, `npm run build:mobile` builds the mobile web application, and `npm run build:intellij` builds an installable plugin against the pinned SDK. Type checking is an explicit command; a Vite build alone does not prove type correctness.

Use `npm run dev -w merkzeug` for desktop development or `npm run dev -w merkzeug-mobile` for the browser-based mobile demo. The latter uses a demo vault and does not exercise the native iOS file-provider adapter.

## Architecture and scope

Read [shared architecture](../shared-architecture.md). Keep data formats and rendering in shared packages; keep persistence, document ownership, host dialogs and OS permissions in platform adapters.

The legacy native macOS application is archived and excluded from current CI and release versioning. Do not replace an installed desktop application with a legacy build as part of routine development.

## Validation

CI checks types, shared-core tests, release tooling, documentation links and web builds. It does not establish native runtime support on every OS. Before publishing, also verify installation, editing, saving, reopening, conflict handling and PDF layout on each distributed platform. Use the [release checklist](releases.md).

For IntelliJ, see the [plugin README](../../intellij/README.md). For iOS, see the [mobile README](../../mobile/README.md). Locale tests cover German language variants and English fallback; native adapters should be checked with German and English host settings.

## Release work

Version changes go through `scripts/version.py`; never hand-edit only one edition. Build scripts do not commit, tag, push or publish. GitHub Actions assembles a draft after a valid version tag is pushed. Publication remains a separate maintainer action.

For Xcode Cloud setup, local iOS archives and the experimental Mac App Store target, see [Apple builds](apple-builds.md). For listing drafts and reproducible demo captures, see [store preparation](../../store/README.md).
