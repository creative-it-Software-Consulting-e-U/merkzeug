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
