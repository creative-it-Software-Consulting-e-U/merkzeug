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

Close search with **Done** above the results or **Done** on the keyboard, including when the search field is empty. An external keyboard can also use Escape.

## Reading and editing

Notes open **read-only** – ideal for looking things up without
accidental changes. The pencil **✎** switches to edit mode:

- Saving happens automatically (shortly after the last input, when
  leaving the note, and when switching to another app). A dot • next to
  the title indicates unsaved changes.
- Typing "/" at the start of a line opens the insert menu (headings,
  lists, tables, images, code blocks …).
- Images from your photo library are stored automatically in the
  `NoteName.assets/` folder next to `NoteName.md` when inserted.
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

Open **Help** and choose **Contact Support…** to open the support form with Merkzeug, your language, edition and app version selected. You can deselect the app details before sending. No note contents or file paths are attached automatically.

[Contact Merkzeug App Support](https://support.apps.creative-it.com/?app=merkzeug&lang=en). Include your app version, operating system and steps to reproduce the issue. Use fictional examples and avoid confidential notes.

## PDF templates on desktop

The desktop app and IntelliJ include the Merkzeug PDF starter template, with a cover, styled headings and numbered pages. Create a copy to adapt it with an agent. See the [desktop template guide](https://merkzeug.creative-it.com/help-en.html#pdf-template-starter). PDF export is not available on iOS yet.

## Appearance, tours and agent guidance

Choose **System**, **Light** or **Dark** for appearance. System follows the operating system (the IDE in IntelliJ); your choice is saved. The **Guided tour** starts only after you accept the first-use invitation and can be reopened at any time.

When opening a vault, Merkzeug can suggest root `AGENTS.md` / `CLAUDE.md` instructions for `Note.md` and `Note.assets/`. Review the single proposed text and the full contents of both instruction files. Select the destination files explicitly before choosing **Add**; none is preselected. For example, leave `CLAUDE.md` unchanged when it only redirects to `AGENTS.md`. Missing files are created only when selected. **Later** postpones it for the current session; **Do not suggest again for this vault** suppresses future prompts for that vault. Contradictory or unclear attachment rules require manual review. Concurrent external changes are preserved and require a refreshed preview. Existing shared `assets/` references remain readable.

## Calendar sources

**New meeting note** offers calendar selection. Expand **Calendar sources** to import an `.ics` file or add a named private HTTPS/Webcal subscription. Subscriptions are saved on this device, never in the vault. **Refresh calendars** downloads changes; an error retains the previous snapshot and shows its saved time. Reimporting the same named ICS file updates its source without duplicating notes. Choose an event to create or reopen its meeting note in the current vault folder (or beside the currently open note); existing note text is never replaced. CalDAV and calendar write-back are not supported.

On iPhone and iPad, native iOS calendars are also available. Access is requested only when opening meeting notes. If denied, enable calendar access for Merkzeug in iOS Settings. The app reads events without modifying the calendar. New images use `Note.assets/`; moving/renaming a note through Merkzeug moves its companion folder and adjusts its references. Existing shared `assets/` folders are left intact.

Expand **Working Copy** and enter the exact repository name/remote URL and its callback key. The key stays in this device's Keychain. Pending writes are flushed before **Pull**, **Commit** or **Push**. Commit opens Working Copy's change review and message dialog for the repository. Push needs Working Copy's unlocked push feature. Resolve conflicts and credentials in Working Copy. Opening that app is not success: wait for its callback. After interruption or a missing callback, inspect the result there before acknowledging it and starting another operation.

### Template styling prompt

Desktop Settings provides **Template styling prompt** for each template; expand it to review and copy a complete agent brief with the template's folder path. IntelliJ offers the same action in **Settings → Tools → Merkzeug**, using the folder currently shown in the settings field. On iOS, open **Help → Template styling prompt** and substitute the folder path on the agent's computer; The same prompt is available under **PDF templates**. iOS can preview template content styles; saving a PDF file is not yet available.

Replace the new template name and your colors, fonts, logo and design wishes before sending it. The prompt is in English, includes the complete offline technical reference, and works with older templates that lack instruction files. Copying it does not read note contents or modify existing templates. If clipboard access is unavailable in the web view, select and copy the displayed text manually.

New starter copies include `AGENTS.md` (format, CSS examples, placeholders, preview limitations and validation) and `STYLING-PROMPT.md` (reusable brief). Keep template-specific design choices in `README.md`. The brief instructs the agent to create a separate copy and preserve existing instructions. Existing desktop templates are not upgraded or overwritten. For manual use, concatenate STYLING-PROMPT.md and AGENTS.md and replace the template-path placeholder.


### License

Merkzeug is proprietary software for private and internal business use. The full End User License Agreement is included at the end of the in-app help and is also available on the [website](https://merkzeug.creative-it.com/license-en.html). Third-party components retain their own licenses.


## Printing

Open a note and tap **Print…**. After the preview has finished preparing, tap **Print…** to open AirPrint and choose a printer, page range and copies. Pending edits are saved first. The current note is printed with its Mermaid diagrams and images. A selected template supplies content styles and a cover. AirPrint also applies template headers, footers, page numbers and custom margins. These appear in the native AirPrint preview; the preceding content preview is not paginated. Linked-document printing is not supported on iOS. Cancel AirPrint to return to the preview; **Close** returns to your note.

## PDF templates on iOS

Open **PDF templates → Change…** and choose the folder containing your template subfolders in Files, for example an existing folder in iCloud Drive. Select **Template for this vault**. This choice is saved in `.merkzeug/settings.json` and travels with the vault; the template folder is remembered separately on this device. Select **No template** to use the standard layout.

Enable **Use PDF template while editing** to apply its content styles, including light Mermaid diagrams. The preference is remembered for this vault on this device. **Refresh** reads template changes; returning to the app also refreshes them. Cloud files must be available from their provider. An unavailable template shows an error; printing does not silently replace it with another template.

By default, Merkzeug uses **iCloud Drive → Merkzeug → Templates** and installs the starter template if it is missing. Sign in to iCloud and enable iCloud Drive. The same Apple account must be used on your devices. **Use Merkzeug iCloud templates** returns from a manually selected folder to this shared location. When iCloud is unavailable, you can still choose an existing folder through Files; unavailable templates are reported instead of silently replaced.
