# iOS and iPadOS guide

The current iOS edition is a development preview. There is no public TestFlight invitation or generally installable iOS binary yet. Developers can build it using [Xcode](../../mobile/README.md). Future beta invitations will be linked from the release notes; a GitHub ZIP or unsigned IPA is not a general iPhone installer.

## Open a folder

1. Put Markdown notes in a folder accessible through the Files app. If using Git, clone your repository in Working Copy first.
2. Open Merkzeug and tap **Open vault folder**.
3. Select the folder in the system picker. For Working Copy, browse to its repository folder.

Merkzeug remembers the selected folder permission. Use the home button to choose another folder. If the provider moves the folder or revokes access, select it again.

## Read and edit

Notes open read-only. Tap the pencil to enable editing. Use back/forward buttons or edge swipes to navigate. Search finds notes by filename and content. Close it with **Done** in the search bar or on the keyboard, even with an empty query; Escape also works on an external keyboard. Press and hold an item to rename or delete it; use **＋** to create a note or folder.

Edits save automatically. After a pull in Working Copy, return to Merkzeug or tap refresh. If local edits conflict with external changes, resolve the conflict before proceeding. Commit, push and pull in Working Copy; the Merkzeug mobile app does not perform Git operations.

PDF export is not implemented on iOS. Use the same vault in desktop Merkzeug or IntelliJ to export it. The app also has no desktop-style tabs or split panes. Large images may affect performance.

The [mobile reference manual](../../mobile/src/help/Help.en.md) is bundled in the app's Help view. See [editing](editing.md) for frontmatter and saving behavior.

## Appearance, tours and agent guidance

Choose **System**, **Light** or **Dark** for appearance. System follows the operating system (the IDE in IntelliJ); your choice is saved. The **Guided tour** starts only after you accept the first-use invitation and can be reopened at any time.

When opening a vault, Merkzeug can suggest root `AGENTS.md` / `CLAUDE.md` instructions for `Note.md` and `Note.assets/`. Review the single proposed text and the full contents of both instruction files. Select the destination files explicitly before choosing **Add**; none is preselected. For example, leave `CLAUDE.md` unchanged when it only redirects to `AGENTS.md`. Missing files are created only when selected. **Later** postpones it for the current session; **Do not suggest again for this vault** suppresses future prompts for that vault. Contradictory or unclear attachment rules require manual review. Concurrent external changes are preserved and require a refreshed preview. Existing shared `assets/` references remain readable.

## Calendar sources

**New meeting note** offers calendar selection. Expand **Calendar sources** to import an `.ics` file or add a named private HTTPS/Webcal subscription. Subscriptions are saved on this device, never in the vault. **Refresh calendars** downloads changes; an error retains the previous snapshot and shows its saved time. Reimporting the same named ICS file updates its source without duplicating notes. Choose an event to create or reopen its meeting note; existing note text is never replaced. CalDAV and calendar write-back are not supported.

On iPhone and iPad, native iOS calendars are also available. Access is requested only when opening meeting notes. If denied, enable calendar access for Merkzeug in iOS Settings. The app reads events without modifying the calendar. New images use `Note.assets/`; moving/renaming a note through Merkzeug moves its companion folder and adjusts its references. Existing shared `assets/` folders are left intact.

Expand **Working Copy** and enter the exact repository name/remote URL and its callback key. The key stays in this device's Keychain. Pending writes are flushed before **Pull**, **Commit** or **Push**. Commit opens Working Copy's change review and message dialog for the repository. Push needs Working Copy's unlocked push feature. Resolve conflicts and credentials in Working Copy. Opening that app is not success: wait for its callback. After interruption or a missing callback, inspect the result there before acknowledging it and starting another operation.

Meeting notes are created in the current vault folder, or beside the open note. Selecting a calendar event also works at the root of a vault selected through Files; existing meeting notes are reopened without replacing their contents.
