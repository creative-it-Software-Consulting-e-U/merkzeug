# Merkzeug

[Website and guides](https://merkzeug.creative-it.com/) · [App Support](https://support.apps.creative-it.com/?app=merkzeug&lang=en)

**Write Markdown visually. Keep ordinary files. Export documents as PDF.**

Merkzeug is a WYSIWYG editor for Markdown notes stored in a regular folder, called a *vault*. It supports tables, images, Mermaid diagrams and YAML frontmatter. Your notes stay portable `.md` files.

The desktop app and IntelliJ plugin share their editor and PDF rendering code. The iOS app uses the same editor with a native file-provider adapter.

## Choose your edition

| Edition | Availability | PDF export | Get started |
| --- | --- | --- | --- |
| Mac | App Store | Templates, linked documents and printing | [Desktop guide](docs/user/desktop.md) |
| Linux (x86_64 and ARM64) | AppImage, DEB and RPM | Templates, linked documents and printing | [Desktop guide](docs/user/desktop.md) |
| IntelliJ IDEA | JetBrains Marketplace | Templates, linked documents and printing via JCEF | [IntelliJ guide](docs/user/intellij.md) |
| iPhone and iPad | App Store | Templates, linked documents and AirPrint | [iOS guide](docs/user/ios.md) |
| Windows | Coming soon | Shared desktop implementation; release validation pending | [Desktop guide](docs/user/desktop.md) |
| Android and VS Code | Planned | Not released | [Architecture](docs/shared-architecture.md) |

Find current [downloads on the website](https://merkzeug.creative-it.com/). Existing Linux downloads remain in the [binary distribution repository](https://github.com/creative-it-Software-Consulting-e-U/merkzeug-downloads/releases) so installed links stay valid. See `intellij/sdk.json` for the plugin's tested IDE versions; compatibility is verified per release.

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

Native platform support requires release-by-release testing; see the [release checklist](docs/development/releases.md).

## License

Merkzeug is licensed under the [MIT License](LICENSE). Commercial use, modification and redistribution are permitted with the required notices. Dependencies retain their own licenses; distribution packages include third-party notices. See [BRANDING.md](BRANDING.md) for product-name and logo information. Historical releases retain their original license notices.
