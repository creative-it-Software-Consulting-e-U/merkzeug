# Merkzeug website

Public static English/German website for https://merkzeug.creative-it.com/.
GitHub Pages hosts the site, following GeoHook's custom-domain setup. Only this
website directory is uploaded; repository visibility is independent of hosting.

Landing and legal pages are edited directly. `node scripts/build-website.mjs`
generates the four manuals from the help Markdown shipped in the desktop/iOS
apps, plus the sitemap and robots file. Run `python3 scripts/check-website.py`
after changes. Keep English/German legal text and revision dates in sync.

The Pages workflow builds, validates and deploys on relevant main-branch changes,
or manually. It never publishes app binaries. All screenshots use fictional data.
Add store/download links only after those distributions are actually available.

DNS: CNAME `merkzeug.creative-it.com` →
`creative-it-software-consulting-e-u.github.io`. Configure the custom domain in
GitHub Pages before adding DNS, then enable HTTPS after certificate issuance.
Support uses `https://support.apps.creative-it.com/?app=merkzeug&lang=en` (or de).
No third-party fonts, tracking scripts or analytics are loaded.

## Screenshots, roadmap and release notes

Feature sections use the **raw** English/German capture originals, without Store
headline frames. The calendar, PDF, Git and frontmatter images come from
`capture-mac-demo.py` (the reviewed `store-calendar/raw-macos` capture). Copy the
matching raw images into `assets/` when recapturing; never crop the headline out of
a framed Store image. Keep native UI text, fictional data, full-resolution links,
localized alternative text and HTML captions. Images below the hero load lazily.

`roadmap.json` stores short DE/EN labels linked to the GitHub project issues.
Refresh statuses and the review date against the board before publishing roadmap
changes. Group related engineering tasks into user-facing capabilities; do not
turn a backlog item into a dated release promise. VS Code remains a longer-term
platform direction in the platform section, without an invented GitHub ticket.

`release-notes.json` is the localized release history, following GeoHook's
structured release-notes approach. `preparation` entries have no publication date
and are visibly unreleased. Set `released` and the actual date only after public
availability is confirmed. Keep edition-specific limitations in the copy.
`build-website.mjs` renders this data into static pages/sections and includes the
release history in the sitemap. No GitHub API requests run in visitors' browsers.
