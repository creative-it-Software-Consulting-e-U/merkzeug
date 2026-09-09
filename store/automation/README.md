# Reproducible App Store screenshot candidates

The pipeline captures the real editor with fictional notes from `store/demo`, then adds short English/German explanations from `captions.json`. `ScreenshotFrame.swift` is the shared, network-free Apple graphics compositor. Input proportions are preserved; clipped caption text fails the build. No screenshot upload, App Store submission or credential export happens automatically.

## iOS and iPadOS: Xcode Cloud

Use `mobile/ios/App/App.xcodeproj`, shared scheme **Merkzeug-Screenshots**, a **Test** action with one supported large iPhone and one 13-inch iPad. Disable parallel test execution and test retries for the screenshot workflow. Pin the Xcode/runtime selection per release. Both languages are exercised by the test suite; no separate localization workflow is necessary. Keep the release Archive action on **Merkzeug** and Release configuration.

The existing post-clone script builds and synchronizes Capacitor. Screenshot fixtures and captions are test-bundle resources, so tests work on Cloud's separate test workers without repository paths or post-clone scripts there. Only Debug simulator builds accept fixture injection. No device or Release build contains that hook.

Tests wait for the actual editor, fonts, rendered Mermaid SVG and expanded metadata panel. Each scene attaches `raw-…` and `store-…` PNGs with `.keepAlways`. The exporter rejects failed runs, missing scenes and unsupported dimensions, and records image hashes and the test/device summary. These live in the downloadable **test result bundle**, not in an arbitrary temporary directory that Cloud might discard. Download the successful result and run:

```sh
python3 scripts/export-screenshot-results.py /path/to/Result.xcresult /tmp/merkzeug-screenshots
```

Local equivalent (choose a dedicated simulator UUID; use Xcode beta on the current development Mac):

```sh
npm run sync -w merkzeug-mobile
xcodebuild -project mobile/ios/App/App.xcodeproj -scheme Merkzeug-Screenshots \
  -destination 'platform=iOS Simulator,id=YOUR-DEDICATED-SIMULATOR' \
  -parallel-testing-enabled NO -resultBundlePath /tmp/Merkzeug.xcresult test
```

The configured **Store Screenshots** Cloud workflow uses Xcode 26.6 (17F113), macOS Tahoe 26.6.2, iPhone 17 Pro Max and iPad Pro 13-inch (M5). It starts automatically on main changes and permits manual branch builds. Its currently selected **Merkzeug** scheme includes the same screenshot tests; the dedicated **Merkzeug-Screenshots** scheme can be selected after Cloud discovers it. A successful Cloud Test run must be verified separately from local tests. A successful Build action does not generate screenshots. Captioned images remain candidates until reviewed against the submitted Release app.

## macOS: Electron capture and composition

```sh
npm ci
npm run build:desktop
python3 scripts/capture-mac-demo.py /tmp/merkzeug-raw
python3 scripts/frame-store-screenshots.py /tmp/merkzeug-raw /tmp/merkzeug-store --edition macos
```

Alternatively use **Store screenshot candidates** in GitHub Actions (manual dispatch or a pull request changing screenshot automation). It runs on macOS, isolates every scene's profile and vault, captures the real Electron app and saves raw images, composed images and provenance in a 30-day build artifact. It never modifies the installed app. Output dimensions must be an accepted macOS 16:10 screenshot size.

The current macOS app is Electron, not an Xcode app target. Its capture needs Electron and a usable graphical session. Do not claim that the iOS Cloud workflow builds/signs/tests the Mac app. A macOS Xcode Cloud runner/wrapper and actual capture there remain unvalidated. Keep this working independent pipeline until that is demonstrated; compare the visuals with the signed MAS build before upload.

## Release review

- Run all three scenes (writing, diagrams, frontmatter), in both languages, on iPhone, iPad and Mac: 18 framed images and their raw originals.
- Confirm expected note, complete diagram, expanded metadata, correct language, no alerts, keyboard, debug overlays or personal data.
- Pin Xcode/runtime, Electron dependency lockfile and runner image for a release. The native status bar clock can vary between captures. System fonts may differ between OS releases; pixel identity across different operating systems is not promised.
- Screenshots are opaque sRGB PNG. Keep the original supported pixel dimensions. Update the dimension allowlist only after checking Apple's current specification.
- Preserve result bundles and manifests alongside the release candidate; do not mix screenshots from different builds.
- Match the app's marketing version to the App Store Connect draft, validate signed archives, distribute a TestFlight candidate and finish sandbox acceptance before requesting App Review.

References: [Xcode Cloud workflow artifacts](https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow), [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
