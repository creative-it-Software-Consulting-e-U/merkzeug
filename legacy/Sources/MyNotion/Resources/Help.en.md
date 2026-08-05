# MyNotion – Help

MyNotion is a native macOS editor for Markdown notes in the style of Notion:
you edit your notes **WYSIWYG** (formatted, without visible Markdown syntax),
but everything is saved as clean, portable Markdown. All notes live as `.md`
files in an ordinary folder – the **vault**.

---

## 1. Getting Started

- On first launch you pick a **vault folder** (any folder containing Markdown
  files). The choice is remembered.
- Use **File → Open Vault…** (⌘O) to switch the vault of the current window.
- **File → Recently Opened Vaults** lists the last ten vaults for quick switching;
  “Clear entries” empties the list.
- **Autosave:** changes are saved automatically one second after the last edit,
  and additionally when closing tabs or quitting the app.
  Manually: **⌘S** (active note) or **⌥⌘S** (all open notes).
- The vault can also be preset via the `MYNOTION_VAULT` environment variable.

## 2. Sidebar & File Tree

The sidebar on the left shows the vault as a hierarchical tree.

- **Click a note** to open it in a tab; click a folder to expand/collapse it.
- **Context menu** (right-click): open overview, new note, new folder, rename,
  move to Trash, show in Finder.
- **Moving:** simply drag & drop files and folders onto a folder.
- **Folder overview:** “Open overview” shows a folder's contents as its own tab
  with a header (name, path, number of entries).
- The buttons at the bottom of the sidebar: new note, new folder, rescan the tree,
  and the eye icon to show/hide **resource folders** (⇧⌘R).
- Changes made to the vault outside the app (Finder, terminal, sync) are detected
  automatically.

## 3. Tabs, Sections & Windows

- Every note opens in its own **tab**; **⌘W** closes the active tab.
- **Two sections** side by side: **⌘\** splits the editor area. Drag tabs onto the
  other section or move them with **⇧⌘\**.
- **Multiple windows:** **⌥⌘N** opens a new window (it initially inherits the vault
  of the current window; with ⌘O each window can show a different vault).

## 4. Editor & Formatting

The editor shows the note fully formatted; what is saved is Markdown.

- **Character formats:** bold (⌘B), italic (⌘I), strikethrough (⇧⌘X),
  inline code (⌘E).
- **Paragraph formats:** plain text (⌘0), headings 1–3 (⌘1–⌘3), quote (⇧⌘9),
  code block (⌥⌘C), horizontal rule (toolbar).
- **Lists:** bulleted (⇧⌘8) and numbered (⇧⌘7); nest with Tab/⇧Tab, automatic
  continuation on Enter and automatic renumbering.
- **Auto-formatting while typing:** `# `, `## `, `- `, `1. `, `> ` at the start of
  a line, and ` ``` ` + Enter create the respective format immediately.
- **Tables:** insert via toolbar or ⌥⌘T. Jump from cell to cell with Tab
  (last cell + Tab = new row); insert and delete rows/columns via the toolbar's
  table menu or the context menu.
- **Images:** paste from the clipboard, drag & drop, or insert via toolbar.
- **Undo/Redo** as usual (⌘Z / ⇧⌘Z).

## 5. Links

- **⌘K** opens the link sheet for inserting or editing a formatted link.
- Possible targets: `https://…` addresses, paths **relative to the current file**,
  paths **relative to the vault root**, absolute paths, and `~` paths.
- **Links to `.md` files** open the note in a tab. **Links to folders** expand the
  folder in the sidebar and open the folder overview. External links open in the
  browser or the default application.

## 6. Navigation Mode (Reading & Browsing)

For browsing linked notes there is a per-tab **navigation mode** – toggled with
**⌘R**, via **View → Navigation Mode**, or the book icon on the right of the
editor toolbar.

- In navigation mode the note is **read-only**; clicking vault links loads the
  target **in the same tab** (instead of opening a new tab).
- **Folder links** stay in the same tab too: the tab shows the folder overview,
  and clicking its entries also navigates within the same tab (the context menu
  still offers “Open in new tab”). When you leave the mode, the tab shows the
  most recently loaded note again.
- **Back/Forward:** arrow buttons on the left of the toolbar, **⌘[** / **⌘]**,
  three-finger swipe (according to the system setting “Swipe between pages”), or
  mouse buttons 4/5.
- The **history is kept per tab**, even if you leave the mode, edit the note, and
  re-enable the mode later.
- Outside navigation mode the back/forward buttons are grayed out and links behave
  as usual.

## 7. Mermaid Diagrams

- Code blocks with the language `mermaid` are **rendered as diagrams** directly in
  the editor (offline; mermaid.js is bundled with the app).
- **Click a diagram** to see its source as a code block; when the cursor leaves the
  block, the diagram is shown again. The file always keeps the ` ```mermaid `
  block.
- **Zoom preview:** the magnifier (appears when hovering over a diagram), ⌘-click,
  or the context menu open a separate window – zoom with a pinch gesture or the
  **+/−/0** keys, close with **Esc**.

## 8. Image Resources

- Every note has its own resource folder **`NoteName.assets/`** next to the file;
  inserted images are stored there.
- **Renaming** the note renames the folder as well (including the image paths
  inside the note), **moving** takes it along, **deleting** moves it to the Trash
  too.
- Resource folders are hidden in the file tree by default (⇧⌘R shows them).

## 9. Git Integration

If the vault is a **Git repository**, a status line appears at the bottom of the
sidebar:

- **Branch name**, number of changed files (orange dot), **n↑** = local commits not
  yet pushed (orange), **n↓** = new commits on the server, green check mark =
  everything committed and pushed.
- The status updates automatically – even when you commit or pull outside the app.
- **Clicking the status line** opens a panel with details: the list of changed
  files (M = modified, A = added, D = deleted, R = renamed, ? = untracked,
  ! = conflict), an input field for the commit message, and the **Pull** and
  **Commit & Push** buttons.
- **Commit & Push** first saves all open notes, then runs `git add`, commit, and
  push. If there is nothing left to commit but there are unpushed commits, the
  button reads **Push**. Without a configured upstream it is set automatically;
  without any remote, only a local commit is created (with a notice).
- **Pull** fetches changes from the server. On merge conflicts an error message is
  shown and the affected files are listed with **!**; resolve the conflicts
  outside the app.
- The app uses your system's Git credentials (SSH key or credential helper). If an
  interactive login would be required, the operation fails with an error message
  instead of hanging.

## 10. Keyboard Shortcuts

| Shortcut | Function |
| --- | --- |
| ⌘N | New note |
| ⇧⌘N | New folder |
| ⌥⌘N | New window |
| ⌘O | Open vault |
| ⌘W | Close tab |
| ⌘S / ⌥⌘S | Save / Save all |
| ⌘B / ⌘I / ⇧⌘X / ⌘E | Bold / Italic / Strikethrough / Inline code |
| ⌘0 … ⌘3 | Text / Heading 1–3 |
| ⇧⌘8 / ⇧⌘7 | Bulleted / Numbered list |
| ⇧⌘9 / ⌥⌘C | Quote / Code block |
| ⌘K | Insert/edit link |
| ⌥⌘T | Insert table |
| ⌘R | Toggle navigation mode |
| ⌘[ / ⌘] | Back / Forward (navigation mode) |
| ⌘\ | Show/hide second section |
| ⇧⌘\ | Move tab to other section |
| ⇧⌘R | Show/hide resources |
