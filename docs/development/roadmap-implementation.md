# Roadmap implementation, September 2026

This branch implements the product features independently of store publication. No store or YouTube publication is authorized. The maintainer explicitly deferred Windows production signing because no certificate is available, excluded the private iPhone 16 Pro from testing, and authorized temporary Linux validation resources in AWS account 348854311973 with mandatory teardown.

| Issue | Implementation / remaining acceptance |
| --- | --- |
| #17 | Existing Apple release pipeline retained. New commits still need selected Xcode Cloud/App Store Connect builds, physical-device acceptance and maintainer release approval. |
| #18 | Shared System/Light/Dark selection, persistent choices, live IDE colors, Mermaid refresh and isolated print appearance. Runtime evidence accompanies this branch; physical iOS/custom IDE theme coverage must be recorded separately. |
| #19 | Plugin builds against pinned IntelliJ IDEA 2026.2.2, build 262.10315.125. No broader IDE support or Marketplace availability is claimed. |
| #20 | Deferred by maintainer: no production certificate. No certificate purchase. |
| #21 | Windows distribution remains gated on #20 and signed downloaded-installer acceptance. |
| #22 | Linux x64 package/native validation uses temporary AWS resources; publication is separate. |
| #23 | Root instruction-file inspection, language-preserving previews, explicit confirmation, contradiction review, per-vault suppression, concurrent-write checks. |
| #24 | Read-only ICS import and HTTPS/Webcal subscriptions in desktop, iOS and IntelliJ; native desktop calendars retained. No CalDAV/OAuth or calendar write-back. |
| #25 | Native Working Copy association, device-only keychain key, explicit actions, write flushing and nonce-validated callbacks. Physical iPhone/iPad, real callbacks, conflicts and File Provider acceptance remain required. |
| #26 | See [iOS Git client evaluation](ios-git-clients.md). No second client is accepted for integration. |
| #30 | Already completed upstream in PR #43. |
| #35 | Optional vault-specific PDF content formatting in desktop editor; application shell and print export remain independent. |
| #36 | Native iOS EventKit access requested on demand; permission denial, bounded range and meeting-note creation. Simulator build is not physical-device acceptance. |
| #48 | First-use guided tour, explicit start/skip and repeat entry in all editions. |
| #49 | German desktop screencast recorded and bundled for local viewing in every edition. YouTube upload and public embedding await maintainer publication. |

## Shared image convention

All active image writers use `Note.md` with the adjacent directory `Note.assets/`. Desktop and iOS rename/move operations check both destination names and move the companion directory. Existing shared `assets/` links are still read; shared folders are not inferred to belong to one note. IntelliJ uses its native document/refactoring tools: when manually moving a note outside Merkzeug, preserve the companion folder and references as described by the guidance.

## Agent guidance detection

Detection is local and conservative, not an LLM call. A paragraph must mention `.assets`, Markdown/notes, both moving and renaming, and joint ownership to count as an equivalent rule. Attachment-related text without sufficient evidence is shown for review; nearby negated move/rename rules block addition. Only root `AGENTS.md` and `CLAUDE.md` are inspected. No deletion rule is inferred. Existing instructions are never replaced. Append operations recheck the preview's original content; native iOS checks inside file coordination and IntelliJ checks its current Document. Unrecognized equivalent wording may still require manual review.

## Calendar behavior and limits

Parsing uses unmodified MPL-2.0 `ical.js` with bundled third-party notices. Calendar components supply VTIMEZONE definitions; absent IANA zones use the runtime's timezone database. Recurrences, EXDATE, moved/cancelled exceptions and all-day dates are normalized into the shared model. Input is bounded to 2 MB, queries to 183 days and expansion to 50,000 occurrences. Exceeding a limit produces an error rather than silently returning incomplete results. Floating dates follow the device timezone.

Subscriptions refresh explicitly, retain the previous snapshot on failure and expose the saved timestamp. Re-importing the same subscription is rejected. Stable occurrence identifiers produce stable meeting-note filenames; existing notes are reopened rather than overwritten. Reimporting a file with the same name updates its source while preserving event identity. Subscription URLs are protected by Electron safeStorage, iOS device-only Keychain or IntelliJ PasswordSafe. Linux needs a secure keyring for subscriptions; file-only imports remain available without one. Feed authentication is by private subscription URL; separate credential forms and OAuth are outside this delivery.

## Working Copy protocol

