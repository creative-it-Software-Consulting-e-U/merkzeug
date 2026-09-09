# Merkzeug – Help

The interface and this help use German on a German system and English otherwise. You can switch the help language independently.

Merkzeug is a Notion-style editor for Markdown notes – this edition runs on
**macOS, Windows and Linux**. You edit your notes **WYSIWYG** (formatted, without
visible Markdown syntax), but everything is always saved as clean, portable
Markdown. All notes live as `.md` files in an ordinary folder – the **vault**.

All shortcuts use **⌘** on the Mac; on Windows, ⌘ corresponds to the **Ctrl**
key and ⌥ to the **Alt** key.

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
[11. Keyboard shortcuts](#11.-keyboard-shortcuts)

---

## 1. Getting started

- On first launch you pick a **vault folder** (any folder containing Markdown
  files). Your choice is remembered.
- Use **File → Open Vault…** (⌘O) to switch the vault of the current window.
- **File → Recent Vaults** lists the last ten vaults for quick switching.
- **Autosave:** changes are saved automatically one second after the last edit,
  as well as when closing tabs and when quitting the app.
  Manually: **⌘S** (active note) or **⌥⌘S** (all open notes).
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
  shows/hides **asset folders** (⇧⌘R).
- **Meeting notes from the calendar:** **⌃⌘N** (menu "Ablage → Neue
  Meeting-Notiz…" or the calendar button in the footer) lists the running
  and upcoming events of the next 14 days from your locally configured
  calendars — on macOS all accounts of the Calendar app (iCloud,
  Exchange/Microsoft 365, Google, …), on Windows all calendars of
  **classic Outlook** (via its object model; the "new Outlook" has none),
  with no cloud API involved. All-day
  events (vacations, birthdays, …) are hidden by default and can be shown
  via the checkbox above the list. **"Frühere
  anzeigen"** reveals past events, **"Suchen"** searches titles, people and
  locations within ±90 days. Clicking an event creates a ready-named note:
  the event data (date, time, location, organizer, attendees, detected
  Teams/Zoom/Meet/Webex link) goes into the frontmatter; the body contains
  date and time below the heading, a **checkable attendee list** (who
  actually showed up?) and the Agenda, Notes and Tasks sections. The first
  time, macOS asks for permission to access the calendar. On Windows,
  Outlook is started in the background if needed; if Outlook shows a
  security prompt ("A program is trying to access …"), allow access for a
  few minutes. On Linux the calendar integration is not available yet (an
  ICS import will follow).
- **Automatic naming of new notes:** a new note is initially called
  "Neue Notiz". If it starts with a **heading 1**, the file is automatically
  named after the title when saving: all lowercase, spaces and special
  characters become "-", umlauts are kept — so
  "2026-08-11 BPP Call Gerulf & Alois - Neustrukturierung" becomes
  `2026-08-11-bpp-call-gerulf-alois-neustrukturierung.md`. When the heading
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

## 3. Tabs, sections & windows

- Every note opens in its own **tab**; **⌘W** closes the active tab,
  **⇧⌘W** closes the window.
- **Two sections** side by side: **⌘\** splits the editor area. Drag tabs onto
  the other tab bar or move them with **⇧⌘\**.
- **Multiple windows:** **⌥⌘N** opens a new window (initially inheriting the
  current window's vault; each window can show a different vault via ⌘O).

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
- **Character formats:** bold (⌘B), italic (⌘I), inline code (⌘E),
  strikethrough (⌥⌘X).
- **Paragraph formats:** plain text (⌥⌘0), headings 1–6 (⌥⌘1–⌥⌘6),
  quote (⇧⌘B), code block (⌥⌘C).
- **Lists:** bullet list (⌥⌘8), numbered list (⌥⌘7) and task lists; nest with
  Tab/⇧Tab, automatic continuation on Enter and automatic renumbering.
- **Auto-formatting while typing:** `# `, `## `, `- `, `1. `, `> ` at the start
  of a line and ` ``` ` immediately create the corresponding format; `->`
  becomes an arrow "→".
- **Tables:** insert via ⌥⌘T, the slash menu or the Edit menu. Jump from cell to
  cell with Tab; add and delete rows/columns via the table controls right at the
  table or the **Table** menu.
- **Images:** paste from the clipboard, drag & drop, slash menu or
  **Edit → Insert Image…**.
- **Undo/redo** as usual (⌘Z / ⇧⌘Z).
- **Find & replace:** **⌘F** opens the search bar at the top right of the
  editor, **⌥⌘F** additionally shows the replace row (also via
  **Edit → Find…**). The search covers the current note and is
  case-insensitive; selected text is taken over as the search term. **↩**
  jumps to the next match, **⇧↩** to the previous one, **Esc** closes the
  bar. "Ersetzen" replaces the current match, "Alle" replaces all matches.
  In navigation mode you can search but not replace.
- **Moving blocks:** the handle to the left of a block (appears on hover)
  allows drag & drop reordering.
- **YAML frontmatter:** a `---` block at the top of the file (e.g. with
  `title:`, `tags:` …) does not appear in the text; instead it sits behind the
  gray, collapsible **"Frontmatter"** bar at the very top of the editor, where
  it can be edited directly. Clearing the field removes the block on save.
  `title:` sets the title used by the PDF export.
- **Which fields does Merkzeug interpret?** The **"+ Feld"** menu on the right
  of the frontmatter bar lists them with an explanation (currently `title:`,
  `pdf-linked-title:`, `pdf-exclude:`, `pdf-toc:` and `language:`) and inserts a template line on
  click. Any other fields are preserved but not interpreted.

## 5. Links

- **⌘K** opens the link dialog for inserting a formatted link; edit existing
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
**⌘R**, via **View → Navigation Mode** or the book icon in the toolbar.

- In navigation mode the note is **read-only**; clicking vault links loads the
  target **in the same tab** (instead of opening a new tab).
- **Folder links** also stay in the same tab: the tab shows the folder overview,
  and clicks on its entries continue navigating in the same tab.
- **Back/forward:** arrow buttons in the toolbar, **⌘[** / **⌘]**, the
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
- Asset folders are hidden in the file tree by default (⇧⌘R shows them).

## 9. PDF export

- **File → Export as PDF…** (⌘P) exports the active note as a PDF;
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
  Contents" instead of the German "Inhaltsverzeichnis"; supported: de, en,
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

- Templates are managed under **Merkzeug → Settings…** (⌘,). That is where the
  **templates folder** is chosen; each template is a subfolder inside it.
- **"Anlegen"** (create) sets up a new template with example files and opens it
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
  Details are in each template's `LIESMICH.md`.
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

| Shortcut | Function |
| --- | --- |
| ⌘N | New note |
| ⌃⌘N | New meeting note |
| ⇧⌘N | New folder |
| ⌥⌘N | New window |
| ⌘O | Open vault |
| ⌘W / ⇧⌘W | Close tab / Close window |
| ⌘S / ⌥⌘S | Save / Save all |
| ⌘P | Export as PDF |
| ⌘, | Settings (PDF templates) |
| ⌘B / ⌘I / ⌥⌘X / ⌘E | Bold / Italic / Strikethrough / Inline code |
| ⌥⌘0 … ⌥⌘6 | Text / Heading 1–6 |
| ⌥⌘8 / ⌥⌘7 | Bullet list / Numbered list |
| ⇧⌘B / ⌥⌘C | Quote / Code block |
| ⌘K | Insert link |
| ⌥⌘T | Insert table |
| ⌘F / ⌥⌘F | Find / Find and replace |
| ⌘R | Toggle navigation mode |
| ⌘[ / ⌘] | Back / Forward |
| ⌘\ | Toggle second section |
| ⇧⌘\ | Move tab to other section |
| ⇧⌘R | Show/hide assets |
| ⌘? | This help |

*(Windows: ⌘ = Ctrl, ⌥ = Alt, ⇧ = Shift)*

## Shared editor and save conflicts

Desktop, iOS and IntelliJ use the same Merkzeug editor. Frontmatter is preserved and can be opened in the editor. Failed saves leave changes marked as unsaved. When external changes conflict with your edits, reload the external version or explicitly keep your own version.

## Mac App Store preview builds

Experimental Mac App Store builds request persistent access when you select a vault or PDF-template folder. If macOS revokes access or the folder moves, select it again. Store-build sandbox validation is still in progress.


## Support and feedback

Use **Help → Contact Support…** to open the support form with Merkzeug, your language, edition and app version selected. You can deselect the app details before sending. No note contents or file paths are attached automatically.

[Contact Merkzeug App Support](https://support.apps.creative-it.com/?app=merkzeug&lang=en). Include your app version, operating system and steps to reproduce the issue. Use fictional examples and avoid confidential notes.
