# Apple release status

The first release is free, without in-app purchases or subscriptions. The owner selected the shared App Support service and `https://merkzeug.creative-it.com/` as the marketing site. English is the focus language, with German localization.

## Current reconciliation — 10 September 2026

- The first release is scoped to the iOS and macOS App Stores. Windows, Linux, IntelliJ and GitHub binary distribution are deferred; GitHub production-signing environment protection is not a blocker for this Apple-only release.
- App Store Connect has processed iOS version 1.0 build 1 (`VALID`). No build was selected for either version 1.0 draft at the last check.
- English/German descriptions, promotional text and shared subtitles were saved and verified. All 28 current screenshots were uploaded and checked, preserving the approved platform-specific ordering.
- The public marketing website has a valid HTTPS certificate and HTTPS enforcement; the support integration and reciprocal app-directory links are live.
- macOS Electron distribution is delivered through `scripts/package-mas.py` and `scripts/upload-mas.py`. It is not an existing Xcode Cloud macOS Archive product. A matching App Store profile was created outside the repository using the existing Apple Distribution certificate; the existing Mac App Store installer identity is available.
- Apple validated the universal macOS 1.0 build 1 package without errors and accepted its upload (delivery `58835907-6439-4233-8067-ec498d79af24`). Processing is pending. Package SHA-256: `c06573660ef814213441d2c4ceed8887da0284463dccadecb2ade1c43c085e05`. Both application architectures and the universal calendar helper passed inspection; deep/strict application and installer signature checks passed. Apple validation exposed a private-mode embedded profile; the signing hook now makes only the embedded copy readable, covered by a regression test.
- Source versions are aligned at 1.0.0. The macOS package uses the equivalent Store version 1.0 with an explicit build number. Distribution processing and final device acceptance remain distinct from successful packaging.

The dated evidence below records the earlier setup; entries explicitly marked pending there are superseded by the current reconciliation where stated.

## Historical verified evidence — 9 September 2026

- Shared edition/store preparation merged through PR 2 at `902089b568aae88be484d11ca01109d9d019b6a5`. PR checks passed.
- Xcode Cloud build 1 succeeded against `ab14f92`, using Xcode 26.6 (17F113) and macOS Tahoe 26.6.2. This was a Build action, not an App Store archive/upload.
- Local iOS signed archive and distribution export succeeded; no successful TestFlight processing has been established.
- The owner verified the signed macOS sandbox build: folder selection, editing/saving, persistent access after relaunch and simple PDF export.
- App Store Connect record `6799114334` now has iOS and macOS drafts. English and German iOS listing text was saved, with sign-in not required and manual release selected.
- macOS descriptions were entered, but final persistence needs rechecking: App Store Connect raised an unsaved-changes dialog during navigation. The owner clarified that the subsequent long wait was due to a pending permission confirmation; it is not a confirmed browser/application defect.
- Shared App Support production commit `cf7f0db755e838f6f234a3c1b8c8ee4460abd622` is deployed (run `34391128618`). Merkzeug routing, email mapping and app-specific English/German form defaults were verified. In-app support integration was merged through PR 16 at `cbe439208db96a85332659eb9726c5a5f258b42c`.
- The English/German website and manuals are deployed through GitHub Pages. The Route 53 CNAME for `merkzeug.creative-it.com` is configured and HTTP works. HTTPS still returned a certificate hostname mismatch on 9 September; this remains a release blocker for the marketing URL.
- Local native screenshot tests passed on iPhone 17 Pro Max and iPad Pro 13-inch (M5), using the installed Xcode beta/iOS 27 simulators. The Electron Mac capture also succeeded. Three scenes in two languages produce 18 captioned candidates plus raw originals. Release simulator compilation passed and the fixture environment hooks were absent from the Release binary.
- Xcode Cloud **Store Screenshots** workflow `57d525fa-be52-44eb-bd6b-116fbd29980a` is configured with pinned Xcode 26.6/macOS 26.6.2 and explicit iPhone/iPad destinations. Build 8 at `c7e40d7` passed the English and German UI tests on both selected devices. Build 7 exposed a pre-test script assumption about generated files on test workers; the script now distinguishes build and test phases, covered by a regression test. The existing successful default build 6 at `cbe4392` was not a screenshot Test or distribution Archive.
- PR 27 contains the automated screenshot pipeline. macOS capture, composition and artifact upload succeeded in GitHub Actions run `34396519467`; an actual Xcode Cloud Electron capture has not been validated. See [the screenshot runbook](automation/README.md).

## Required before submission

1. Configure and validate Xcode Cloud Archive/App Store distribution; the workflow editor returned no Archive schemes before the project changes reached main. Recheck after the successful main integration.
2. Align App Store draft version 1.0 with source version 0.1.0 before choosing a release build; use unused build numbers.
3. Create or obtain a matching macOS App Store distribution profile and validate the signed installer package. Existing keychain certificate names include Apple Distribution and 3rd Party Mac Developer Installer; private-key availability and suitability still need packaging validation.
4. Complete the remaining signed macOS acceptance cases in `docs/development/apple-builds.md`, plus iOS physical-device/file-provider checks. Inspect archive privacy manifests and dependency reports.
5. Complete App Store metadata, English primary language, free pricing, age rating, privacy answers, review contact and screenshots. Do not infer completion from a saved description. The owner's review phone number is pending.
6. Review all localized screenshot candidates against the actual distribution builds, complete the Cloud Test and hosted macOS capture verification, and upload the appropriate image sizes in App Store Connect. iOS simulator status-bar time/date may vary between runs; local beta captures are not a substitute for checking the final release environment.
7. Finish GitHub Pages TLS certificate issuance, enable HTTPS enforcement and verify the public marketing domain. The CNAME and support production rollout are complete.
8. Upload and process distribution builds, validate them, then submit a complete review package. No submission or public app release has taken place.

Credentials, downloaded profiles and signing keys remain outside source control.

## Non-Apple packaging validation

Workflow `34383921899` succeeded at source `0456ee0919c14916bffcebf7606f8e77b2678b6b`: Windows x64, Windows ARM64, Linux x64 and IntelliJ. Four private artifact bundles were uploaded (14-day retention). An IntelliJ ZIP integrity check also passed. These are unsigned validation candidates, not publicly released binaries or native runtime acceptance results. Production Windows signing remains a separate requirement. The runner's unused Chrome apt feed was removed from dependency setup after a reproducible upstream index checksum mismatch; package verification stays enabled.
