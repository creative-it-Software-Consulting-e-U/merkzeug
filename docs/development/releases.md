# Release management

## Status and distribution policy

The workflow in `.github/workflows/release.yml` prepares **draft GitHub releases**. It has not yet been exercised on GitHub for this repository. Local checks and successful compilation must not be described as a published or fully validated multi-platform release.

The first public release should be a prerelease, for example `0.1.0-beta.1`. Prerelease builds are deliberately unsigned desktop previews and are labeled accordingly. A version without a prerelease suffix requires macOS Developer ID signing and notarization and Windows code signing; missing credentials fail those jobs. The IntelliJ ZIP is unsigned and installed from disk in both cases.

The workflow never publishes a draft, changes repository visibility, submits to JetBrains Marketplace or uploads to TestFlight. Automatic in-app updates are not implemented. Users install newer binaries manually.

## Apple distribution decision

Both iOS/iPadOS and macOS are intended for App Store distribution under the maintainer's existing Apple Developer account. Keep the shared bundle identifier `com.creative-it.merkzeug`, already configured in Electron, Capacitor and the iOS targets. Use one App Store Connect app record with iOS and macOS platforms (universal purchase), with separate builds, signing/provisioning and platform-specific store metadata. The registered identifier and shared App Store Connect record 6799114334 have been verified; iOS and macOS drafts exist.

The current DMG pipeline is a direct-download build, not a Mac App Store build. Store readiness requires a separate Electron MAS target, App Sandbox entitlements, persistent access to user-selected folders, and verification of Git subprocesses, calendar helpers and PDF export inside the sandbox. iOS requires a signed archive, device testing, TestFlight and App Review. Neither store submission is automated or complete yet.

A future Premium/Pro subscription is a possibility, not a current feature commitment. Prefer an upgrade within this same app rather than a separate Pro bundle identifier. Apple purchases can be shared across the platform versions when configured and implemented accordingly; the bundle identifier alone does not implement purchase restoration or entitlement checks. If introduced, native StoreKit adapters should supply purchase entitlements to a platform-neutral feature-access interface. Cross-platform entitlement sharing with Windows, Linux or IDE plugins would require a separate design. Do not add billing, account requirements or feature restrictions now.

