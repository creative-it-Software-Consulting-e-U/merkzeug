# Visual Studio Code guide

The VS Code extension provides the same features as the [IntelliJ plugin](intellij.md). It uses VS Code's own mechanisms for settings, commands, saving, undo history and file refactoring.

## Requirements and installation

The extension requires Visual Studio Code 1.100 or later and works with local folders, including VS Code Remote workspaces where the extension runs on the remote machine. Virtual workspaces (for example browser-only repositories) are not supported. The extension was verified with VS Code 1.139 on macOS.

PDF export and printing use an installed Chromium-based browser: Google Chrome, Microsoft Edge, Chromium or Brave. Merkzeug finds standard installations automatically; otherwise set **Merkzeug › Pdf: Browser Path** in the settings.

To install a VSIX supplied by the maintainer:

1. Obtain `merkzeug-VERSION.vsix`.
2. Open the Extensions view, choose **… → Install from VSIX…** and select the file.
3. Open a local `.md` file and choose **Open in Merkzeug** in the editor title bar.

The extension is not yet published in the Visual Studio Marketplace. To remove Merkzeug, uninstall it in the Extensions view. Notes remain ordinary Markdown files.

## Opening notes

Merkzeug is an additional editor for `.md` files; VS Code's text editor stays the default. Open a note in Merkzeug with:

- **Open in Merkzeug** in the editor title bar of a Markdown file or in the Explorer context menu,
- **Open With… → Merkzeug**, or
- the command palette: **Merkzeug: Open in Merkzeug**.

**Show Markdown Source** in the title bar returns to the text editor. To always open Markdown files in Merkzeug, use **Open With… → Configure default editor for '*.md'…**.

## Editing

Use the shared visual editor, slash menu, formatting tools, frontmatter panel, Mermaid diagrams and Obsidian-compatible callouts (`> [!type] Title`, including GitHub alerts such as `> [!NOTE]`). The compact toolbar provides paragraph styles, bold, italic, strikethrough, inline code, lists, quotes, code blocks, links, images, tables, callouts (GitHub types first, the other Obsidian types under **More (Obsidian only)**; in a callout it changes the type) and dividers. Search (⌘F / Ctrl+F), undo and redo remain available through keyboard shortcuts. Changes update VS Code's document; VS Code owns disk saving, the dirty indicator, Git integration, hot exit and undo history. **⌘S / Ctrl+S** saves. You can show the same note in Merkzeug and in the text editor side by side.

Selecting a whole table cell highlights the cell; click inside its text to place the caret and edit.

While the caret is in a table, a **table bar** appears above the note: insert a row above/below or a column left/right, align the current column left, centered or right, and delete the row, the column or the whole table. The header row and the last remaining data row cannot be deleted. Tab moves to the next cell and adds a new row after the last cell; Enter moves to the cell below and adds a new row in the last row, and Enter in an empty last row removes it and continues below the table. ⇧Enter breaks the line inside a cell, ⌘Enter / Ctrl+Enter leaves the table. The table menu in the toolbar offers the same row and column actions. To edit the Markdown source, open the file in VS Code's text editor.

If another editor changes the document, Merkzeug reloads it when there are no local edits. Otherwise a conflict banner lets you reload the other version or deliberately keep your own version.

Merkzeug follows the file's write permissions. Links to other Markdown files open them in their own Merkzeug tab, or activate an already open tab; web links open in your browser. Cross-document heading navigation is incomplete, as in IntelliJ.

## Images and companion folders

Images inserted through the image picker or pasted into `Plan.md` are written as separate image files in a sibling folder named `Plan.assets/`. Markdown uses relative references such as `![Diagram](Plan.assets/image-….png)`. The desktop, iOS and IntelliJ editions use the same layout. Include both the note and its companion folder when committing or sharing the note. Existing shared `assets/` links remain supported.

HTML `<img>` tags are shown as images with their `width`/`height`; their HTML only changes through the image toolbar. Click an image to show its toolbar: **HTML &lt;img&gt;** switches between a Markdown image and an HTML `<img>` tag, and only HTML images keep a width (**W**), height (**H**, with an aspect-ratio lock) and alignment (left, centered, right). The **⋯** panel of the Merkzeug editor contains **Insert images as HTML &lt;img&gt; tags** for VS Code (also the setting `merkzeug.editor.insertImagesAsHtml`) and **In this vault** to override it for the project (saved as `"imageInsert"` in `.merkzeug/settings.json`, shared with the desktop and iOS editions).

### Rename and move

Rename a Markdown file in the Explorer (F2), drag it to another folder, or use any other VS Code rename. If `Plan.md` has a sibling `Plan.assets/` folder, Merkzeug includes that folder in the same operation: renaming to `Draft.md` also renames the folder to `Draft.assets/`; moving the note moves its companion folder with it. Local Markdown links in all workspace notes are updated, including outgoing relative links of a moved note and notes without a companion folder. Renaming a folder updates Markdown paths as well. The folder move and link updates are applied as part of VS Code's rename operation; save any notes VS Code shows as modified afterwards.

If the destination companion folder already exists, Merkzeug shows a warning and leaves the folder in place; folders are never merged or overwritten. Symbolic-link companions require manual handling. Files excluded by `files.exclude` or `search.exclude`, symbolic links and `node_modules` are not scanned. Changes made outside VS Code (for example in Finder or on the command line) do not trigger this integration. To turn it off, disable **Merkzeug › Refactoring: Companion Folders**. If you also enable VS Code's own `markdown.updateLinksOnFileMove.enabled`, both extensions may propose link updates.

