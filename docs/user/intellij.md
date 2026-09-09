# IntelliJ IDEA guide

## Requirements and installation

The current preview targets IntelliJ IDEA 2026.2.2, build **262.10315 or later within the 262 branch**, with the JCEF plugin enabled. Other IDE products and build branches have not been verified.

1. Download `merkzeug-VERSION.zip` from a published release.
2. Open **Settings → Plugins → gear menu → Install Plugin from Disk…**.
3. Select the ZIP and restart IntelliJ if requested.
4. Open a local `.md` file and choose the **Merkzeug** editor tab.

The built-in Markdown editor remains available. Update through the same disk-install procedure. To remove Merkzeug, uninstall it in Settings → Plugins and restart when requested. Notes remain ordinary Markdown files.

## Editing

Use the shared visual editor, slash menu, formatting tools, frontmatter panel and Mermaid diagrams. The toolbar provides search and undo/redo. Changes update IntelliJ's document; IntelliJ owns disk saving, Git integration and undo history. **⌘S / Ctrl+S** explicitly saves.

If another editor changes the document, Merkzeug reloads it when there are no local edits. Otherwise a conflict banner lets you reload the other version or deliberately keep your own version.

## PDF export

1. Optionally choose **PDF template …** and select a template folder.
2. Click **Export PDF**.
3. Choose whether to include linked documents when offered.
4. Choose a destination filename and save.

The PDF uses the current IntelliJ document content, including edits already accepted by the IDE. The template selection is remembered per project. See the [PDF guide](pdf.md) for template files, frontmatter and supported document selection.

## Preview limitations

- Dark-theme integration is incomplete, including contrast in the save dialog.
- Files and images outside the current project root are not accessible through the plugin.
- Cross-document links open the target file; cross-document heading navigation is incomplete.
- PDF export temporarily switches away from the editor, then reloads the document.
- Desktop vault settings, calendar commands and bulk PDF export are not part of the plugin.
- This is a local preview distribution; JetBrains Marketplace publication is not configured.

For failures, see [troubleshooting](troubleshooting.md). Contributors can use the [plugin development guide](../../intellij/README.md).

## Contact support

Choose **Help → Merkzeug: Contact Support…**. The browser opens the support form with Merkzeug, the system language (German or English), IntelliJ and the plugin version selected. You can omit the app details before submitting. Note contents and repository paths are not included.
