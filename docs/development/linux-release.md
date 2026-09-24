# Linux distribution

Linux uses the shared Electron desktop application. From 1.2.1, separate packages target x86_64 and ARM64. Source remains private. Only packaged application files, notices, checksums and download instructions belong in the public `creative-it-Software-Consulting-e-U/merkzeug-downloads` repository.

## Acceptance and parity

Run the manually dispatched `linux-packages.yml` workflow on a reviewed commit. Choose `both`, `x64` or `arm64`; the workflow uses native Ubuntu 24.04 runners for each architecture. It builds AppImage, DEB and RPM, inspects version/architecture/license notices, installs DEB and runs AppImage through FUSE on Ubuntu 24.04, and installs RPM through DNF in Fedora 44 userspace. Fedora runs in a disposable container on the Ubuntu runner's kernel; this is not a full GNOME/KDE/Wayland desktop acceptance test. The application runs as an ordinary user with Chromium sandboxing enabled.

The native suite uses an isolated vault/profile in both English and German. It covers first-run release notes, editing/save/reopen, undo/redo, read-only file errors and retry, external-edit conflict handling, images, Mermaid, reading mode, template-based PDF generation, meeting-note creation, companion assets and incoming links on rename/move, vault/central template selection, agent guidance and Git status/commit. Reports include package and PDF hashes. Physical printer output and provider-specific Git/calendar authentication require a configured user environment.

| Feature | Linux behavior |
| --- | --- |
| Visual editor, Mermaid, frontmatter, reading mode | Shared desktop editor |
| Auto-naming, assets, incoming links on move/rename | Shared desktop file operations |
| PDF templates, combined export, frontmatter controls | Shared Chromium PDF renderer |
| Printing | System print dialog; printers/drivers must be configured |
| Templates across devices | Vault-relative settings or mounted sync folders; no automatic iCloud discovery |
| Git | Installed Git executable and user's configured authentication |
| Meeting notes | ICS import and HTTPS/Webcal subscriptions; no native GNOME/KDE calendar integration |
| Private calendar subscriptions | OS keyring required; no insecure plaintext fallback |
| Agent prompts and instruction-file selection | Shared desktop features |
| Updates | Manual download/install; no auto-updater |

## Publication

Download `linux-packages-x64` and `linux-packages-arm64` only from a successful run; validate `SHA256SUMS.txt`, inspect the acceptance reports and review rendered PDF/screenshots. Upload the six unchanged packages and combined checksums to a draft release in the **binary-only** download repository. Publish after acceptance, then enable website links. Never upload the source archive, tests, fixtures, credentials or private validation artifacts to this public repository. GitHub's automatically generated source ZIP contains only that repository's public download instructions, not Merkzeug source.

AppImage requires FUSE 2. DEB installation uses APT for dependencies; RPM uses DNF. Do not suggest `--no-sandbox`. Checksums are integrity checks, not certified publisher signatures. Do not replace published binaries under an existing version; use a new version for subsequent binary changes.

For test-only changes, the optional `package_run` input reuses the previous architecture-specific `linux-packages-<architecture>` artifact and verifies its checksums before installation. Report both the binary build commit/run and the test commit/run when using this option.

## Release evidence — 24 September 2026

- Binary source: `6d26358a5bb83db6067ef84928eeb84ef307d4b0`, build run `35996484698`.
- Final exact-binary acceptance: `5711318`, run `35997466508`, **success**. AppImage, DEB and RPM each passed all 14 checks in English and German (six runs). The prior RPM German run needed the test to scroll the diagram into view; no application change or binary rebuild was required.
- Shared checks: 53 tests, 21 release checks, TypeScript and version consistency passed. Secret scan of history/current source passed.
- Reviewed all four pages of Ubuntu and Fedora PDFs, including cover, TOC, Mermaid, table, image, linked document and page furniture. Native system print dialog and physical output remain unverified in the headless runner.
- Local ZIP extraction and uploaded GitHub asset SHA-256 digests matched. Full private reports/PDFs/screenshots are retained as workflow artifacts; public downloads contain only the three packages and checksums.

3831e37ac52d15464c4dedf5e59263d561abf32aa344bae9bccdaab38151e64b  Merkzeug-1.2.0-linux-x64.AppImage
4c3dc72154f5f3284661861bcc497b7a18c03e33333def028e2b2130f5eac9cb  Merkzeug-1.2.0-linux-x64.deb
5eae478261ece069eca968d2b750c08d5d48f996c831d44153b830fa222fc479  Merkzeug-1.2.0-linux-x64.rpm

## Linux 1.2.1

This Linux-only publication adds native ARM64 packages and fixes desktop accelerators that were still hard-coded to macOS Command keys. Mac bindings are preserved; Linux/Windows use Control, with Ctrl+Alt+Shift+N for meeting notes and F1 for help. Tooltip labels and the shared offline/website manuals agree with these bindings. The shared source manifests advance to 1.2.1 for consistent artifact versioning; this does not publish new Apple or IntelliJ binaries.

Artifacts are named `linux-packages-x64` and `linux-packages-arm64`; acceptance reports are `linux-validation-x64` and `linux-validation-arm64`. Supply `package_run` only with matching architecture artifacts to retest the exact unchanged binaries. Keep the 1.2.0 public artifacts immutable. Publish all six 1.2.1 packages and one combined SHA256SUMS.txt in the binary-only download repository before deploying website links.

### Validated 1.2.1 artifacts

Build and native acceptance run: **36000809472**, binary source **18c4fc4950a1545f991e25665f63d7700503fb72**. All twelve architecture/package/locale combinations passed all fifteen acceptance checks, including Linux menu accelerators and tooltip labels. Both native runners passed 54 shared tests, TypeScript/version checks and 21 release checks. Installed package hashes and uploaded release asset digests match. All four pages of representative ARM64/Fedora and x64/Ubuntu PDFs were visually reviewed (cover, TOC, Mermaid/table/image, linked note). The same limitations about physical printers, authenticated providers and full desktop environments still apply.

```text
2d8a2d88b997ac27a2717e2458a6aa07fc8a50023b59e3ec69fc8bee5f645005  Merkzeug-1.2.1-linux-x64.deb
867111cbc4ae76574d03c253f84068e3b7e3fab55a090b82dbbc84c2d71cd73b  Merkzeug-1.2.1-linux-arm64.AppImage
901775a8bb443e481d820056e6cacb0bd96f699b91639d7eeba7a218263bf604  Merkzeug-1.2.1-linux-arm64.rpm
984ec04993938fcd19c0c08ecb1ba3659a3596ccbca1c4de83342622fc4ac8f7  Merkzeug-1.2.1-linux-x64.rpm
cf826f78f415c1c3c21fde22ede77bbc15c5b1f6d172e21103b4dd32d2066db6  Merkzeug-1.2.1-linux-arm64.deb
edf1f4a45fdecbfbe6423b83a746818f8eed92ffedb66fe014f7e85dc2435d83  Merkzeug-1.2.1-linux-x64.AppImage
```