Inline links, images and reference-style definitions are supported. URL encoding, titles and `#section` suffixes are preserved. Code examples, frontmatter, external URLs, HTML links and wiki links are left alone.

## Settings

Merkzeug's settings are in **Settings → Extensions → Merkzeug**. Workspace settings apply to the current workspace, like IntelliJ's project settings.

| Setting | Purpose |
| --- | --- |
| `merkzeug.pdf.templateFolder` | PDF template folder when no vault assignment exists. Empty exports without a template. |
| `merkzeug.editor.pdfTemplatePreview` | Use the PDF template's content styles while editing. |
| `merkzeug.pdf.browserPath` | Chromium-based browser used for PDF export (machine setting). |
| `merkzeug.refactoring.companionFolders` | Move companion folders and update links on rename/move. |

In Restricted Mode, a template folder from the workspace settings is ignored; only your user setting applies.

## PDF export

1. Optionally run **Merkzeug: PDF Template Settings…** (also in the editor's **⋯** menu as **PDF template …**) and choose a template.
2. Click **Export PDF** in the toolbar, or choose **Merkzeug: Export PDF** from the editor title menu or command palette.
3. If linked documents are found, a dialog lists them. Choose **Only this document** or **Include linked documents**. **Cancel** stops the export.
4. Choose a destination filename and save. A notification offers to open the PDF or reveal it.

The PDF uses the current VS Code document content, including unsaved changes. See the [PDF guide](pdf.md) for template files, frontmatter and document selection.

## Printing

Click **Print…** in the toolbar or choose **Merkzeug: Print…**. Merkzeug renders the note with the same templates, headers/footers, diagrams, images and optional linked documents, then opens the PDF in your system's PDF viewer; print from there. The temporary PDF is removed automatically after a day.

## PDF templates

**Merkzeug: PDF Template Settings…** offers:

- **Choose PDF template folder…**: select the actual template folder (containing `stil.css`, `vorlage.json`, etc.). A desktop template folder can be selected directly; no copy is made.
- **Use bundled PDF template**: copies the Merkzeug starter once into VS Code's extension storage (`…/globalStorage/creative-it.merkzeug/pdf-templates/Merkzeug`) and selects it. Existing copies are never overwritten. Copy the folder before customizing it with an agent.
- **Desktop templates**: discovers the desktop app's standard locations on macOS, Windows and Linux, including its custom `templatesRoot` setting and the `MERKZEUG_TEMPLATES_ROOT` environment variable. Discovery does not copy files.
- **Template styling prompt**: opens the complete agent brief for the folder currently configured and offers **Copy styling prompt**. See [PDF templates and the suggested agent prompt](pdf.md#pdf-template-starter).
- **No template** and **Open Settings**.

The same actions are available as separate **Merkzeug:** commands in the command palette.

### Template location for the vault

In the editor's **⋯** menu, choose **PDF template for this vault**. Select **Central template** and a name, or **Template inside this vault** with a relative folder such as `.merkzeug/templates/Company`, and press **Apply**. The choice is stored in `.merkzeug/settings.json`, works across desktop, iPhone/iPad, IntelliJ and VS Code, and takes precedence over `merkzeug.pdf.templateFolder`. Choose **No template** and **Apply** to clear the assignment.

## Preview PDF styles while editing

Enable **Use PDF template while editing** in the **⋯** menu (stored as `merkzeug.editor.pdfTemplatePreview`). Content styles from the assigned template apply to the editor; the frontmatter area shares its light paper surface; the toolbar and VS Code keep the VS Code theme. This previews typography and colors, not pagination, cover pages or headers and footers. The preview refreshes when settings change and when the editor regains focus.

## Appearance, tours and agent guidance

The editor automatically follows the active VS Code color theme, including live theme changes and high-contrast themes. The **⋯** menu contains About Merkzeug, Release Notes, the PDF template actions, the guided tour (not in Marketplace builds) and attachment guidance.

Merkzeug can suggest root `AGENTS.md` / `CLAUDE.md` instructions for `Note.md` and `Note.assets/`. Review the proposed text and the full contents of both instruction files, select the destination files explicitly and choose **Add**; none is preselected. **Later** postpones it for the current session; **Do not suggest again for this vault** suppresses future prompts for that folder.

## Language

The interface uses German when VS Code's display language is German, or when VS Code runs in English on a German system; otherwise English. Command and setting names follow VS Code's display language.

## Release notes, About and support

On the first start of a new version, its release notes open automatically; **Done** marks that version as read. The full history remains under **⋯ → Release Notes**. **⋯ → About Merkzeug** shows the version, license, publisher and website.

Run **Merkzeug: Contact Support…** from the command palette. The browser opens the support form with Merkzeug, your language, VS Code and the extension version selected. Note contents and paths are not included.

## Scope and limitations

- Files and images outside the note's workspace folder are not accessible through the editor. For a file opened without a workspace, its folder is the limit.
- PDF export and printing need a Chromium-based browser; pagination can differ slightly between browser versions.
- Desktop vault browsing, native OS calendars, meeting notes and bulk PDF export are not part of the extension. Create new files using VS Code's Explorer.

For failures, see [troubleshooting](troubleshooting.md). Contributors can use the [extension development guide](../../vscode/README.md).

## License

Merkzeug is licensed under the [MIT License](../../resources/legal/EULA.en.md). The extension package includes the license and third-party notices.
