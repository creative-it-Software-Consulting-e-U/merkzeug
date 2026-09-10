# Apple build setup

Both editions use `com.creative-it.merkzeug` and the existing Apple Developer team. The existing App Store Connect record is Merkzeug (`6799114334`); its iOS version is currently a draft. On 9 September 2026, the owner authorized registering this Mac as a test device and creating the **Merkzeug macOS Development** profile. That profile is active and expires on 9 September 2027; it includes this Mac and the owner's existing development certificates. Keep the downloaded profile outside the repository. No new signing certificate was created.

The local iOS development archive and App Store distribution IPA export both succeeded with Xcode 27 beta. The exported app's signature was verified, with `get-task-allow=false` and `beta-reports-active=true`. This is not evidence of a successful upload or TestFlight processing.

The owner authorized Xcode Cloud access to `creative-it-Software-Consulting-e-U/merkzeug`. Setup completed on 9 September 2026 and created workflow `1E8147B2-4C78-4BCC-894E-5D29A2FD3323`. The public Capacitor dependency initially caused an incorrect request for third-party organization authorization. `CapacitorRuntime/Package.swift` now references the unchanged official Capacitor 8.5.0 binary URLs and SHA-256 checksums locally; a fresh signed archive succeeded. `scripts/prepare-ios-runtime.py` reapplies this package reference after Capacitor sync and rejects unexpected versions/layouts. Review upstream URLs and checksums when upgrading Capacitor. No authorization request was sent to the dependency's organization.

