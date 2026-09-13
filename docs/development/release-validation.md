# Release candidate validation

Issue [#17](https://github.com/creative-it-Software-Consulting-e-U/merkzeug/issues/17) is the acceptance record. Build success, screenshot generation and an unsigned package are different claims. Keep the issue open until each selected release target has the evidence below and every unshipped target is explicitly documented.

## Reproduce the candidate

Run **Validate release candidates** (`preview-packages.yml`) on a fixed reviewed commit. The workflow builds unsigned macOS ARM64/x64 DMGs, Windows x64/ARM64 NSIS installers, Linux x64 AppImage/DEB/RPM and the IntelliJ ZIP. It creates no tags and no GitHub release. PR runs validate their merge commit; repeat on the reviewed main commit before choosing production artifacts.

The assembly job requires all expected filenames for the source version, bundles documentation and writes per-file SHA-256 and byte counts with the source commit in `release-manifest.json`. Download `release-candidate-matrix` and verify `SHA256SUMS.txt`. Retain it with the native evidence artifacts for the release; Actions retention is 30 days, not permanent archival.

## Native package checks

`scripts/install-validation-package.py PACKAGE OUTPUT --arch ARCH` uses:

- macOS: read-only DMG mount, copy the app into an isolated directory, unmount, launch the copied executable.
- Windows x64: actual silent NSIS installation into an isolated directory on the disposable runner.
- Linux x64: actual DEB installation with APT dependency resolution on the disposable Ubuntu runner.
- AppImage: real FUSE launcher execution on the Ubuntu runner, with no extraction fallback. Desktop/menu integration still requires manual review.
- RPM: native installation needs an RPM-based machine. Building the RPM does **not** prove installation there.

Do not run the Linux installer on a personal machine unless you intend to install the package. The test creates an isolated fictional vault and Electron user profile; it does not replace the user's installed Mac app or edit their notes.

The Playwright Electron test launches the installed package, requires `app.isPackaged`, matches its version and native architecture, and records its app.asar hash. It checks bundled license/notices/help, editing and persisted autosave, close/reopen, undo/redo, read-only save failures with retry, conflicting external writes with explicit reload, rendered Mermaid, and PDF export with a cover, contents, header/footer, linked document, diagram, table and image. It runs with English and German app locales. PDF output uses the existing test destination instead of automating native Save dialogs. The original PDF and editor screenshot are retained for visual review; a PDF header/size check alone does not establish visual correctness.

Review these separately and record actual results rather than marking them passed by association:

| Area | Required evidence |
| --- | --- |
| Windows ARM64 | Native installation and full test on ARM64; x64 cross-build is insufficient |
| Linux AppImage | Desktop/menu integration and distribution-specific security behavior |
| Linux RPM | Native RPM-based install and runtime acceptance |
| IntelliJ | Install the ZIP into supported IDEA/JCEF, edit/save/reopen, conflict handling, links and PDF; coordinate #19 |
| iOS | Physical device / Files provider persistence, edits, conflicts and background/relaunch; screenshot simulator tests do not replace this |
| All shipped editions | PDF visual review; image/heading links and applicable OS security prompts |

## Signing and approval

Never add production signing material until GitHub's `release-signing` environment requires a named human reviewer and permits only `v*` **tags**, not branches. `check-release-protection.py` validates the actual remote rules before stable Mac/Windows build jobs. Missing environment, missing reviewers, API permission failures and unexpected ref policies all stop the workflow. A manually dispatched workflow alone is not an equivalent protected-secret approval.

On 9 September 2026 GitHub rejected required-reviewer protection for this private repository with HTTP 422 and a billing-plan message. Its partially created empty environment was removed. Resolve repository visibility/eligible plan with the owner before setting credentials. No signing secrets were configured or exported during this work. Windows production signing remains coordinated with #20.

Unsigned candidate validation deliberately does not access signing secrets. Preview and Linux-only jobs use a separate environment and receive no Mac/Windows signing values. Stable macOS/Windows packaging requires signing configuration; successful signing must also be inspected on the resulting package. `verify-desktop-signatures.py` blocks production drafts unless the Mac bundle passes codesign/Gatekeeper/stapler validation or both the Windows installer and executable have a valid timestamped Authenticode signature. Record `codesign`, Gatekeeper/notarization/stapler results for direct Mac distribution and Authenticode chain/status for Windows. App Store archives/profiles and TestFlight are a separate delivery track.

## Independent editions

The release workflow's manual `editions` input accepts comma-separated keys: `mac-arm64`, `mac-x64`, `win-x64`, `win-arm64`, `linux-x64`, `intellij`. Empty means all. It still requires an existing matching version tag. Assembly rejects missing formats and assets from unselected editions. For example:

```sh
python3 scripts/release-artifacts.py release-artifacts --editions linux-x64
```

This requires all three Linux formats plus the generated documentation ZIP. It does not claim native acceptance or authorize publication. A release stays a draft; a maintainer must review evidence and publish manually. Existing releases/tags/assets are never overwritten. Later independently shipped editions use an unused release version/tag rather than silently replacing a prior release.

## Completion record

Before closing #17, link the reviewed source SHA, CI run, artifact manifest, installed package hashes, native test reports and PDF review. List untested/deferred targets and confirm they are not advertised as released. Record signing verification, environment protection and the maintainer's manual release decision. Do not close while the protection/signing or required native-device checks remain unresolved.

## Defects caught by native validation

The first Windows x64 installation test exposed saves relying solely on filesystem notifications. Each renderer now retains its own last explicit read and rejects stale writes, including synchronous close-time saves; watcher peeks cannot refresh that baseline. Rename/move operations migrate the baseline. This is optimistic conflict detection, not a filesystem transaction against arbitrary external processes. A regression test covers two windows, external edits, peeking, explicit reload and rename.

The first Linux install attempt also exposed electron-builder substituting different architecture names per format (`amd64` / `x86_64`). The packaging script now explicitly writes the selected release architecture into every filename, matching the manifest contract.

## Printing acceptance

After building the desktop app, run `scripts/test-desktop-print.cjs` using the installed Electron executable. It opens an isolated synthetic vault, edits a note through native input, invokes the actual Print menu action, checks PDF generation and saved content, simulates cancellation at the OS spooler boundary, and checks temporary-file cleanup. It never sends paper to a printer. On macOS: `crossplatform/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/test-desktop-print.cjs`.

The iOS UI test `ScreenshotTests/testPrinting` verifies print preparation, AirPrint presentation, cancellation and returning to the note in an isolated simulator. The IntelliJ smoke test checks native Print handler selection, editor isolation and the common PDF pipeline. Manually verify printer selection and actual paper output on each target OS before claiming physical-printer compatibility. Windows/Linux native print-dialog acceptance remains separate from macOS and simulator validation.
