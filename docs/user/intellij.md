# IntelliJ IDEA guide

## Requirements and installation

The current preview targets IntelliJ IDEA 2026.2.2, build **262.10315.125**, with the JCEF plugin enabled. Other IDE products and build branches have not been verified.

1. Obtain the beta `merkzeug-VERSION.zip` from the maintainer or build it using the IntelliJ development guide. A public Marketplace release is not yet available.
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

- Files and images outside the current project root are not accessible through the plugin.
- Cross-document links open the target file; cross-document heading navigation is incomplete.
- PDF export temporarily switches away from the editor, then reloads the document.
- Desktop vault settings, native OS calendars and bulk PDF export are not part of the plugin.
- This is a local preview distribution; JetBrains Marketplace publication is not configured.

For failures, see [troubleshooting](troubleshooting.md). Contributors can use the [plugin development guide](../../intellij/README.md).

## Contact support

Choose **Help → Merkzeug: Contact Support…**. The browser opens the support form with Merkzeug, the system language (German or English), IntelliJ and the plugin version selected. You can omit the app details before submitting. Note contents and repository paths are not included.

## Bundled PDF starter

With no template selected, **PDF template…** starts in the bundled **Merkzeug** template folder. Confirm that folder to enable its cover, typography and page headers/footers. An editable copy is stored in the IDE configuration directory under `merkzeug/pdf-templates/Merkzeug`; existing copies are never overwritten. Copy the folder before customizing it with an agent. See [PDF templates and the suggested agent prompt](pdf.md#pdf-template-starter).

## Appearance, tours and agent guidance

Choose **System**, **Light** or **Dark** for appearance. System follows the operating system (the IDE in IntelliJ); your choice is saved. The **Guided tour** starts only after you accept the first-use invitation and can be reopened at any time.

When opening a vault, Merkzeug can suggest root `AGENTS.md` / `CLAUDE.md` instructions for `Note.md` and `Note.assets/`. Review each proposed addition before choosing **Add**. **Later** postpones it for the current session; **Do not suggest again for this vault** suppresses future prompts for that vault. Contradictory or unclear attachment rules require manual review. Concurrent external changes are preserved and require a refreshed preview. Existing shared `assets/` references remain readable.

## Calendar sources

**New meeting note** offers calendar selection. Expand **Calendar sources** to import an `.ics` file or add a named private HTTPS/Webcal subscription. Subscriptions are saved on this device, never in the vault. **Refresh calendars** downloads changes; an error retains the previous snapshot and shows its saved time. Reimporting the same named ICS file updates its source without duplicating notes. Choose an event to create or reopen its meeting note; existing note text is never replaced. CalDAV and calendar write-back are not supported.

In IntelliJ, System follows IDE colors while the editor remains open. Calendar notes are created in the project root. Use native IDE document tools for saving and undo. The tested build target remains IntelliJ IDEA 2026.2.2; no other IDE version is implied.
