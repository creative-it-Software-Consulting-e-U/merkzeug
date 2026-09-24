# Merkzeug – Mac & Linux Help

The interface and this help use German on a German system and English otherwise. You can switch the help language independently.

Merkzeug is a Notion-style editor for Markdown notes – this edition runs on
**macOS, Windows and Linux**. You edit your notes **WYSIWYG** (formatted, without
visible Markdown syntax), but everything is always saved as clean, portable
Markdown. All notes live as `.md` files in an ordinary folder – the **vault**.

Shortcuts below show Mac first, followed by Linux/Windows. The shortcut table lists each platform explicitly.

**Contents:** [1. Getting started](#1.-getting-started) ·
[2. Sidebar & file tree](#2.-sidebar-&-file-tree) ·
[3. Tabs, sections & windows](#3.-tabs,-sections-&-windows) ·
[4. Editor & formatting](#4.-editor-&-formatting) ·
[5. Links](#5.-links) ·
[6. Navigation mode](#6.-navigation-mode-%28reading-&-browsing%29) ·
[7. Mermaid diagrams](#7.-mermaid-diagrams) ·
[8. Image assets](#8.-image-assets) ·
[9. PDF export](#9.-pdf-export) ·
[10. Git integration](#10.-git-integration) ·
[11. Keyboard shortcuts](#11.-keyboard-shortcuts) ·
[Meeting notes and calendars](#meeting-notes-and-calendars) ·
[Linux installation & differences](#linux-installation-and-platform-differences)

---

## 1. Getting started

- On first launch you pick a **vault folder** (any folder containing Markdown
  files). Your choice is remembered.
- Use **File → Open Vault…** (⌘O / Ctrl+O) to switch the vault of the current window.
- **File → Recent Vaults** lists the last ten vaults for quick switching.
- **Autosave:** changes are saved automatically one second after the last edit,
  as well as when closing tabs and when quitting the app.
  Manually: **⌘S / Ctrl+S** (active note) or **⌥⌘S / Ctrl+Alt+S** (all open notes).
- The vault can also be preset via the `MERKZEUG_VAULT` environment variable.

## 2. Sidebar & file tree

The sidebar on the left shows the vault as a hierarchical tree.

- **Clicking a note** opens it in a tab; clicking a folder expands/collapses it.
  **Double-clicking a folder** opens the folder overview.
- **Adjusting the width:** drag the divider between the sidebar and the editor
  area with the mouse; double-clicking it restores the default width. If there
  is not enough room for long names or deep hierarchies, the tree can be
  scrolled horizontally and vertically.
- **Context menu** (right-click): new note, new folder, export as PDF, rename,
  move to trash, show in Finder/Explorer.
- **Multi-selection:** ⌘-click (Windows/Linux: Ctrl-click) adds further notes
  to the selection or removes them again, ⇧-click selects the range up to the
  clicked note — both only among notes of the **same folder**. Right-clicking
  the selection then offers **"Export N files as PDF…"** (see the PDF export
  section).
- **Moving:** simply drag files and folders onto a folder.
- **Folder overview:** shows the contents of a folder as cards in its own tab;
  clicking notes and subfolders navigates onward.
- **Sidebar footer:** buttons for a new note, a new meeting note and a new
  folder (left) plus a reload button for re-reading the vault; the eye icon
  shows/hides **asset folders** (⇧⌘R / Ctrl+Shift+R).
- **Meeting notes:** see [Meeting notes and calendars](#meeting-notes-and-calendars).
- **Automatic naming of new notes:** a new note is initially called
  "New note". If it starts with a **heading 1**, the file is automatically
  named after the title when saving: all lowercase, spaces and special
  characters become "-", umlauts are kept — so
  "2026-08-11 Project Planning - Next Steps" becomes
  `2026-08-11-project-planning-next-steps.md`. When the heading
  changes, the file name follows. As soon as you **rename the file manually**,
  your name is left untouched.
- Changes made to the vault outside the app (Finder/Explorer, terminal, sync)
  are detected automatically. This also applies to **open notes**: when the
  file changes on disk, the tab reloads it and shows a notice with the time
  ("Reloaded at ...") above the editor. If you have unsaved changes there,
  a banner appears instead, offering **"Reload"** (take the version from disk)
  or **"Keep my version"** (save your own changes); nothing is overwritten
  until you decide.
- **Hidden and technical folders:** entries starting with a dot (e.g. `.git`)
  as well as dependency and build folders from software projects are hidden
  and not watched — `node_modules`, `__pycache__`, Python virtualenvs, and
  `target`, `build`, `dist` and `out` when the matching build file sits next
  to them (e.g. `pom.xml` or `package.json`). This keeps the app responsive
  even when a large code repository is opened as a vault.
  Meeting-note headings and date labels follow the app language; event titles and participant names remain unchanged.

## 3. Tabs, sections & windows

- Every note opens in its own **tab**; **⌘W / Ctrl+W** closes the active tab,
  **⇧⌘W / Ctrl+Shift+W** closes the window.
- **Two sections** side by side: **⌘\ / Ctrl+\** splits the editor area. Drag tabs onto
  the other tab bar or move them with **⇧⌘\ / Ctrl+Shift+\**.
- **Multiple windows:** **⌥⌘N / Ctrl+Alt+N** opens a new window (initially inheriting the
  current window's vault; each window can show a different vault via ⌘O / Ctrl+O).

## 4. Editor & formatting

The editor shows the note formatted; what is saved is Markdown.

- **Toolbar:** the bar above the editor offers paragraph format, bold/italic/
  strikethrough/inline code, lists, quote, code block, link, image, table and
  divider — plus back/forward as well as, on the right, the help button
  (question mark, opens this help) and navigation mode (book icon).
- **Table-of-contents dropdown:** the list button on the left of the toolbar
  shows all headings of the note (indented by level); clicking one jumps
  straight to that heading. Also works in navigation mode.
- **Slash menu:** type **"/"** on an empty line for all block types (headings,
  lists, quote, code block, table, image …).
- **Selection toolbar:** selecting text shows a floating bar for bold, italic,
  strikethrough, inline code and links.
- **Character formats:** bold (⌘B / Ctrl+B), italic (⌘I / Ctrl+I), inline code (⌘E / Ctrl+E),
  strikethrough (⌥⌘X / Ctrl+Alt+X).
- **Paragraph formats:** plain text (⌥⌘0 / Ctrl+Alt+0), headings 1–6 (⌥⌘1 / Ctrl+Alt+1–⌥⌘6 / Ctrl+Alt+6),
  quote (⇧⌘B / Ctrl+Shift+B), code block (⌥⌘C / Ctrl+Alt+C).
- **Lists:** bullet list (⌥⌘8 / Ctrl+Alt+8), numbered list (⌥⌘7 / Ctrl+Alt+7) and task lists; nest with
  Tab/⇧Tab, automatic continuation on Enter and automatic renumbering.
- **Auto-formatting while typing:** `# `, `## `, `- `, `1. `, `> ` at the start
  of a line and ` ``` ` immediately create the corresponding format; `->`
  becomes an arrow "→".
- **Tables:** insert via ⌥⌘T / Ctrl+Alt+T, the slash menu or the Edit menu. Jump from cell to
  cell with Tab; add and delete rows/columns via the table controls right at the
  table or the **Table** menu.
- **Images:** paste from the clipboard, drag & drop, slash menu or
  **Edit → Insert Image…**.
- **Undo/redo** as usual (⌘Z / Ctrl+Z / ⇧⌘Z / Ctrl+Shift+Z).
- **Find & replace:** **⌘F / Ctrl+F** opens the search bar at the top right of the
  editor, **⌥⌘F / Ctrl+Alt+F** additionally shows the replace row (also via
  **Edit → Find…**). The search covers the current note and is
  case-insensitive; selected text is taken over as the search term. **↩**
  jumps to the next match, **⇧↩** to the previous one, **Esc** closes the
  bar. "Replace" replaces the current match, "All" replaces all matches.
  In navigation mode you can search but not replace.
- **Moving blocks:** the handle to the left of a block (appears on hover)
  allows drag & drop reordering.
- **YAML frontmatter:** a `---` block at the top of the file (e.g. with
  `title:`, `tags:` …) does not appear in the text; instead it sits behind the
  gray, collapsible **"Frontmatter"** bar at the very top of the editor, where
  it can be edited directly. Clearing the field removes the block on save.
  `title:` sets the title used by the PDF export.
- **Which fields does Merkzeug interpret?** The **"+ Field"** menu on the right
  of the frontmatter bar lists them with an explanation (currently `title:`,
  `pdf-linked-title:`, `pdf-exclude:`, `pdf-toc:` and `language:`) and inserts a template line on
  click. Any other fields are preserved but not interpreted.

Selecting a whole table cell highlights the cell; click inside its text to place the caret and edit. Text and links retain their colors while the cell is selected, including when using PDF-template styles.

## 5. Links

- **⌘K / Ctrl+K** opens the link dialog for inserting a formatted link; edit existing
  links via the tooltip that appears when clicking a link.
- Possible addresses: `https://…` URLs, paths **relative to the current file**,
  paths **relative to the vault root** (leading "/") and absolute paths.
- **Links to `.md` files** open the note in a tab. **Links to folders** expand
  the folder in the sidebar and open the folder overview. External links open
  in the browser or default application.
- **Links to headings:** append `#heading` to the target to jump straight to a
  heading – e.g. `note.md#getting-started`. Just `#getting-started` jumps to the
  heading **within the same note**. The fragment is the heading text in lower
  case with `-` instead of spaces; case and punctuation are treated leniently
  when jumping. The target heading is briefly highlighted after the jump. If the
  fragment does not match any heading, the note opens at the top.

## 6. Navigation mode (reading & browsing)

For browsing linked notes there is a per-tab **navigation mode** – toggled with
**⌘R / Ctrl+R**, via **View → Navigation Mode** or the book icon in the toolbar.

- In navigation mode the note is **read-only**; clicking vault links loads the
  target **in the same tab** (instead of opening a new tab).
- **Folder links** also stay in the same tab: the tab shows the folder overview,
  and clicks on its entries continue navigating in the same tab.
- **Back/forward:** arrow buttons in the toolbar, **⌘[ / Ctrl+[** / **⌘] / Ctrl+]**, the
  back/forward mouse buttons, or trackpad swipe gestures (horizontal
  two-finger swipe; on macOS also three fingers if "Swipe between pages"
  is configured accordingly).
- Going back/forward returns you to the **position where you left the note**
  (or to the linked anchor if you had not scrolled there).
- The **history is kept per tab**, even if you leave the mode, edit the note and
  re-enable the mode later.

## 7. Mermaid diagrams

- Code blocks with the language `mermaid` are rendered **as diagrams** directly
  in the editor (offline, mermaid.js is bundled with the app).
- The **"Edit"** button on the diagram shows the source; **"Diagram"** switches
  back to the rendered view. The file always keeps the ` ```mermaid ` block.
- **Zoom preview:** the magnifier (appears when hovering the diagram) or
  ⌘-click opens a separate window – zoom with ⌘+scroll or pinch or the
  **+/−/0** keys, close with **Esc**.

## 8. Image assets

- Every note has its own asset folder **`NoteName.assets/`** next to the file;
  inserted images are stored there.
- When **renaming** the note the folder is renamed too (including updating the
  image paths inside the note), when **moving** it moves along, when
  **deleting** it goes to the trash as well.
- Asset folders are hidden in the file tree by default (⇧⌘R / Ctrl+Shift+R shows them).

## 9. PDF export

- **File → Export as PDF…** exports the active note as a PDF;
  alternatively right-click a note in the file tree.
- If the note links to other Markdown files **in the same hierarchy** (its own
  folder or below), the app asks: **"Only this file"** or **"With linked
  documents"**. The latter is meant for index files such as a `README` with a
  table of contents: the index file comes first, followed by all directly
  linked documents in alphabetical order – each starting on a new page.
- **Exporting several notes individually:** after a multi-selection in the
  file tree (⌘/Ctrl- or ⇧-click, see section 2) the context menu offers
  **"Export N files as PDF…"**. You choose a **target folder**, then each
  selected note is exported there as its **own PDF** (note's file name with
  `.pdf`) — without the linked-documents prompt, each file on its own.
  Existing PDFs with the same name are overwritten after confirmation. An
  assigned PDF template applies to all files.
- **Excluding documents:** a `pdf-exclude:` list in the index file's
  frontmatter leaves individual linked documents out of the export, e.g.:

  ```
  ---
  pdf-exclude:
    - internal
    - subfolder/draft.md
  ---
  ```

  Paths work like in links: relative to the index file, with a leading `/`
  relative to the vault; `.md` is optional. The short form
  `pdf-exclude: [internal, draft]` also works. Excluded documents are not
  counted in the export prompt.
- **Separate title for the combined export:** `pdf-linked-title:` in the index
  file's frontmatter sets the document title for the export **with linked
  documents** — useful when the index file on its own is, say, a "Management
  Summary" while the combined document should be called "Full Report":

  ```
  ---
  title: Management Summary
  pdf-linked-title: Full Report
  ---
  ```

  The "Only this file" export keeps using `title:` (or the first heading). The
  title appears in the PDF metadata, in the `{{titel}}` placeholder of
  templates and in Chromium's `<span class="title">` in headers/footers.
- **Table of contents:** `pdf-toc: true` in the frontmatter of the exported
  (index) file prepends a clickable table of contents to the PDF — headings
  1–3 of all included documents on a page of its own after the cover (so
  starting on page 2 when there is a cover).
- **Document language:** `language:` in the frontmatter of the (index) file
  (e.g. `language: en`) sets the heading of the table of contents ("Table of
  Contents" for English; supported: de, en,
  fr, es, it, pt, nl — other languages get the English title) and the
  hyphenation used in the PDF. Without it, the interface language (German or English) is used.
- The PDF is always rendered in the light theme (regardless of the system
  appearance) and includes tables, images and Mermaid diagrams. Web links,
  files outside the hierarchy and unlinked files are not appended.
- **Mermaid in the PDF:** diagrams are never split across a page break — if a
  diagram no longer fits on the current page it starts on the next one, and a
  diagram taller than a page is scaled down to fit.
- **Automatic landscape:** if any exported document contains a table that
  does not fit on an A4 page in portrait orientation, the entire PDF is
  generated in landscape.
- **Links in the PDF:** links between the exported documents (e.g. from the
  table of contents) jump directly to the respective page inside the PDF;
  web links stay clickable. Vault links to files not included in the PDF
  appear as plain text.
- While exporting, a **progress indicator** at the bottom of the window shows
  the status ("document 3 of 15 rendered …", then "generating PDF …").
- After the export the generated file is revealed in Finder/Explorer.

### PDF templates (letterhead, header and footer)

Templates give the PDF a company layout: a logo and header on every page, a
footer with page numbers, and an optional cover page.

- Templates are managed under **Merkzeug → Settings…** (⌘, / Ctrl+,). That is where the
  **templates folder** is chosen; each template is a subfolder inside it.
- **"Create"** sets up a new template with example files and opens it
  in Finder/Explorer. A template consists of (all files optional):
  - `kopfzeile.html` – header on every page
  - `fusszeile.html` – footer on every page
  - `deckblatt.html` – cover page (first page)
  - `stil.css` – additional CSS for the document content
  - `vorlage.json` – page margins in millimetres
- **Placeholders:** `{{titel}}` (`title:` from the YAML frontmatter, otherwise
  the first level-1 heading of the note, otherwise the file name; when
  exporting with linked documents, `pdf-linked-title:` takes precedence) and
  `{{datum}}` (export date); in
  header and footer additionally `<span class="pageNumber"></span>` and
  `<span class="totalPages"></span>` for page numbers.
- **Logo:** put an image file (e.g. `logo.png`) into the template folder and
  reference it relatively (`<img src="logo.png" style="height: 8mm">`) – it is
  embedded automatically on export. Header and footer support inline CSS only.
  Details are in each template's `README.md`.
- **Detecting landscape:** when the PDF is generated in landscape
  automatically, the document carries the class `pdf-landscape` on the
  `<html>` element. `stil.css` can react to it, e.g. to make a tall cover page
  shorter: `html.pdf-landscape .cover { height: 150mm; }`.
- **Per-vault assignment:** in the settings a template is assigned to the
  current vault. The assignment is stored inside the vault
  (`.merkzeug/settings.json`) and travels to all devices via Git; the export
  uses it automatically. Without an assignment the PDF is exported without a
  template, as before.
- **Sync between devices:** if the templates folder lives in **iCloud Drive,
  Google Drive, OneDrive or Dropbox**, the respective cloud client syncs the
  templates to all machines automatically.

## 10. Git integration

Merkzeug uses a separately installed Git executable for desktop version control. On macOS, Git is available through Apple’s Command Line Tools or a separate Git installation; full Xcode is not required. If Git is missing or cannot start, the sidebar shows **Git is unavailable**. Choose **Git setup** for installation instructions, then **Check again** after installing or configuring Git. Automatic Git checks pause while it is unavailable. Merkzeug does not launch Apple’s developer-tools installation dialog. Editing notes and exporting PDFs continue to work without Git.

If the vault is a **Git repository**, a status line appears at the bottom of
the sidebar:

- **Branch name**, number of changed files, **n↑** = local commits not yet
  pushed, **n↓** = new commits on the server, check mark = everything committed
  and pushed.
- The status refreshes automatically – even when you commit or pull outside the
  app.
- **Clicking the status line** expands the details: list of changed files, an
  input field for the commit message and the **Commit & Push**, **Push** and
  **Pull** buttons.
- **Commit & Push** first saves all open notes, then runs `git add`, commit and
  push. Without a configured upstream it is set automatically; without a remote
  only a local commit is created (with a note).
- **Push** uploads commits that are already committed but not yet pushed
  (**n↑** in the status line) – for example to retry a push that failed
  because the server was temporarily unreachable.
- **Pull** fetches changes from the server; merge conflicts are resolved outside
  the app.
- If a Git operation fails (e.g. because the server is unreachable), the
  status line shows a **⚠** sign. The error message appears in the expanded
  details; the sign disappears as soon as a Git operation succeeds again.
- The app uses your system's Git credentials (SSH keys or credential helper).
  If an interactive login were required, the operation aborts with an error
  message instead of hanging.

## 11. Keyboard shortcuts

| Function | Mac | Linux / Windows |
| --- | --- | --- |
| New note | ⌘N | Ctrl+N |
| New meeting note | ⌃⌘N | Ctrl+Alt+Shift+N |
| New folder | ⇧⌘N | Ctrl+Shift+N |
| New window | ⌥⌘N | Ctrl+Alt+N |
| Open vault | ⌘O | Ctrl+O |
| Close tab / Close window | ⌘W / ⇧⌘W | Ctrl+W / Ctrl+Shift+W |
| Save / Save all | ⌘S / ⌥⌘S | Ctrl+S / Ctrl+Alt+S |
| Print | ⌘P | Ctrl+P |
| Settings (PDF templates) | ⌘, | Ctrl+, |
| Bold / Italic / Strikethrough / Inline code | ⌘B / ⌘I / ⌥⌘X / ⌘E | Ctrl+B / Ctrl+I / Ctrl+Alt+X / Ctrl+E |
| Text / Heading 1–6 | ⌥⌘0 … ⌥⌘6 | Ctrl+Alt+0 … Ctrl+Alt+6 |
| Bullet list / Numbered list | ⌥⌘8 / ⌥⌘7 | Ctrl+Alt+8 / Ctrl+Alt+7 |
| Quote / Code block | ⇧⌘B / ⌥⌘C | Ctrl+Shift+B / Ctrl+Alt+C |
| Insert link | ⌘K | Ctrl+K |
| Insert table | ⌥⌘T | Ctrl+Alt+T |
| Find / Find and replace | ⌘F / ⌥⌘F | Ctrl+F / Ctrl+Alt+F |
| Toggle navigation mode | ⌘R | Ctrl+R |
| Back / Forward | ⌘[ / ⌘] | Ctrl+[ / Ctrl+] |
| Toggle second section | ⌘\ | Ctrl+\ |
| Move tab to other section | ⇧⌘\ | Ctrl+Shift+\ |
| Show/hide assets | ⇧⌘R | Ctrl+Shift+R |
| This help | ⌘? | F1 |

*(Windows/Linux: ⌘ = Ctrl, ⌥ = Alt, ⇧ = Shift)*

## Shared editor and save conflicts

Desktop, iOS and IntelliJ use the same Merkzeug editor. Frontmatter is preserved and can be opened in the editor. Failed saves leave changes marked as unsaved. When external changes conflict with your edits, reload the external version or explicitly keep your own version.

## Mac App Store folder access

The Mac App Store edition remembers access when you select a vault or PDF-template folder. If macOS revokes access or the folder moves, select it again.


## Support and feedback

Use **Help → Contact Support…** to open the support form with Merkzeug, your language, edition and app version selected. You can deselect the app details before sending. No note contents or file paths are attached automatically.

[Contact Merkzeug App Support](https://support.apps.creative-it.com/?app=merkzeug&lang=en). Include your app version, operating system and steps to reproduce the issue. Use fictional examples and avoid confidential notes.

## PDF template starter

Merkzeug ships a ready-to-use **Merkzeug** PDF template: a warm paper cover, serif headings, blue accents, page headers and numbered footers. In **Settings → Template for this vault**, select **Merkzeug**. Existing vaults keep their current selection, including **No template**. **Create** makes an editable copy under a new name; **Edit** opens its folder. Your changes are never overwritten by an app update. Changing the templates root makes the starter available there too, if the folder is writable.

Remove or rename `deckblatt.html` to omit the cover. Customize `stil.css` for document styles and `kopfzeile.html` / `fusszeile.html` for inline header/footer styles. Margins are in `vorlage.json`. Keep the German filenames and `{{titel}}` / `{{datum}}` placeholders; they are the shared template format. Put logo images in the template folder and reference them using relative paths. The template works in IntelliJ too: **PDF template…** opens the bundled starter folder initially when no other template is selected. iPhone and iPad also use templates for editor styling, PDF-file export and AirPrint.

### Adapt a template with an agent

Create a copy first, then give the agent that folder and this prompt:

> Read README.md and all five template files in this folder. Adapt this copy to my visual style: [COLORS], [FONTS] and [LOCAL LOGO PATH]. Preserve the filenames, title/date placeholders and Chromium page-number spans. Keep header/footer CSS inline and document CSS scoped to PDF selectors. Use local assets, no scripts or network dependencies. Support A4 portrait and landscape without clipping. Update README.md to explain the changes. Validate by exporting notes with a long title, headings, links, code, a table and a diagram; inspect every page of the resulting PDFs.

The template README includes the full file-format reference and a reusable prompt. Export through Merkzeug to check the result: browser previews alone do not verify page breaks. The settings link **Template guide and agent prompt** opens this section of the online manual; the same instructions are also included in the app's offline help.

## Appearance, tours and agent guidance

Choose **System**, **Light** or **Dark** for appearance. System follows the operating system (the IDE in IntelliJ); your choice is saved. The **Guided tour** starts only after you accept the first-use invitation and can be reopened at any time. Its **Read and navigate** step explains the read/edit switch and link navigation. Open a note before starting the tour to see its mode button highlighted.

When opening a vault, Merkzeug can suggest root `AGENTS.md` / `CLAUDE.md` instructions for `Note.md` and `Note.assets/`. Review the single proposed text and the full contents of both instruction files. Select the destination files explicitly before choosing **Add**; none is preselected. For example, leave `CLAUDE.md` unchanged when it only redirects to `AGENTS.md`. Missing files are created only when selected. **Later** postpones it for the current session; **Do not suggest again for this vault** suppresses future prompts for that vault. Contradictory or unclear attachment rules require manual review. Concurrent external changes are preserved and require a refreshed preview. Existing shared `assets/` references remain readable.

## Calendar sources

**New meeting note** offers calendar selection. Expand **Calendar sources** to import an `.ics` file or add a named private HTTPS/Webcal subscription. Subscriptions are saved on this device, never in the vault. **Refresh calendars** downloads changes; an error retains the previous snapshot and shows its saved time. Reimporting the same named ICS file updates its source without duplicating notes. Choose a term to create or reopen its meeting note; existing note text is never replaced. CalDAV and calendar write-back are not supported.

In **Settings**, select the PDF template for this vault. Enable **Use PDF template while editing** in the bottom bar to preview its document typography and colors. Disable it to return to the editor theme. Only `.pdf-content` content rules are reused; cover pages, page furniture, print layout and application-wide CSS are excluded. This is a formatting preview, not a paginated PDF proof. PDF export keeps the complete original template and print colors. Linux needs a system keyring for private subscriptions; ICS files can be imported without one.

Mermaid diagrams use the document background instead of a dark code-block panel and switch to the light PDF theme when PDF template editing styles are active, and return to the application theme when the preview is disabled.

### Template styling prompt

Desktop Settings provides **Template styling prompt** for each template; expand it to review and copy a complete agent brief with the template's folder path. IntelliJ offers the same action in **Settings → Tools → Merkzeug**, using the folder currently shown in the settings field. On iOS, open **Help → Template styling prompt** and substitute the folder path on the agent's computer; iOS supports PDF template styles while editing, PDF export, and printing through AirPrint.

Replace the new template name and your colors, fonts, logo and design wishes before sending it. The prompt is in English, includes the complete offline technical reference, and works with older templates that lack instruction files. Copying it does not read note contents or modify existing templates. If clipboard access is unavailable in the web view, select and copy the displayed text manually.

New starter copies include `AGENTS.md` (format, CSS examples, placeholders, preview limitations and validation) and `STYLING-PROMPT.md` (reusable brief). Keep template-specific design choices in `README.md`. The brief instructs the agent to create a separate copy and preserve existing instructions. Existing desktop templates are not upgraded or overwritten. For manual use, concatenate STYLING-PROMPT.md and AGENTS.md and replace the template-path placeholder.


### License

Merkzeug is proprietary software for private and internal business use. The full End User License Agreement is included at the end of the in-app help and is also available on the [website](https://merkzeug.creative-it.com/license-en.html). Third-party components retain their own licenses.


## Printing

Choose **File → Print…** (⌘P on macOS, Ctrl+P on Windows/Linux). Merkzeug saves pending edits, prepares the same PDF used for export, and opens the system print dialog. The PDF preview stays available after printing or cancellation. It includes the selected template, cover, headers, footers, diagrams and images. Linked documents can optionally be included. No PDF destination needs to be chosen; the temporary PDF is removed when its preview closes. PDF export remains a separate menu action.

## Shared iCloud templates

On macOS, Merkzeug uses **iCloud Drive → Merkzeug → Templates** when iCloud Drive is available. On first use, templates from the old default folder are copied and verified before the configured folder changes. Originals stay in the old folder as a recovery copy. An explicitly chosen custom folder is retained.

In Settings, **Use Merkzeug iCloud templates** copies your current templates to the shared folder and switches after verification. Different files with the same name stop migration without overwriting either version; review them before retrying.

On Windows with iCloud Drive, this action becomes available after the public **Merkzeug** folder has synchronized. Open Merkzeug on an Apple device first. Custom iCloud Drive locations registered with Windows are supported, as are the usual user-profile locations. Use **Change…** to select a synchronized templates folder directly if discovery is unavailable. Linux can use any mounted synchronized folder through **Change…**.

All devices must use the same iCloud account. Allow synchronization to finish before editing templates on another device. iOS uses the same folder and vault assignment.

### Meeting-note filenames

A meeting note uses its first heading as the filename. Case, spaces and accents are preserved; characters forbidden in cross-platform filenames are replaced, and a suffix resolves collisions without replacing another note or image folder. After saving a changed heading, Merkzeug renames the note and its companion `.assets/` folder. Calendar identity stays in frontmatter: choosing the same event again reopens its existing note in the selected folder, including notes created with the older `meeting-…` names. Those older names update when you edit and save the heading. Keep the calendar identity fields to preserve this association.

## Links when renaming or moving notes

Renaming a note or folder through Merkzeug updates local Markdown links to it in other Markdown files in the same vault. This also applies when a saved heading automatically changes a note's filename. Companion `.assets/` folders and links to their images follow the note. Moving a note also recalculates its outgoing relative links; shared image folders stay in place.

Inline links, images and reference-style link definitions are supported, including URL-encoded names and `#section` suffixes. Link labels and titles stay unchanged. Section suffixes are preserved, not recalculated when a heading changes. Code examples, frontmatter, external URLs and ordinary prose are not rewritten. HTML links and wiki-link syntax are not included.

Only regular Markdown files inside the vault are considered; hidden/ignored folders and symbolic links are not followed. Renames outside Merkzeug are not detected as refactoring. Destination collisions or stale file contents stop the operation. Open documents reload when clean; unsaved conflicting edits are preserved for review rather than silently overwritten.

When you quit Merkzeug, all open vault windows are restored on the next launch, including their size, position and fullscreen/maximized state. Windows closed individually before quitting stay closed. Missing vault folders are skipped; windows from disconnected displays are moved onto an available display.


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


## Linux installation and platform differences

Choose a separate package for your Linux architecture: **x86_64 (x64)** for Intel/AMD PCs, or **ARM64 (aarch64)** for ARM computers, including Linux on Apple Silicon in Parallels. Run `uname -m` if unsure. The packages contain only their selected architecture. In the commands below, replace `x64` with `arm64` for ARM64.

- **DEB:** install with `sudo apt install ./Merkzeug-1.2.1-linux-x64.deb` on Ubuntu/Debian-compatible systems.
- **RPM:** install with `sudo dnf install ./Merkzeug-1.2.1-linux-x64.rpm` on Fedora-compatible systems.
- **AppImage:** make the file executable in its file properties, or run `chmod +x Merkzeug-1.2.1-linux-x64.AppImage`, then open it. FUSE 2 is required (`libfuse2t64` on Ubuntu 24.04). Use the DEB package if AppImage is unsuitable for your system. Do not disable the application sandbox to work around an installation problem.

Download updates manually from the Merkzeug website. Verify downloads against the published SHA-256 checksums. These checksums detect changed files; they are not publisher certificates. Your notes and configuration remain outside the application package.

The shared desktop editor includes visual editing, Mermaid, reading/navigation mode, frontmatter, title-based filenames, companion image folders and link updates on move/rename, PDF templates, combined PDF export, printing and agent prompts. Install Git separately for the built-in Git operations; configure authentication through your normal Git tools.

Linux meeting notes use ICS files or HTTPS/Webcal calendar subscriptions. There is no direct GNOME/KDE system-calendar connector. A system keyring is required for storing private subscription URLs; local ICS import works without one. Linux uses a local central templates folder by default, or a folder you select. Vault templates in `.merkzeug/` travel with a repository; mounted sync folders also work. Automatic Apple iCloud discovery is unavailable. Printing depends on the system's configured printers and drivers.

## Meeting notes and calendars

**Meeting notes from the calendar:** **⌃⌘N / Ctrl+Alt+Shift+N** (menu "File → New Meeting Note…" or the calendar button in the footer) lists the running
  and upcoming events of the next 14 days from your locally configured
  calendars — on macOS all accounts of the Calendar app (iCloud,
  Exchange/Microsoft 365, Google, …), on Windows all calendars of
  **classic Outlook** (via its object model; the "new Outlook" has none),
  with no cloud API involved. All-day
  events (vacations, birthdays, …) are hidden by default and can be shown
  via the checkbox above the list. **"Show earlier events"** reveals past events, **"Search"** searches titles, people and
  locations within ±90 days. Clicking an event creates a ready-named note:
  the event data (date, time, location, organizer, attendees, detected
  Teams/Zoom/Meet/Webex link) goes into the frontmatter; the body contains
  date and time below the heading, a **checkable attendee list** (who
  actually showed up?) and the Agenda, Notes and Tasks sections. The first
  time, macOS asks for permission to access the calendar. On Windows,
  Outlook is started in the background if needed; if Outlook shows a
  security prompt ("A program is trying to access …"), allow access for a
  few minutes. On Linux and with new Outlook, use **Calendar sources** to import ICS files or subscribe to HTTPS/Webcal feeds.

Open **File → New Meeting Note…**, or use the calendar button below the file tree. On Mac, allow Calendar access when requested; configured Apple Calendar accounts supply events. On Linux, open **Calendar sources** to import an `.ics` file or add an HTTPS/Webcal subscription URL. Refresh to load current events; imported files are snapshots, subscriptions can be refreshed. Private subscription URLs are stored using the system keyring. Never commit private feed URLs to Git.

Choose an event to create a Markdown meeting note in the selected folder. Edit the agenda, record minutes and mark attendees and tasks as the meeting progresses. The note follows its first heading when renamed automatically; manual filenames are preserved. Your calendar event is never modified.

If the list is empty, check the date, all-day filter, calendar permissions on Mac and configured sources on Linux. Linux has no direct GNOME/KDE calendar connection. Windows/classic Outlook support belongs to the forthcoming Windows edition.
