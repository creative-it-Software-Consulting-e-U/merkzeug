# Reusable website and store demo vaults

`en/` and `de/` are the persistent localized source vaults for product screenshots.
All names, notes and projects are synthetic. Keep these fixtures in Git so later
captures can reproduce the same content; never substitute a personal vault.

The website uses real macOS and iOS app captures with these fixtures. Existing
captures were reused for the September 2026 landing-page redesign; no new app
screenshots were fabricated. See `website/assets/screenshots.json` for the current
image pairs. `store/screenshots/manifest.json` records original capture provenance.

To refresh macOS scenes, use `scripts/capture-mac-demo.py` after building the desktop
app (see its CLI help). To refresh iOS, use `scripts/capture-ios-demo.py` with a
Debug app and a dedicated simulator, never the owner's personal phone. Capture
both locales and review full images before replacing website assets. Include the
same scene on both platforms where it exists. PDF spreads show actual exported
output, not an iOS screen; they are deliberately device-independent.
