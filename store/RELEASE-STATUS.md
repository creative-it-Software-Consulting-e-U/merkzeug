# Apple release status — 9 September 2026

The first release is free, without in-app purchases or subscriptions. The owner selected the shared App Support service and `https://merkzeug.creative-it.com/` as the marketing site. English is the focus language, with German localization.

## Verified

- Shared edition/store preparation merged through PR 2 at `902089b568aae88be484d11ca01109d9d019b6a5`. PR checks passed.
- Xcode Cloud build 1 succeeded against `ab14f92`, using Xcode 26.6 (17F113) and macOS Tahoe 26.6.2. This was a Build action, not an App Store archive/upload.
- Local iOS signed archive and distribution export succeeded; no successful TestFlight processing has been established.
- The owner verified the signed macOS sandbox build: folder selection, editing/saving, persistent access after relaunch and simple PDF export.
- App Store Connect record `6799114334` now has iOS and macOS drafts. English and German iOS listing text was saved, with sign-in not required and manual release selected.
- macOS descriptions were entered, but final persistence needs rechecking: App Store Connect raised an unsaved-changes dialog during navigation and browser automation became unresponsive.
- Shared App Support commit `3621eac` adds Merkzeug; all 30 tests, build and development deployment passed. Production still offered only GeoHook when checked. Staging/production authorization has been requested and remains pending.
- English/German static landing pages, privacy/legal drafts, screenshots and manual GitHub Pages deployment workflow are checked in. Local English landing-page rendering was visually checked. Nothing was deployed publicly.

## Required before submission

1. Configure and validate Xcode Cloud Archive/App Store distribution; the workflow editor returned no Archive schemes before the project changes reached main. Recheck after the successful main integration.
2. Align App Store draft version 1.0 with source version 0.1.0 before choosing a release build; use unused build numbers.
3. Create or obtain a matching macOS App Store distribution profile and validate the signed installer package. Existing keychain certificate names include Apple Distribution and 3rd Party Mac Developer Installer; private-key availability and suitability still need packaging validation.
4. Complete the remaining signed macOS acceptance cases in `docs/development/apple-builds.md`, plus iOS physical-device/file-provider checks. Inspect archive privacy manifests and dependency reports.
5. Complete App Store metadata, English primary language, free pricing, age rating, privacy answers, review contact and screenshots. Do not infer completion from a saved description. The owner's review phone number is pending.
6. Deploy the App Support registry change through staging and production after authorization; verify `?app=merkzeug` selects Merkzeug.
7. Review the website privacy/legal drafts with the publisher, enable GitHub Pages, configure custom-domain DNS/TLS and verify all public URLs. GitHub organization plan is Team; the source repository remains private.
8. Upload and process distribution builds, validate them, then submit a complete review package. No submission or public app release has taken place.

Credentials, downloaded profiles and signing keys remain outside source control.
