# Merkzeug website

Public static English/German website for https://merkzeug.creative-it.com/.
GitHub Pages hosts the site, following GeoHook's custom-domain setup. Only this
website directory is uploaded; repository visibility is independent of hosting.

Landing and legal pages are edited directly. `node scripts/build-website.mjs`
generates six manuals from the help Markdown shipped in the desktop/iOS
apps and `docs/user/intellij.md` / `docs/user/intellij.de.md`, plus the sitemap and robots file. Run `python3 scripts/check-website.py`
after changes. Keep English/German legal text and revision dates in sync.

The Pages workflow builds, validates and deploys on relevant main-branch changes,
or manually. It never publishes app binaries. All screenshots use fictional data.
Store links can accompany an approved release awaiting activation, provided the pending availability is explicit. Do not claim public availability until confirmed.

DNS: CNAME `merkzeug.creative-it.com` →
`creative-it-software-consulting-e-u.github.io`. Configure the custom domain in
GitHub Pages before adding DNS, then enable HTTPS after certificate issuance.
Support uses `https://support.apps.creative-it.com/?app=merkzeug&lang=en` (or de).
No third-party fonts or analytics are configured. The landing page embeds the official JetBrains install widget (see below).

## Screenshots and release notes

Feature sections use the **raw** English/German capture originals, without Store
headline frames. The calendar, PDF, Git and frontmatter images come from
`capture-mac-demo.py` (the reviewed `store-calendar/raw-macos` capture). Copy the
matching raw images into `assets/` when recapturing; never crop the headline out of
a framed Store image. Keep native UI text, fictional data, full-resolution links,
localized alternative text and HTML captions. Images below the hero load lazily.

`release-notes.json` is the localized release history, following GeoHook's
structured release-notes approach. Apps import this JSON directly and bundle the complete bilingual history for offline use. Every marketing version needs a matching entry before building; the first launch shows that entry, and Help opens all entries. `approved` entries identify Apple-approved versions awaiting manual Store activation, with no invented publication date. `preparation` entries have no publication date
and are visibly unreleased. Set `released` and the actual date only after public
availability is confirmed. Keep edition-specific limitations in the copy.
`build-website.mjs` renders this data into static pages/sections and includes the
release history in the sitemap. No GitHub API requests run in visitors' browsers.

Official localized App Store badge SVGs are sourced unchanged from Apple’s `tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us` and `/de-de` endpoints. Preserve their artwork and aspect ratio. The IntelliJ link targets plugin 34221, channel `beta`.

## Responsive landing galleries

`landing.css` and `landing.js` apply only to the landing pages. Each app screenshot
has a localized macOS/iOS pair, listed in `assets/screenshots.json`; reusable vaults
live in `store/demo/en` and `store/demo/de`. Below 701 CSS pixels, galleries default
to iOS; otherwise macOS. Each gallery has its own keyboard-accessible switch, and
an explicit choice survives viewport changes until page reload. With JavaScript
disabled, `<picture>` still chooses a responsive image. PDF output is shown as a
device-independent document sample, rather than pretending to be an iOS capture.

The hero loads the official JetBrains Marketplace install widget for plugin 34221.
It contacts plugins.jetbrains.com; the beta-channel fallback is visible until the iframe reports its plugin data.
The widget then replaces the fallback, so only one control is visible. If loading
fails or scripts are blocked, the fallback remains usable. Other page scripts, styles and images are local.

Marketing labels use **Mac**, **iPhone** and **iPad**; operating-system names remain
in technical help and release history. The Mermaid gallery additionally offers
reviewed iPad captures in both languages. Other galleries show only devices for
which matching captures exist. The viewport default remains iPhone on narrow
screens and Mac on wider screens; iPad is an explicit gallery choice.