The [official URL-scheme documentation](https://workingcopyapp.com/url-schemes.html) defines the repository selector, callback key, explicit pull/commit/push commands and the unlock requirement for push. Commit opens Working Copy's own review/message dialog for the entire associated repository. Credentials and conflict resolution remain there. Merely launching Working Copy is never success. On a missing callback or app restart, the user must inspect the result before acknowledging it and starting another action. Callback state is checked against a random per-operation nonce; configuration keys stay in the device-only Keychain.

No private physical device was used. An unavailable Working Copy app is an explicit UI state. Simulator checks cannot verify real cross-app actions, File Provider propagation or licensed functionality.

## Native calendar API

iOS 17+ uses `requestFullAccessToEvents`; earlier supported iOS versions use `requestAccess(to: .event)`. The corresponding usage-description keys are included. Calendar data is only read by the feature; the selected event becomes a Markdown note in the user's vault. See [Apple's EventKit access documentation](https://developer.apple.com/documentation/eventkit/accessing-calendar-using-eventkit-and-eventkitui).

## Validation recorded for the implementation

Implementation commit: `0336daf5ddc633abc9fcf0f387f9fd0fdf2bcd40`. Later documentation corrections do not change executable behavior. The synthetic test data contains no personal notes or calendar events.

- `npm test`: 35 tests passed; `npm run test:release`: 19 tests passed. All four TypeScript targets, version consistency, local documentation links and repository/current-source secret scans passed.
- `node scripts/roadmap-acceptance.mjs`: actual Electron renderer passed tour navigation, confirmed root guidance creation, cross-window theme changes including Mermaid, opt-in template styling, and ICS reimport preserving the existing meeting note. The native calendar uses an empty synthetic fixture in this test.
- iOS: `Merkzeug-Screenshots/testRoadmap` passed on a separately created iPhone 17 Pro simulator with iOS 27.0. This exercises the actual Capacitor/EventKit permission and empty-event query. Use an ad-hoc signed simulator build (`CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES`); disabling signing prevents Keychain access. Reset only the dedicated simulator's Calendar permission before testing the first permission prompt. The private iPhone 16 Pro was not used.
- IntelliJ: native document write, stale-write rejection, undo, redo, save and PDF smoke tests passed against IDEA 262.10315.125. The verifier reports compatibility, with two deprecated `ensureFilesWritable` usages and one pre-existing internal `PluginManagerCore.getPlugin` usage. The declared compatibility range is deliberately limited to that exact build.
- Windows 11 ARM64 (`10.0.26200`), installed unsigned NSIS package: English and German acceptance passed for launch/notices, editing, save/reopen, undo/redo, read-only error/retry, external conflict handling, local images and PDF template/TOC/linked-document/diagram/table/image export. The dedicated test installation was then uninstalled. This is not signed-distribution or native Windows x64 acceptance.
- Linux Ubuntu 24.04 x64 in temporary AWS EC2: AppImage, DEB and RPM packages built from the implementation commit. Installed DEB acceptance passed in English and German for the same functional checks as Windows. Normal DEB and AppImage processes remained running until the explicit 15-second test timeout, without Playwright or `--no-sandbox`, under SSM/D-Bus/Xvfb. The DEB was uninstalled. These checks do not cover a native RPM distribution, Wayland or every desktop environment.
- Visual PDF spot checks: the Windows, Linux and IntelliJ content pages retained readable light print colors, diagrams and tables. This is not an exhaustive arbitrary-template layout certification.

Playwright Electron functional tests use its default disabled Chromium sandbox. Normal Linux launches are checked separately; functional results alone do not certify sandbox behavior. Linux package build prerequisites include `binutils` (`ar`), `rpm` and `fakeroot` in addition to the desktop runtime libraries.

Raw logs, native acceptance JSON, screenshots, PDFs, local installers, the iOS result attachments and verifier reports are retained in ignored `release-artifacts/roadmap/`. No artifacts were published. The draft PR is [#50](https://github.com/creative-it-Software-Consulting-e-U/merkzeug/pull/50).

Remaining acceptance includes real subscribed-feed refresh/offline tests on each platform, iOS/iPad File Provider and Working Copy callbacks/conflicts, representative custom IDE theme review, Windows signing/x64/SmartScreen and public distribution, native RPM-distribution checks, Apple release selection/approval and YouTube publication. Feature issues remain in Review/Test rather than being auto-closed.

## Temporary environment teardown

AWS teardown was verified on 10 September 2026 at 19:59 UTC: the EC2 instance was terminated, its temporary EBS volume deleted, and the dedicated IAM role/policies/instance profile, security group, SSH key pair, S3 objects and bucket removed. The dedicated Windows installation/workspace and the separately created iOS simulator were also removed. No private physical device was used.

The committed [validation summary](roadmap-validation.json) records implementation commit, platform checks, artifact SHA-256 values and teardown results. Binaries and full raw output remain local under `release-artifacts/roadmap/`; the later help-text corrections should be included when generating release packages.
