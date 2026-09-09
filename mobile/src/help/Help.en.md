# Merkzeug for iOS & iPadOS

The interface and this help use German on a German system and English otherwise. You can switch the help language independently.

Merkzeug displays and edits a **vault** – a folder full of Markdown
notes. On iPhone and iPad the app deliberately does not do Git itself:
cloning, committing, pushing and pulling is handled by the
**Working Copy** app; Merkzeug works directly on its folder.

## Opening a vault

1. Clone the repository you want in **Working Copy**.
2. In Merkzeug, tap **"Open vault folder"**.
3. In the file picker choose *Browse → Working Copy → \<repository\>*.

Merkzeug remembers the permission permanently – the vault is available
again right after an app restart. Use the **⌂** button to switch to a
different folder at any time. Any other folder from the Files app works
just as well as a Working Copy repository.

## Navigating

- The folder view lists subfolders and notes; tap an entry to open it.
- Links inside notes take you straight to the linked note or folder.
- **Back and forward**: with the ‹ › buttons at the top left – or by
  swiping from the left or right edge of the screen.
- **Search 🔍**: searches file names and the contents of all notes;
  tapping a result opens the note.

## Reading and editing

Notes open **read-only** – ideal for looking things up without
accidental changes. The pencil **✎** switches to edit mode:

- Saving happens automatically (shortly after the last input, when
  leaving the note, and when switching to another app). A dot • next to
  the title indicates unsaved changes.
- Typing "/" at the start of a line opens the insert menu (headings,
  lists, tables, images, code blocks …).
- Images from your photo library are stored automatically in the
  `assets/` subfolder next to the note when inserted.
- Mermaid code blocks show a diagram preview.

## Creating, renaming, deleting

- **＋** in the folder view creates a new note or folder. New notes open
  directly in edit mode.
- **Press and hold an entry** to open the menu with *Rename* and
  *Delete*. Deleting a folder removes its entire contents – in Working
  Copy this can be undone until the next commit.

## Syncing with Working Copy

- After a **pull** in Working Copy, simply switch back to Merkzeug – the
  folder list and open (unmodified) notes load the new state
  automatically. **↻** re-reads the vault manually at any time.
- **Commit and push** happen in Working Copy; Merkzeug does not show
  changed files itself.
- If a note was edited in Merkzeug **and** changed externally at the
  same time, Merkzeug asks on save whether your version should
  overwrite the external state or be discarded – nothing is ever lost
  silently.

## Limitations compared to the desktop app

- No tabs and no split views – one note at a time.
- No Git inside the app (see above – this is intentional).
- Very large images can slow down rendering.

## Shared editor and save conflicts

Desktop, iOS and IntelliJ use the same Merkzeug editor. Frontmatter is preserved and can be opened in the editor. Failed saves leave changes marked as unsaved. When external changes conflict with your edits, reload the external version or explicitly keep your own version.


## Support and feedback

[Contact Merkzeug App Support](https://support.apps.creative-it.com/?app=merkzeug&lang=en). Include your app version, operating system and steps to reproduce the issue. Use fictional examples and avoid confidential notes.
