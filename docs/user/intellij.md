# IntelliJ IDEA guide

## Requirements and installation

The current preview targets IntelliJ IDEA 2026.2.2, build **262.10315.125**, with the JCEF plugin enabled. Other IDE products and build branches have not been verified.

1. Obtain the beta `merkzeug-VERSION.zip` from the maintainer or build it using the IntelliJ development guide. A public Marketplace release is not yet available.
2. Open **Settings → Plugins → gear menu → Install Plugin from Disk…**.
3. Select the ZIP and restart IntelliJ if requested.
4. Open a local `.md` file and choose the **Merkzeug** editor tab.

The built-in Markdown editor remains available. Update through the same disk-install procedure. To remove Merkzeug, uninstall it in Settings → Plugins and restart when requested. Notes remain ordinary Markdown files.

## Editing

Use the shared visual editor, slash menu, formatting tools, frontmatter panel and Mermaid diagrams. The compact toolbar provides paragraph styles, bold, italic, strikethrough, inline code, lists, quotes, code blocks, links, images, tables and dividers. Search (⌘F / Ctrl+F), undo and redo remain available through keyboard shortcuts without duplicate toolbar buttons. Changes update IntelliJ's document; IntelliJ owns disk saving, Git integration and undo history. **⌘S / Ctrl+S** explicitly saves.

If another editor changes the document, Merkzeug reloads it when there are no local edits. Otherwise a conflict banner lets you reload the other version or deliberately keep your own version.

## PDF export

1. Optionally open **Settings → Tools → Merkzeug** and select a PDF template folder for this project. Leave it empty to export without a template.
2. Click **Export PDF**.
3. If linked documents are found, the IntelliJ dialog lists them. Choose **Only this document** or **Include linked documents**. **Cancel** (or closing the dialog) stops the export.
4. Choose a destination filename and save.

The PDF uses the current IntelliJ document content, including edits already accepted by the IDE. The template selection is remembered per project. See the [PDF guide](pdf.md) for template files, frontmatter and supported document selection.

## Preview limitations

- Files and images outside the current project root are not accessible through the plugin.
- Cross-document links open the target file; cross-document heading navigation is incomplete.
- PDF export temporarily switches away from the editor, then reloads the document.
- Desktop vault settings, native OS calendars and bulk PDF export are not part of the plugin.
- This is a local preview distribution; JetBrains Marketplace publication is not configured.

For failures, see [troubleshooting](troubleshooting.md). Contributors can use the [plugin development guide](../../intellij/README.md).

## Contact support

Choose **Help → Merkzeug: Contact Support…**. The browser opens the support form with Merkzeug, the system language (German or English), IntelliJ and the plugin version selected. You can omit the app details before submitting. Note contents and repository paths are not included.

## Bundled PDF starter

In **Settings → Tools → Merkzeug**, choose **Use bundled PDF template** and apply the settings to enable its cover, typography and page headers/footers. An editable copy is stored in the IDE configuration directory under `merkzeug/pdf-templates/Merkzeug`; existing copies are never overwritten. Copy the folder before customizing it with an agent. See [PDF templates and the suggested agent prompt](pdf.md#pdf-template-starter).

## Appearance, tours and agent guidance

The editor automatically follows IntelliJ’s active theme, including live changes. There is no separate appearance selector. The **⋯** menu contains the guided tour, the prepared desktop tour video, attachment guidance and a shortcut to the PDF settings. These controls stay hidden during normal editing.

In the **⋯** menu, Merkzeug can suggest root `AGENTS.md` / `CLAUDE.md` instructions for `Note.md` and `Note.assets/`. Review the single proposed text and the full contents of both instruction files. Select the destination files explicitly before choosing **Add**; none is preselected. For example, leave `CLAUDE.md` unchanged when it only redirects to `AGENTS.md`. Missing files are created only when selected. **Later** postpones it for the current session; **Do not suggest again for this vault** suppresses future prompts for that vault. Contradictory or unclear attachment rules require manual review. Concurrent external changes are preserved and require a refreshed preview. Existing shared `assets/` references remain readable.

Calendar and meeting-note creation are available in the standalone apps. Create new files using IntelliJ’s project tools.

After installing a plugin update while IntelliJ is running, restart the IDE to load it. Synchronization status remains available to assistive technology and as a tooltip in the toolbar.

## Preview PDF styles while editing

Enable **Use PDF template while editing** in the **⋯** menu. The choice is remembered per project. Content styles from the project's PDF template apply to the editor; toolbar, dialogs and IDE controls keep the IntelliJ theme. Disable the option to restore the normal editor appearance. This previews content typography and colors, not PDF pagination, cover pages or headers and footers. The preview refreshes after changing PDF settings and when the editor window regains focus.

IntelliJ can use the same template folder as the desktop app: select the actual template subfolder (containing `stil.css`, `vorlage.json`, etc.) under **Settings → Tools → Merkzeug**. Both editions read those files directly, so no import or duplicate copy is necessary. A custom or synchronized desktop template location works as well. The **Desktop templates** dropdown discovers the desktop app’s standard locations on macOS, Windows and Linux, including its custom `templatesRoot` setting and an inherited `MERKZEUG_TEMPLATES_ROOT` environment variable. Select an entry and apply the project settings. **Refresh** rescans after changes in the desktop app. Discovery does not change the current selection or copy files. If nothing is found or a location cannot be read, the manual folder chooser remains available.
