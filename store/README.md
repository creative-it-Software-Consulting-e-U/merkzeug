# App Store preparation

These are reviewable source assets and local screenshot candidates, not a published listing. No credentials belong in this directory.

- `demo/en` and `demo/de`: wholly fictional Markdown notebooks for repeatable captures. Copy a notebook outside this repository before launching desktop captures so its parent Git repository is not shown.
- `metadata/en-US/listing.json` and `metadata/de-DE/listing.json`: initial iOS and macOS listing drafts. macOS copy intentionally makes no Git/calendar promise until those integrations pass signed MAS sandbox testing.
- `screenshots/`: visually reviewed raw candidates for writing and diagrams on iPhone, iPad and Mac. Their provenance and hashes are recorded in `manifest.json`. These demonstrate current UI, not final signed-store-build acceptance.
- `privacy-draft.md` and `support-draft.md`: source drafts requiring final publisher/hosting review before publication.

[Open the screenshot gallery](gallery.html). Capture details and checksums are in [the manifest](screenshots/manifest.json).

## Reproduce screenshots

Build the web/native app first. iOS demo seeding exists only in Debug Simulator builds; it is excluded from Release and physical-device builds. Use dedicated simulators because these commands replace Merkzeug's test installation and its synthetic `Documents/Demo Vault` folder. The fixture never accesses personal vaults. The scripts do not upload screenshots.

```sh
npm run sync -w merkzeug-mobile
xcodebuild -project mobile/ios/App/App.xcodeproj -scheme Merkzeug \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/merkzeug-simulator CODE_SIGNING_ALLOWED=NO build
# Boot a dedicated iPhone or iPad Simulator first; obtain its UUID with simctl list.
python3 scripts/capture-ios-demo.py SIMULATOR_UUID \
  /tmp/merkzeug-simulator/Build/Products/Debug-iphonesimulator/App.app \
  /tmp/merkzeug-captures --edition iphone
# Repeat using an iPad UUID and --edition ipad.
npm run build:desktop
python3 scripts/capture-mac-demo.py /tmp/merkzeug-captures
```

Review every raw capture before copying it here. Preserve original pixels; do not present mockups as working app screens. Both iOS sets currently use Xcode 27 beta simulators. Validate the screenshots against the final app builds before store submission and recapture wherever the UI differs. Beta capture tooling alone does not require replacing an otherwise accurate screenshot. Mac candidates currently come from the Electron desktop development build, not a signed MAS build.

The first set has two scenes per platform/language: formatted writing with links and tasks, and a Mermaid diagram with a table. PDF screenshots should be added only for macOS after signed MAS export validation. Mobile copy and screenshots must not imply mobile PDF support.

## Before upload

Confirm the supported device families, current Apple screenshot dimensions, UI language, text readability, privacy, and fidelity to the submitted build. Choose final ordering and optionally add truthful localized captions. Supply real support/privacy URLs in App Store Connect. Upload manually for the first release; automation can follow once the listing is accepted. No upload credentials or fake service URLs are included here.

[Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)

## Automated localized screenshot artwork

See [the screenshot pipeline](automation/README.md) for real iPhone/iPad UI tests, shared native caption rendering, macOS capture, CI artifacts and Xcode Cloud result export. These are review candidates, not an automatic Store submission.