Cloud build 1 (`1884362b-0f49-44e7-876e-0d303e945a69`) was started manually against `codex/store-readiness` at `ab14f92`. It succeeded with Xcode 26.6 (17F113) on macOS Tahoe 26.6.2. Its initial action is Build for iOS. Archive/TestFlight configuration remains pending; the web workflow editor currently returns no Archive schemes. The source is reviewable in [draft PR 2](https://github.com/creative-it-Software-Consulting-e-U/merkzeug/pull/2).

The macOS profile has been downloaded outside Git and validated against the bundle ID, platform and test device. The ARM64 development-signed MAS build now succeeds. `codesign --verify --deep --strict` passes, and the app launches with the German welcome screen from the MAS bundle. The embedded entitlements include the app sandbox, user-selected read/write access and the expected application identifier. A custom signing hook preserving the fingerprint fixed the certificate display-name decoding failure.

The basic vault persistence test passed on 9 September 2026: the owner selected the synthetic Downloads vault, opened `Willkommen`, added `Sandbox-Test`, saved and quit with Command-Q. After relaunching the same signed MAS bundle, the vault was restored without another folder selection; the owner confirmed the saved line remained visible. This validates folder selection, note reading/writing and persistent access across restart for this local folder. Earlier automated file-picker difficulties did not reproduce during manual selection and are not a confirmed application defect. The owner also exported `Willkommen.pdf` and opened it in macOS Preview. The supplied screenshot shows a one-page PDF with headings, task checkboxes, body text and the saved `Sandbox-Test` line. Basic single-note PDF export passed; the additional acceptance cases below remain unverified.

## iOS / Xcode Cloud

Open `mobile/ios/App/App.xcodeproj` and select the shared **Merkzeug** scheme. Its Archive action uses Release. Configure Xcode Cloud for this project/scheme after the reviewed source is pushed to a repository Apple can access:

1. Choose an available Xcode/macOS environment and the existing Apple team. Use the working GeoHook Xcode Cloud configuration as the reference, checking its actual cloud toolchain selection. Local Xcode and the cloud build environment are configured independently; a stable local Xcode installation is not a prerequisite.
2. Run on a controlled release branch/tag. Keep contributor checks separate from distribution actions.
3. Add an iOS Archive action; configure TestFlight distribution when the app record is ready.
4. The checked-in `ci_scripts/ci_post_clone.sh` installs Node 24 if needed, runs `npm ci`, validates versions/tests, builds the web app and synchronizes Capacitor. Electron downloads are skipped for iOS.
5. `ci_pre_xcodebuild.sh` verifies the generated resources and uses `CI_BUILD_NUMBER` for the archive's build number. Set Xcode Cloud's next build number above every number already uploaded for this app; marketing versions remain controlled by `VERSION`.
6. Use automatic/cloud-managed signing. There is no certificate export step in these scripts.

The native `ScreenshotTests` UI-test target and shared `Merkzeug-Screenshots` scheme produce raw and captioned DE/EN images as XCTest attachments. See the [reproducible screenshot pipeline](../../store/automation/README.md) for local runs, Cloud Test actions and result export. Archive signing remains separate.

Local archive check (no distribution/signature claim):

```sh
npm run sync -w merkzeug-mobile
xcodebuild -project mobile/ios/App/App.xcodeproj -scheme Merkzeug \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath /tmp/Merkzeug.xcarchive -derivedDataPath /tmp/merkzeug-derived \
  CODE_SIGNING_ALLOWED=NO archive
```

Local development uses Xcode 27 Developer Beta on macOS 27 beta. The owner reports that stable Xcode cannot launch on this host and already uses Developer Beta with Xcode Cloud for GeoHook. An attempted Xcode 26.6 command returned a license error, but that does not establish why the application cannot launch or make license acceptance a prerequisite. Both unsigned and development-signed local archives succeeded with Xcode 27 beta; continue with that toolchain.

Configure the cloud build environment independently. Before TestFlight distribution or App Store submission, verify that Apple accepts the selected cloud Xcode/SDK combination for that destination. This is a distribution check, not a blocker for local beta development or cloud setup. See [Apple upload requirements](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/).

## Local iOS distribution export

Use an existing App Store distribution certificate in the keychain and a matching profile outside the checkout:

```sh
DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer \
  python3 scripts/export-ios.py /tmp/Merkzeug.xcarchive /tmp/merkzeug-ipa \
  --profile /private/path/to/Merkzeug.mobileprovision
```

This command only exports locally. It does not upload, create credentials or alter build/version numbers. Ensure the build number is unused before uploading. The script puts Apple's system tools first in `PATH`: the local export initially failed because Apple's rsync launched a Homebrew peer that rejected `--extended-attributes`. The export succeeded with the system-only path.

## Electron Mac App Store build

`package-mas.py` adds a distinct MAS/mas-dev build path; DMG builds remain separate. Generated output is ignored under `crossplatform/dist-mas`.

```sh
# Packaging only: unsigned output is not a runnable sandbox acceptance test.
python3 scripts/package-mas.py arm64 --unsigned
# Development-signed sandbox test; values are supplied outside Git.
# MERKZEUG_MAS_IDENTITY: an appropriate Apple Development signing identity
# MERKZEUG_MAS_PROFILE: absolute path to the matching macOS development profile
python3 scripts/package-mas.py arm64
# Appropriate distribution identity/profile plus installer identity are required.
python3 scripts/package-mas.py universal --distribution --store-version 1.0 --build-number 1
```

The MAS signing hook preserves the certificate fingerprint resolved by electron-builder. Passing its display name instead failed locally because `codesign` misdecoded the non-ASCII owner name; setting UTF-8 locale variables alone did not fix it.

For the first Store version, source version `1.0.0` is packaged with the equivalent Store spelling `1.0`. Distribution builds require an explicit unused positive build number. The universal target includes both Electron architectures and both calendar-helper slices, targeting macOS 12 or newer. `MERKZEUG_MACOS_SDK` can select an installed SDK independently of `DEVELOPER_DIR`; the local beta host uses the installed stable macOS 26.5 SDK for this build.

The scripts deliberately reject provisioning profiles inside the checkout. They never upload, notarize MAS builds, install software or create signing identities. Distribution requires the relevant application and installer signing identities in the build keychain. Use the shared certificate qualifier, such as `creative-it (3BNJ4M9R56)`, so both identities can be resolved. The script also accepts and normalizes the Apple Distribution prefix. Keep exported keys/profiles in private storage; an Xcode Cloud wrapper has not been implemented or validated for this Electron target.

The app requests user-selected read/write access, persistent folder bookmarks, outgoing connections and calendar access. Selected vault/template folders are bookmarked and restored when a MAS process starts. These bookmarks are stored in the private app settings, not in notes or source control. The calendar executable and Electron child processes require correct sandbox inheritance when signed.

Remaining acceptance tests on a development-signed MAS build:

- Renew folder access after a folder moves or permission is revoked. Basic local vault selection/edit/save/reopen passed as recorded above.
- Multiple windows, external file changes, image loading, rename/delete and provider-managed folders.
- PDF export of diagrams, images and multi-page documents; batch export to a chosen folder and external template folders. Basic single-note PDF export passed as recorded above.
- Git subprocess execution and authentication under sandbox restrictions. The current integration invokes external Git; do not assume access to the user's SSH keys, agents or credential helpers.
- Calendar helper launch, permission request and meeting-note creation.
- Store validation and app review, including any required packaging/icon metadata.

Do not claim Mac App Store readiness from packaging or the basic persistence test alone. Complete the remaining signed sandbox acceptance tests and store validation before submission.

## Privacy manifest

The iOS app includes `PrivacyInfo.xcprivacy` for its own native code: app-private UserDefaults hold the vault bookmark (`CA92.1`), and modification timestamps of user-selected files detect external changes (`3B52.1`). The app declares no tracking or developer-collected data in this initial manifest. Verify the final archive's aggregate privacy report, SDK manifests and store privacy answers before submission; the app's manifest does not replace dependency-specific declarations. [Apple required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).

## Explicit Mac App Store validation and upload

The macOS Electron edition uses `package-mas.py`; it is not currently an Xcode Cloud product. The existing Cloud default workflow builds the native iOS project. A successful iOS Cloud or screenshot run does not produce a macOS distribution package.

After packaging and checking the bundle version, sandbox entitlements and both architectures:

```sh
# ASC_KEY_ID, ASC_ISSUER_ID and ASC_PRIVATE_KEY_BASE64 come from private storage.
# Use the same DEVELOPER_DIR that provides the supported altool CLI.
python3 scripts/upload-mas.py crossplatform/dist-mas/Merkzeug-1.0.0-mac-universal.pkg
# Validate again, then explicitly upload and wait for processing:
python3 scripts/upload-mas.py crossplatform/dist-mas/Merkzeug-1.0.0-mac-universal.pkg --upload
```

The uploader requires the expected team's Mac App Store installer signature. API keys are materialized only in a private temporary directory outside Git and removed when the command ends. It does not select a Store build, submit to App Review or publish a release. Verify the processed build in App Store Connect before selecting it for version 1.0 and conducting TestFlight acceptance.
