# Merkzeug Marketplace upload

Updates are uploaded to the existing Marketplace listing (ID 34221), in the `beta` channel. Version 1.2.0 supersedes the approved 1.0.1 beta. No Marketplace submission is performed by the build scripts. Run `python3 scripts/prepare-jetbrains-upload.py` after validation to collect the ZIP, SVG icon, screenshots, copyable text and checksums in `release-artifacts/jetbrains-1.0.0/upload/`.

## Form fields

| Field | Value |
| --- | --- |
| Name | Merkzeug |
| Vendor | creative-it Software Consulting e.U. |
| Contact | guenther.wieser@creative-it.com |
| Website | https://merkzeug.creative-it.com/ |
| Support | https://support.apps.creative-it.com/?app=merkzeug&lang=en |
| Privacy | https://merkzeug.creative-it.com/privacy-en.html |
| License | Custom / proprietary: Merkzeug End User License Agreement, version 1.0 |
| Pricing | Free |
| Suggested channel | beta |
| Suggested tags | Markdown, Editor, PDF (choose the corresponding available tags) |
| Plugin ID | com.creativeit.merkzeug |
| Version | 1.2.0 |
| Supported IDE | IntelliJ IDEA 2026.2.2–2026.2.3, builds 262.10315.125–262.10968.63, with JCEF |
| Source code URL | Leave empty. The source repository is private. |

Paste `EULA.en.md` from the upload kit into the custom-license field. It combines the [shared English EULA](../resources/legal/EULA.en.md) with the [IntelliJ-only supplement](../resources/legal/INTELLIJ-ADDENDUM.en.md). The German file in the kit combines the corresponding German texts. The general website, desktop and mobile license has no IntelliJ-specific references. The published website addresses are https://merkzeug.creative-it.com/license-intellij-en.html and https://merkzeug.creative-it.com/license-intellij-de.html. Both were verified against the source text after deployment on 11 September 2026. For future uploads, verify that the hosted license still matches the packaged EULA.

Review the new license text before public distribution. This is a newly prepared contractual text, not a legal opinion. The common EULA is bundled across editions; Apple-specific custom-EULA requirements must be reviewed before changing the license in App Store Connect. Existing third-party license notices remain mandatory. Previously validly granted MIT rights are not revoked by the new license.

## Files

- Build `python3 intellij/build.py --marketplace` and upload **`intellij/dist/merkzeug-1.2.0.zip`**. Upload the ZIP unchanged, not the inner JAR or the folder of supporting materials.
- Plugin description and release notes are embedded in `plugin.xml`; copyable English/German listing text is in [the Marketplace description](jetbrains-marketplace.md).
- The 40 × 40 SVG logo is embedded as `META-INF/pluginIcon.svg`.
- Screenshots are captured from the real IntelliJ/JCEF editor using a synthetic notebook. No personal documents are used. See `intellij/capture-marketplace.py`.
- The build embeds the proprietary EULA, German translation and third-party notices. Do not upload old MIT-labeled draft builds.
- The Marketplace build omits the unpublished guided tour and video; ordinary development builds retain them.

## Getting started text

Install Merkzeug, open a local `.md` file, and select **Merkzeug** in the editor tabs. The JetBrains Markdown plugin is optional; if installed, its editor remains available alongside Merkzeug.

Use the formatting toolbar to edit your note. Inserted images are stored beside it in a matching `.assets` folder. IntelliJ **Refactor → Move/Rename** keeps the pair together.

Open **Settings → Tools → Merkzeug** to choose a PDF template or discover existing desktop templates. The editor's **…** menu offers PDF styles while editing; **Export PDF** exports the document and optionally linked notes. The same settings include a copyable styling prompt for an agent.

## Review notes for JetBrains

The plugin provides an additional file editor for local `.md` files through `FileEditorProvider`. It depends on the IntelliJ platform and JCEF, not on the Markdown plugin. It uses IntelliJ document saving and undo. Companion-folder refactoring keeps matching sibling `.assets` directories with their notes and rejects conflicting destinations. Local Markdown links across project notes are updated even for notes without a companion directory.

No account, telemetry or advertising service is included. Remote images may contact their source hosts and user-selected external links/support open in the browser. Agent instructions are only written after an explicit user selection and existing-content preview. No agent service is invoked by copying a template prompt.

## Validation

Use JetBrains Plugin Verifier on the exact archive. Native smoke tests run in an isolated profile:

```sh
python3 intellij/smoke.py
MERKZEUG_SMOKE_NO_MARKDOWN=1 python3 intellij/smoke.py
python3 intellij/capture-marketplace.py
```

The current build range is deliberately limited to IntelliJ IDEA 2026.2.2–2026.2.3. Do not broaden it until additional IDE builds have been verified. Native runtime validation on macOS does not establish Windows/Linux acceptance.

[Upload instructions](https://plugins.jetbrains.com/docs/marketplace/uploading-a-new-plugin.html) · [Approval guidelines](https://plugins.jetbrains.com/docs/marketplace/jetbrains-marketplace-approval-guidelines.html) · [Custom EULA requirements](https://plugins.jetbrains.com/docs/marketplace/eula.html)


## English Marketplace gallery

The reviewed gallery is in `release-artifacts/jetbrains-1.0.0/upload/marketplace-gallery/`. Upload its eight numbered PNGs under Media; they replace the earlier two-image selection. Every image is 1920 × 1200 (16:10), with an English caption outside the captured UI. The native IDE uses its built-in default **Islands Dark** theme. The PDF-style preview changes document styling only. The PDF slide uses the actual exported cover and content page. The styling-prompt detail is cropped to omit the local filesystem path.

Capture tooling: `python3 intellij/capture-marketplace.py` starts an isolated IDEA showcase and waits for commands in `intellij/build/marketplace-capture/command.json`. Commands are JSON objects with `action`: `js` (plus `script`), `capture` (plus `name`), `source`, `visual`, `tree`, `rename`, `settings`, `click` (plus `label`), `pdf` (plus the payload produced by the actual export action), or `stop`. Wait for the renderer to settle before capture, then visually inspect every result. This controls only the synthetic showcase project. The native refactoring command operates on its synthetic note and attachment folder. Do not run another capture session while one is active. The process times out after 30 minutes.

`node scripts/compose-jetbrains-gallery.mjs` frames the reviewed raw captures and rendered PDF pages. It uses an isolated headless Chrome instance; `PLAYWRIGHT_CHANNEL` can select another installed browser channel. No UI or exported PDF content is invented or repainted.

The Marketplace description now explains coexistence with the built-in Markdown source editor. Update the listing text independently of the already submitted ZIP; the source descriptor carries the same text for the next plugin release.
