# IntelliJ IDEA guide

## Requirements and installation

Version 1.2 targets IntelliJ IDEA 2026.2.2 and later 2026.2.x releases, builds **262.10315.125–262.***, with the JCEF plugin enabled. Compatibility was verified against 2026.2.2 and 2026.2.3; 2026.3 EAP is not included. Other IDE products and build branches have not been verified.

Version **1.2.0** is approved in the default **Stable** channel. Open **Settings → Plugins → Marketplace**, search for **Merkzeug**, and install it without adding a custom repository. The [Marketplace listing (ID 34221)](https://plugins.jetbrains.com/plugin/34221-merkzeug) also retains the beta channel; earlier beta releases remain available.

To install the beta and receive its updates:

1. Open **Settings → Plugins → gear menu → Manage Plugin Repositories…**.
2. Add `https://plugins.jetbrains.com/plugins/beta/34221`.
3. Search for **Merkzeug** in the Marketplace tab, install the compatible version and restart if requested.
4. Open a local `.md` file and select the **Merkzeug** editor tab.

A beta channel is a separate repository; searching the default Marketplace alone may not show its releases. See [JetBrains’ channel documentation](https://plugins.jetbrains.com/docs/marketplace/custom-release-channels.html).

For a beta ZIP supplied by the maintainer:

1. Obtain `merkzeug-VERSION.zip` from the maintainer.
2. Open **Settings → Plugins → gear menu → Install Plugin from Disk…**.
3. Select the ZIP and restart IntelliJ if requested.
4. Open a local `.md` file and choose the **Merkzeug** editor tab.

The built-in Markdown editor remains available. Marketplace installations receive updates through IntelliJ’s plugin manager; update a beta ZIP through the same disk-install procedure. To remove Merkzeug, uninstall it in Settings → Plugins and restart when requested. Notes remain ordinary Markdown files.

## Editing

Use the shared visual editor, slash menu, formatting tools, frontmatter panel and Mermaid diagrams. The compact toolbar provides paragraph styles, bold, italic, strikethrough, inline code, lists, quotes, code blocks, links, images, tables and dividers. Search (⌘F / Ctrl+F), undo and redo remain available through keyboard shortcuts without duplicate toolbar buttons. Changes update IntelliJ's document; IntelliJ owns disk saving, Git integration and undo history. **⌘S / Ctrl+S** explicitly saves.

Selecting a whole table cell highlights the cell; click inside its text to place the caret and edit. Text and links retain their colors while the cell is selected, including when using PDF-template styles.

If another editor changes the document, Merkzeug reloads it when there are no local edits. Otherwise a conflict banner lets you reload the other version or deliberately keep your own version.

## Reading and navigation modes (planned)

The current plugin follows the file's write permissions; a manual Read/Edit switch is not available yet. The following describes the planned behavior.

Each Merkzeug editor stays associated with its IntelliJ file. Following an internal link will ask IntelliJ to open the destination in its own editor tab or activate its already open tab; it will not replace the source editor's document.

- The Read/Edit switch will apply to the current tab. A write-protected file will remain read-only.
- In Read mode, a normal click will follow a link.
- In Edit mode, link text will be editable; ⌘-click on macOS or Ctrl-click on Windows/Linux will follow the link.
- Heading links will jump to the corresponding heading in the destination document. Cross-document heading navigation is currently incomplete.
- Navigation jumps will integrate with IntelliJ's **Navigate → Back/Forward** history so you can return to the source location.


## Images and companion folders

Images inserted through the image picker or pasted into `Plan.md` are written as separate image files in a sibling folder named `Plan.assets/`. Markdown uses relative references such as `![Diagram](Plan.assets/image-….png)`. The same `Note.md` / `Note.assets/` layout is used by the desktop and iOS editions. Include both the note and its companion folder when committing to Git or sharing the note.

Existing shared `assets/` links remain supported. Merkzeug does not migrate those images into a companion folder or infer that the shared folder belongs to one note.

### IntelliJ gets the pairing rule too

Use IntelliJ **Refactor → Rename** or **Refactor → Move** on a Markdown file. If `Plan.md` has a sibling `Plan.assets/` folder, Merkzeug includes that folder in the same refactoring: renaming to `Draft.md` also renames the folder to `Draft.assets/` and updates companion-folder references in the note. Moving a note keeps its companion folder beside it. The native Move dialog shows both entries; selecting both yourself does not duplicate the operation. Undo/Redo applies to the pair.

Existing destination files or folders stop the action; folders are never merged. Shared `assets/` folders stay in place. Markdown notes without a companion folder also receive link updates. Symbolic-link companions require manual handling. This integration applies to IntelliJ refactoring actions, not external filesystem operations, copy or delete actions. Open Merkzeug editors refresh their paths after a rename or move.

## PDF export

1. Optionally open **Settings → Tools → Merkzeug** and select a PDF template folder for this project. Leave it empty to export without a template.
2. Click **Export PDF**.
3. If linked documents are found, the IntelliJ dialog lists them. Choose **Only this document** or **Include linked documents**. **Cancel** (or closing the dialog) stops the export.
4. Choose a destination filename and save.

The PDF uses the current IntelliJ document content, including edits already accepted by the IDE. The template selection is remembered per project. See the [PDF guide](pdf.md) for template files, frontmatter and supported document selection.

## Scope and limitations

- Files and images outside the current project root are not accessible through the plugin.
- Cross-document links open the target file; cross-document heading navigation is incomplete.
- PDF export temporarily switches away from the editor, then reloads the document.
- Desktop vault settings, native OS calendars and bulk PDF export are not part of the plugin.

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

Enable **Use PDF template while editing** in the **⋯** menu. The choice is remembered per project. Content styles from the project's PDF template apply to the editor; the frontmatter area shares its light paper surface; toolbar, dialogs and IDE controls keep the IntelliJ theme. Disable the option to restore the normal editor appearance. This previews content typography and colors, not PDF pagination, cover pages or headers and footers. The preview refreshes after changing PDF settings and when the editor window regains focus.

IntelliJ can use the same template folder as the desktop app: select the actual template subfolder (containing `stil.css`, `vorlage.json`, etc.) under **Settings → Tools → Merkzeug**. Both editions read those files directly, so no import or duplicate copy is necessary. A custom or synchronized desktop template location works as well. The **Desktop templates** dropdown discovers the desktop app’s standard locations on macOS, Windows and Linux, including its custom `templatesRoot` setting and an inherited `MERKZEUG_TEMPLATES_ROOT` environment variable. Select an entry and apply the project settings. **Refresh** rescans after changes in the desktop app. Discovery does not change the current selection or copy files. If nothing is found or a location cannot be read, the manual folder chooser remains available.

Mermaid diagrams use the document background instead of a dark code-block panel and switch to the light PDF theme when PDF template editing styles are active, and return to the application theme when the preview is disabled.

### Template styling prompt

Desktop Settings provides **Template styling prompt** for each template; expand it to review and copy a complete agent brief with the template's folder path. IntelliJ offers the same action in **Settings → Tools → Merkzeug**, using the folder currently shown in the settings field. On iOS, open **Help → Template styling prompt** and substitute the folder path on the agent's computer. iOS supports template styling while editing and AirPrint; standalone PDF export remains a desktop/plugin feature.

Replace the new template name and your colors, fonts, logo and design wishes before sending it. The prompt is in English, includes the complete offline technical reference, and works with older templates that lack instruction files. Copying it does not read note contents or modify existing templates. If clipboard access is unavailable in the web view, select and copy the displayed text manually.

New starter copies include `AGENTS.md` (format, CSS examples, placeholders, preview limitations and validation) and `STYLING-PROMPT.md` (reusable brief). Keep template-specific design choices in `README.md`. The brief instructs the agent to create a separate copy and preserve existing instructions. Existing desktop templates are not upgraded or overwritten. For manual use, concatenate STYLING-PROMPT.md and AGENTS.md and replace the template-path placeholder.


## License and Marketplace edition

Merkzeug is licensed under the [MIT License](../../resources/legal/EULA.en.md), also supplied in German. The plugin archive includes this license and third-party notices. The Marketplace build omits the unpublished guided tour and video. It is currently limited to IntelliJ IDEA builds 262.10315.125–262.10968.63; the Markdown plugin is optional. Move uses a theme-aware destination dialog built with public IntelliJ APIs; the native refactoring transaction still includes both the note and its attachments.


## Alongside other Markdown editors

Merkzeug adds its own editor tab for local `.md` files. Keep the built-in Markdown editor installed and use the tabs at the bottom to switch between source/split view and Merkzeug. Both use the same IntelliJ document. Merkzeug neither replaces nor requires the Markdown plugin. Compatibility with other Markdown plugins depends on their editor registration; universal compatibility is not claimed.

## Printing

With the Merkzeug editor active, **File → Print** uses Merkzeug's PDF rendering. The toolbar also offers **Print…**. A PDF preview opens with a **Print…** button for the native print dialog. Templates, headers/footers, diagrams, images and optional linked documents use the same rendering as PDF export. No save destination is required. Close the preview to remove the temporary PDF. Printing in another Markdown editor tab continues to use that editor's handler.

## Links across Markdown files

Native **Refactor → Rename/Move** also updates incoming Markdown links in project content, including notes without an `.assets/` folder. Move recalculates outgoing relative links and links to companion images. The Markdown editor plugin is optional: Merkzeug parses Markdown destinations itself and combines these changes with native refactoring, including open unsaved documents and Undo/Redo.

Inline links, images and reference-style definitions are supported. URL encoding, link labels, titles and `#section` suffixes are preserved; heading-anchor renames are a separate operation. Code examples, frontmatter, external URLs and ordinary prose are left alone. HTML links and wiki links are not included. Only indexed project content is scanned, not excluded folders, symlinks or external files. Native language-specific directory/package refactorings remain owned by their language plugin. Refactoring a directory through the generic file operation updates Markdown paths too. Filesystem changes outside IntelliJ do not trigger this operation.


## Sharing templates in a repository

A template is an ordinary folder containing `vorlage.json`, `stil.css`, and its HTML fragments and assets. You can keep that folder in a Git repository so your team can review changes and use the same layout. Commit the complete folder, including logos and fonts that you are allowed to share.

In the PDF controls, choose **Template inside this vault** and enter the template's relative folder. The assignment in `.merkzeug/settings.json` works across desktop, iPhone/iPad and IntelliJ. Commit and pull that file together with the template folder using your normal Git workflow.

Alternatively, store central templates in **iCloud Drive → Merkzeug → Templates** and choose **Central template**. iCloud sharing between your own Apple devices requires the same account and completed synchronization.

PDF-file export and combining directly linked documents are available on desktop, iPhone/iPad, and in IntelliJ. The selected template also applies when printing.

## Choose a template location

In the PDF controls above an open note (IntelliJ: **…**), choose **PDF template for this vault**. Select **Central template**, choose a name and press **Apply**, or select **Template inside this vault**, enter its relative folder (for example `.merkzeug/templates/Company`) and press **Apply**. The choice applies to every note in this vault, including editing styles, PDF export and printing. It does not move or copy template files. Choose **No template** and **Apply** to clear the assignment.

The portable assignment is stored in `.merkzeug/settings.json`. A central template is referenced by name; a vault template uses `{"pdfTemplate":{"source":"vault","path":".merkzeug/templates/Company"}}`. Commit the settings and template folder to share them with a repository. Existing central assignments remain compatible. On Apple devices, the central collection uses Merkzeug's iCloud container when available; a locally selected template collection remains a device setting. IntelliJ also discovers installed desktop templates. Missing template folders are reported instead of silently substituting another template.

## Release Notes

Open **Release Notes** in Help (IntelliJ: **…**) for the complete English or German version history, available offline. On the first start of a new marketing version, its release notes open automatically. **Done** marks that version as read on this installation; the full history remains accessible. Website and apps use the same release-note source.
