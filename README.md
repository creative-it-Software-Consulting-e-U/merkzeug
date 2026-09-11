# Merkzeug

[Website and guides](https://merkzeug.creative-it.com/) · [App Support](https://support.apps.creative-it.com/?app=merkzeug&lang=en)

**Write Markdown visually. Keep ordinary files. Export documents as PDF.**

Merkzeug is a WYSIWYG editor for Markdown notes stored in a regular folder, called a *vault*. It supports tables, images, Mermaid diagrams and YAML frontmatter. Your notes stay portable `.md` files.

The desktop app and IntelliJ plugin share their editor and PDF rendering code. The iOS app uses the same editor with a native file-provider adapter.

## Choose your edition

| Edition | Availability | PDF export | Get started |
| --- | --- | --- | --- |
| Desktop: macOS, Windows, Linux | Preview | Yes, including linked documents and templates | [Desktop guide](docs/user/desktop.md) |
| IntelliJ IDEA | Preview; targets IDEA 2026.2.2 / build 262.10315+ within 262 | Yes, using JCEF | [IntelliJ guide](docs/user/intellij.md) |
| iPhone and iPad | Development builds; no public TestFlight link yet | Not implemented | [iOS guide](docs/user/ios.md) |
| VS Code | Planned; not implemented | Not implemented | [Architecture](docs/shared-architecture.md) |

Download binaries from [GitHub Releases](https://github.com/creative-it-Software-Consulting-e-U/merkzeug/releases) **when available**. This repository contains the release infrastructure; that does not mean a public release has already been published. Read each release's platform, signing and known-issues notes before installing.

## Documentation

- [User documentation](docs/user/README.md): installation, editing, PDF export and troubleshooting.
- [Development guide](docs/development/README.md) and [shared architecture](docs/shared-architecture.md).
- [Contributing](CONTRIBUTING.md), [release management](docs/development/releases.md) and [changelog](CHANGELOG.md).
- [Security reporting](SECURITY.md).

**English is the primary source language** for documentation, issues, pull requests and release notes. The UI follows the system language: German on German systems, English otherwise. German help remains available as a secondary translation. Existing frontmatter keys, template filenames and user documents remain compatible.

## Development quick start

Install Node.js 24 LTS and Python 3.12 or later. From the repository root:

```sh
npm ci
npm test
npm run typecheck
npm run build:desktop
npm run build:mobile
npm run dev -w merkzeug
```

To build the IntelliJ plugin against a matching locally installed IDE:

```sh
npm run build:intellij
```

See the [development guide](docs/development/README.md) for SDK setup and native builds. No signing certificate is required to run the web development builds.

## Repository layout

| Directory | Purpose |
| --- | --- |
| `packages/core` | Frontmatter, paths, export planning and template data |
| `packages/editor` | Shared visual editor, Mermaid and search |
| `packages/export` | Shared PDF content and print styles |
| `crossplatform` | Electron desktop application |
| `intellij` | IntelliJ document adapter and JCEF host |
| `mobile` | Capacitor iOS application and native vault adapter |
| `SampleVault` | Example notes; includes existing German examples |
| `legacy` | Archived native macOS implementation; outside the current release pipeline |

Merkzeug is preparing for its first proprietary release. Preview builds and native platform support still require release-by-release testing; see the [release checklist](docs/development/releases.md).

## License

Merkzeug is proprietary software, available for private and internal business use under the [Merkzeug End User License Agreement](LICENSE). Dependencies retain their own licenses; distribution packages include third-party notices.