References: [Apple: adding platforms and universal purchase](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-platforms), [shared In-App Purchases](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases), [Electron Mac App Store requirements](https://github.com/electron/electron/blob/main/docs/tutorial/mac-app-store-submission-guide.md).

## Public source, private credentials and store assets

The public repository contains source code, reproducible build scripts, dependency locks, entitlements, bundle identifiers, non-secret configuration and documentation. Signing certificates/profiles, private keys, API tokens, passwords and signing-key backups must remain outside Git. Bundle IDs and team IDs are identifiers rather than authentication secrets. Certificate/profile files are excluded by project policy even when their certificate portion is public.

Use Apple's cloud-managed signing where the Xcode Cloud integration supports it. For other release systems, keep credentials in the CI provider's secret storage and use a temporary runner keychain or the selected cloud signing provider. Prefer short-lived workload authentication when supported. Never include credentials in artifacts or print them from custom build scripts. Local exported credentials and recovery material belong in a private credential vault, outside the checkout.

Before adding production credentials to GitHub, configure protected release environments and restrict release refs and who can modify/run signing workflows. The existing workflow is an initial draft: the desktop job now references `release-signing`, but the remote required-reviewer setup is currently blocked by the private-repository billing plan. Stable signed builds now fail closed until the required reviewer and version-tag policies exist. Contributor checks must run without signing or store-upload credentials. Ignored filenames are only an accidental-commit safeguard; inspect tracked files, Git history, logs and artifacts before making the repository public. A historical leak requires credential rotation as well as repository cleanup. A Gitleaks scan of local Git history and the current source passed on 2026-09-09. One exact historical false positive (an App Store Connect issuer UUID, not a credential) is recorded in `.gitleaksignore`. Repeat `npm run check:secrets` before publication; automated scanning is not proof that no secret exists.

### Xcode Cloud responsibilities

- iOS: **iOS App Store** uses the shared `Merkzeug` scheme, public Xcode 26.6, preparation scripts, Apple-managed signing and an internal TestFlight post-action. It starts automatically on every new commit to `main`, with no path filter.
- macOS: **macOS App Store** uses the archive-capable `crossplatform/macos/Merkzeug.xcodeproj` target to package the universal Electron MAS app. Cloud verifies the real payload and applies managed distribution signing, followed by automatic TestFlight upload. See the validation evidence in [Apple build setup](apple-builds.md).
- Windows, Linux and IntelliJ: GitHub Actions remains the planned build service.

Xcode Cloud setup and access control live in Apple's service; safe custom scripts stay in source control. [Cloud-managed signing](https://developer.apple.com/help/account/certificates/cloud-managed-certificates/), [Cloud workflow requirements](https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow), [custom scripts and secret variables](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts).

### Store presentation and screenshots

Store presentation is a separate release deliverable. Use public, synthetic demo notes rather than personal vaults, project screenshots or private calendar data. Maintain an English and German screenshot plan for iPhone, iPad and macOS; each edition must show features it actually supports. In particular, do not advertise mobile PDF export before it exists.

Create screenshot sets from validated builds, review them, and promote them into `store/upload/`. Use the optional API upload workflow described in [screenshot uploads](../../store/automation/UPLOAD.md); `keep` is the release default, `if-missing` fills empty sets, and `sync` updates reviewed images. Xcode Cloud can retain screenshots attached to UI tests, but those are test artifacts, not an automatically curated or uploaded store listing.

Public demo data, store descriptions and approved screenshot assets may be versioned in the public repository; they are not signing secrets. Keep raw captures in private temporary storage until reviewed. Store-upload API keys remain in secret storage. Prepare public support and privacy-policy URLs alongside descriptions, keywords and screenshots. An initial bilingual screenshot set, reproducible capture scripts and listing drafts are provided in [store preparation](../../store/README.md). Store screenshot uploads are available as an explicit release option or a standalone workflow.

References: [test artifacts in Xcode Cloud](https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow), [screenshot requirements](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), [uploading screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/).

## Version policy

`VERSION` is the release source of truth. Active npm workspaces, internal package references, the IntelliJ descriptor and iOS marketing version must agree. iOS marketing versions omit prerelease suffixes; the numeric Xcode build number must increase for each new TestFlight upload, including rebuilds of the same version.

```sh
python3 scripts/version.py set 0.1.0-beta.1 --ios-build 2
npm install --package-lock-only
python3 scripts/version.py check
```

Review the lockfile diff and update `CHANGELOG.md`. Move the reviewed Unreleased changes into a versioned section when preparing the release. The scripts do not create commits or tags.

After committing the reviewed release state:

```sh
git tag -a v0.1.0-beta.1 -m "Merkzeug 0.1.0-beta.1"
git push origin v0.1.0-beta.1
```

Use an unused tag. Do not move released tags or replace published binary assets. Publish a new patch/prerelease version for corrections. A manual workflow dispatch must target an existing version tag, not a branch.

## What the pipeline builds

| Edition | Runner/target | Release assets |
| --- | --- | --- |
| macOS | Native Intel and Apple silicon runners | One DMG per architecture |
| Windows | x64 runner; x64 and ARM64 targets | Separate NSIS installers |
| Linux | Ubuntu x64 | AppImage, DEB and RPM |
| IntelliJ | Linux; checksum-pinned IDEA SDK | `merkzeug-VERSION.zip` |
| Documentation | Release assembly job | `merkzeug-VERSION-documentation.zip` |

The assembly job requires the requested edition matrix (all by default), rejects mismatched versions and writes `SHA256SUMS.txt` and `release-manifest.json`. Checksums detect changed downloads; they are not a substitute for publisher signatures. The manifest records the source commit, workflow run, signing policy and hashes. An existing release is never overwritten by the workflow; inspect its state before retrying.

Artifacts from failed/unfinished runs are temporary Actions artifacts, not releases. Runtime validation for Windows ARM64, Linux packaging and each native UI remains part of the checklist even when cross-compilation succeeds.

## GitHub setup

1. Enable Actions for the repository and ensure hosted runners are available.
2. Add the signing secrets below before attempting a stable version.
3. Protect the main development branch and limit who can push version tags. Require the Checks workflow for pull requests.
4. Enable private vulnerability reporting if desired; the documented email channel remains available.
5. Run a prerelease on GitHub and inspect every job and artifact before publishing the first draft.

Fork pull requests run checks with read-only repository access. Signing credentials are used only in release jobs, not in the pull-request workflow.

### Signing secrets

| Secret | Purpose |
| --- | --- |
| `MAC_CSC_LINK` | Base64-encoded macOS Developer ID Application certificate in P12 format |
| `MAC_CSC_KEY_PASSWORD` | P12 password |
| `APPLE_API_KEY_BASE64` | Base64-encoded App Store Connect P8 key for notarization |
| `APPLE_API_KEY_ID` | App Store Connect API key ID |
| `APPLE_API_ISSUER` | App Store Connect API issuer ID |
| `WINDOWS_CSC_LINK` | Base64-encoded Windows code-signing certificate in PFX/P12 format |
| `WINDOWS_CSC_KEY_PASSWORD` | Windows certificate password |

A hardware-token or cloud-signing Windows certificate requires a provider-specific integration; the current script expects an importable certificate. Never store certificates or API keys in the repository. The workflow writes the notarization key to a temporary runner path and removes it after packaging.

The project currently uses electron-builder **26**; retain its schema when consulting documentation. See [v26 macOS settings](https://www.electron.build/v26/docs/mac/) and [electron-builder signing guidance](https://www.electron.build/docs/features/code-signing/).

## Local artifact checks

```sh
python3 scripts/package-desktop.py mac arm64
npm run build:intellij
mkdir -p release-artifacts
cp intellij/dist/merkzeug-*.zip release-artifacts/
python3 scripts/release-artifacts.py release-artifacts
```

The first command makes an unsigned local preview. Use `--signed` with the documented environment variables for signed desktop packages. Local assembly may contain a subset of platforms; Candidate validation uses `--complete` to require every binary. Release assembly can use `--editions` to require an exact independently selected subset. Review the manifest's `workingTreeModified` field for local builds.

The SDK version, build and Linux archive checksum are pinned in `intellij/sdk.json`. Updating the SDK is a reviewed compatibility change: update the pin, plugin build range if necessary, compile, and run the IDE smoke test. CI downloads only this SDK, never a moving “latest” URL.

## Pre-publication checklist

- [ ] License, authorship and third-party license notices reviewed; source and documentation may be made public.
- [ ] Version check, tests, type checks, documentation checks and all build jobs pass.
- [ ] Install each binary on its target OS/architecture, launch, edit, save, close and reopen.
- [ ] Verify conflicts, undo/redo, note/image links and read-only behavior.
- [ ] Test English and German host languages; record known theme issues.
- [ ] Export a PDF with Mermaid, tables, images, cover, header/footer, linked notes and a table of contents; visually inspect it.
- [ ] Verify stable macOS binaries with `codesign --verify --deep --strict`, `spctl --assess`, and `xcrun stapler validate`; verify Windows publisher signatures with `Get-AuthenticodeSignature`.
- [ ] Check release filenames, checksums, source commit, signing notes and documentation ZIP.
- [ ] Replace the draft's maintainer placeholder with actual changes, tested platforms and known limitations.
- [ ] Publish the reviewed draft manually. Announce availability only after publication succeeds.

If a release is faulty, mark it clearly in the release notes and publish a fixed version. Do not silently replace assets; users need hashes and version identities to remain meaningful.

## iOS releases

iOS is a separate delivery track: build and test on a device, increment the build number, archive in Xcode, validate, and upload using Organizer to App Store Connect. Distribute approved beta builds through TestFlight; link an actual invitation in the release notes only when it exists. App Store distribution is a required target and follows a separate App Review submission.

There is no automated iOS signing or TestFlight upload job yet. Select your own development team when building a fork; the existing Xcode project may contain the maintainer's team identifier. Record the source commit, marketing version and build number for every upload. See [Apple's distribution guide](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases) and [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview).

For artifact storage behavior, see [GitHub's workflow artifacts documentation](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts). These short-lived artifacts and a published GitHub Release serve different purposes.

See [Apple build setup and local validation](apple-builds.md) for the implemented Cloud scripts, MAS packaging and remaining native checks.

## Packaging validation without Apple

Run `Validate release candidates` on a fixed source ref to exercise macOS ARM64/x64, Windows x64/ARM64, Linux x64 and IntelliJ packaging, with installed-package runtime tests on supported native runners. It uses no signing
credentials, creates no version tag or GitHub release, and retains private workflow
artifacts for 14 days. These unsigned packages are validation candidates, not a
public release or proof of native installation/runtime acceptance. Production
Windows signing still requires the maintainer's chosen signing identity/provider.

See [the release validation runbook](release-validation.md) for native coverage, independent edition selection, protected signing, retained evidence and unresolved acceptance requirements.
