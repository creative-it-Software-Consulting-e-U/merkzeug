# Apple release status — 9 September 2026

The first release is free, without in-app purchases or subscriptions. The owner selected the shared App Support service and `https://merkzeug.creative-it.com/` as the marketing site. English is the focus language, with German localization.

## Verified

- Shared edition/store preparation merged through PR 2 at `902089b568aae88be484d11ca01109d9d019b6a5`. PR checks passed.
- Xcode Cloud build 1 succeeded against `ab14f92`, using Xcode 26.6 (17F113) and macOS Tahoe 26.6.2. This was a Build action, not an App Store archive/upload.
- Local iOS signed archive and distribution export succeeded; no successful TestFlight processing has been established.
- The owner verified the signed macOS sandbox build: folder selection, editing/saving, persistent access after relaunch and simple PDF export.
- App Store Connect record `6799114334` now has iOS and macOS drafts. English and German iOS listing text was saved, with sign-in not required and manual release selected.
- macOS descriptions were entered, but final persistence needs rechecking: App Store Connect raised an unsaved-changes dialog during navigation. The owner clarified that the subsequent long wait was due to a pending permission confirmation; it is not a confirmed browser/application defect.
- Shared App Support commit `28baf01` includes Merkzeug registration, inbound email routing, per-app contact email and preserved GeoHook defaults. All 31 service tests, browser contact/password-manager checks, builds and development/staging deployments passed. Staging run `34384346217` succeeded. Production still offered only GeoHook when checked. Automatic approval review rejected pushing this final support commit to production; explicit authorization for that exact rollout has been requested and remains pending.
- The complete English/German website and public desktop/iOS manuals were merged via PR 13. GitHub Pages deployment `34383388215` succeeded. Ten pages passed link/anchor/image checks; English desktop and German mobile layouts and mobile manuals were checked. The custom domain is configured and verified on GitHub, but DNS/TLS is not complete because AWS SSO renewal is pending. The source repository remains private. Website updates now deploy automatically on relevant main changes.

## Required before submission

1. Configure and validate Xcode Cloud Archive/App Store distribution; the workflow editor returned no Archive schemes before the project changes reached main. Recheck after the successful main integration.
2. Align App Store draft version 1.0 with source version 0.1.0 before choosing a release build; use unused build numbers.
3. Create or obtain a matching macOS App Store distribution profile and validate the signed installer package. Existing keychain certificate names include Apple Distribution and 3rd Party Mac Developer Installer; private-key availability and suitability still need packaging validation.
4. Complete the remaining signed macOS acceptance cases in `docs/development/apple-builds.md`, plus iOS physical-device/file-provider checks. Inspect archive privacy manifests and dependency reports.
5. Complete App Store metadata, English primary language, free pricing, age rating, privacy answers, review contact and screenshots. Do not infer completion from a saved description. The owner's review phone number is pending.
6. After the requested explicit production authorization, deploy Support commit `28baf01` to main and verify `?app=merkzeug` and its mail address on production. Development and staging validation are complete.
7. Renew AWS SSO, configure the custom-domain CNAME to `creative-it-software-consulting-e-u.github.io`, enable HTTPS after certificate issuance and verify the public domain. GitHub Pages deployment and domain configuration are complete. Publisher register/VAT details were checked against the existing company legal page; no tracking or third-party fonts are loaded.
8. Upload and process distribution builds, validate them, then submit a complete review package. No submission or public app release has taken place.

Credentials, downloaded profiles and signing keys remain outside source control.

## Non-Apple packaging validation

Workflow `34383921899` succeeded at source `0456ee0919c14916bffcebf7606f8e77b2678b6b`: Windows x64, Windows ARM64, Linux x64 and IntelliJ. Four private artifact bundles were uploaded (14-day retention). An IntelliJ ZIP integrity check also passed. These are unsigned validation candidates, not publicly released binaries or native runtime acceptance results. Production Windows signing remains a separate requirement. The runner's unused Chrome apt feed was removed from dependency setup after a reproducible upstream index checksum mismatch; package verification stays enabled.
