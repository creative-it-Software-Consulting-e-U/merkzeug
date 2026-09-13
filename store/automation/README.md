# Reproducible App Store screenshot candidates

The pipeline captures the real editor with fictional notes from `store/demo`, then adds short English/German explanations from `captions.json`. `ScreenshotFrame.swift` is the shared, network-free Apple graphics compositor. Input proportions are preserved; clipped caption text fails the build. Capture jobs do not change Store listings. The separate [release upload workflow](UPLOAD.md) can upload the reviewed bundle on demand; it never submits the app or exports credentials.

## iOS and iPadOS: Xcode Cloud

Use `mobile/ios/App/App.xcodeproj`, shared scheme **Merkzeug-Screenshots**, a **Test** action with one supported large iPhone and one 13-inch iPad. Disable parallel test execution and test retries for the screenshot workflow. Pin the Xcode/runtime selection per release. Both languages are exercised by the test suite; no separate localization workflow is necessary. Keep the release Archive action on **Merkzeug** and Release configuration.

The existing post-clone script builds and synchronizes Capacitor. Screenshot fixtures and captions are test-bundle resources, so tests work on Cloud's separate test workers without repository paths or post-clone scripts there. Only Debug simulator builds accept fixture injection. No device or Release build contains that hook.

Tests wait for the actual editor, fonts, rendered Mermaid SVG and expanded metadata panel. The mobile Git caption explains the Working Copy file-provider workflow; Git commands and PDF export are not implemented in the iOS app. Each scene attaches `raw-…` and `store-…` PNGs with `.keepAlways`. The exporter rejects failed runs, missing scenes and unsupported dimensions, and records image hashes and the test/device summary. These live in the downloadable **test result bundle**, not in an arbitrary temporary directory that Cloud might discard. Download the successful result and run:

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

The configured **Store Screenshots** Cloud workflow uses Xcode 26.6 (17F113), macOS Tahoe 26.6.2, iPhone 17 Pro Max and iPad Pro 13-inch (M5). It starts automatically on main changes and permits manual branch builds. Its currently selected **Merkzeug** scheme includes the same screenshot tests; the dedicated **Merkzeug-Screenshots** scheme can be selected after Cloud discovers it. Cloud build 8 passed both languages on both destinations at `c7e40d7`. Cloud test workers skip source-resource validation during `test-without-building`; the build phase still requires generated web resources. A successful Build action does not generate screenshots. Captioned images remain candidates until reviewed against the submitted Release app.

## macOS: Electron capture and composition

```sh
npm ci
npm run build:desktop
python3 scripts/capture-mac-demo.py /tmp/merkzeug-raw
python3 scripts/frame-store-screenshots.py /tmp/merkzeug-raw /tmp/merkzeug-store --edition macos
```

Alternatively use **Store screenshot candidates** in GitHub Actions (manual dispatch only; pull requests do not start macOS captures). The end-to-end workflow first succeeded in run `34396519467`. It runs on macOS, isolates every scene's profile and vault, captures the real Electron app and saves raw images, composed images and provenance in a 30-day build artifact. It never modifies the installed app. Output dimensions must be an accepted macOS 16:10 screenshot size.

The macOS app is Electron. Its new Xcode packaging target supports Cloud Archive/signing/distribution, but screenshot capture still needs Electron and a usable graphical session. The iOS Cloud screenshot workflow does not capture the Mac app. Keep this independent macOS capture pipeline until actual Cloud capture is validated; compare the visuals with the signed MAS build before upload.

## Release review

- Run writing, diagrams, the Working Copy workflow and frontmatter on iPhone/iPad, plus calendar meeting notes and PDF templates on Mac, in both languages: 28 framed images and their raw originals. The Mac Git fixture uses a real temporary repository and a local-only bare remote. The PDF scene copies the shipped Merkzeug starter template, exports the linked demo notes through the app, and renders the actual cover and first linked document with PDFKit. The unmodified proof PDF is retained beside the image. This is an output preview, not a screenshot of an in-app PDF viewer.
- Confirm expected note, complete diagram, expanded metadata, correct language, no alerts, keyboard, debug overlays or personal data.
- Pin Xcode/runtime, Electron dependency lockfile and runner image for a release. The native status bar clock can vary between captures. System fonts may differ between OS releases; pixel identity across different operating systems is not promised.
- Screenshots are opaque sRGB PNG. Keep the original supported pixel dimensions. Update the dimension allowlist only after checking Apple's current specification.
- Preserve result bundles and manifests alongside the release candidate; do not mix screenshots from different builds.
- Match the app's marketing version to the App Store Connect draft, validate signed archives, distribute a TestFlight candidate and finish sandbox acceptance before requesting App Review.

References: [Xcode Cloud workflow artifacts](https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow), [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).

## Caption-only updates

To update mobile captions without claiming a new native capture, run `python3 scripts/reframe-store-ios.py /path/to/cloud-export /tmp/reframed-ios`. This verifies every original raw image against the Cloud export manifest, recomposes the frames, and records the original manifest hash plus new composition provenance. The same captions are used by future Xcode Cloud screenshot tests.

The Mac calendar scene uses the existing calendar fixture adapter with fictional events and a fixed renderer clock. It creates a real meeting note, verifies attendee metadata, then reopens event selection over the note. No personal calendar is read or modified.
