# Desktop guide

## Install

Choose a file for your operating system and CPU from a published [release](https://github.com/creative-it-Software-Consulting-e-U/merkzeug/releases). Preview availability can differ by release.

| Platform | File | Installation |
| --- | --- | --- |
| macOS, Apple silicon | `Merkzeug-VERSION-mac-arm64.dmg` | Open the disk image and drag Merkzeug to Applications |
| macOS, Intel | `Merkzeug-VERSION-mac-x64.dmg` | Open the disk image and drag Merkzeug to Applications |
| Windows, Intel/AMD | `Merkzeug-VERSION-win-x64.exe` | Run the installer |
| Windows, ARM | `Merkzeug-VERSION-win-arm64.exe` | Run the installer |
| Linux, x64 | `.AppImage`, `.deb` or `.rpm` | Use the package for your distribution, or make the AppImage executable and launch it |

Release notes state whether binaries are signed/notarized or unsigned previews. If your OS blocks a download, check its source and release notes rather than disabling security protections globally. [Troubleshooting](troubleshooting.md) explains what to include in a report.

For an update, quit Merkzeug and install the newer version. Notes live in your vault and are separate from the application. Keep a backup or Git commit before testing a preview. Automatic application updates are not implemented.

## First session

1. Choose a folder containing `.md` files, or create an empty folder for your notes.
2. Open a note in the sidebar, or use **File → New Note**.
3. Type text. Select text to format it, or type `/` to insert headings, tables, lists, images or code blocks.
4. Changes are saved automatically after a short delay. **⌘S / Ctrl+S** saves explicitly.
5. Use **File → Export as PDF…** to create a PDF.

Use **File → Open Vault…** to switch folders, or **Recent Vaults** to reopen one. Notes can be organized in subfolders. Right-click an item to rename it, create items or move it to the trash.

## Reading, navigation and Git

Navigation mode makes the editor read-only and follows note links in the current tab. Back/forward navigation restores your reading position. Tabs, two panes and separate windows are available on desktop.

Desktop Git features require a working Git installation. If the sidebar reports **Git is unavailable**, use **Git setup**, then **Check again** after installation. See [troubleshooting](troubleshooting.md#git-is-unavailable).

Git commands operate on the vault repository. Inspect the selected files and commit message before using **Commit & Push**; use **Pull** to receive changes. Merkzeug does not resolve every Git conflict for you: use your preferred Git client when necessary.

The calendar button creates notes from locally configured calendars on macOS or classic Outlook on Windows. On Linux and with new Outlook, import ICS files or add HTTPS/Webcal subscriptions under **Calendar sources**. Calendar access may require an OS permission prompt. Meeting-note headings and date labels follow the app language; event titles and participant names remain unchanged.

## Detailed reference

The [desktop reference manual](../../crossplatform/resources/help/Help.en.md) is also bundled in **Help → Merkzeug Help**. It contains all formatting commands, keyboard shortcuts, image behavior, meeting notes and file navigation details.

Continue with [editing](editing.md) and [PDF export](pdf.md).

## Mac App Store preparation

A sandboxed Mac App Store build is being prepared; it is not published yet. The experimental build stores access bookmarks for selected vault and PDF-template folders. Select a folder again if access is revoked or the folder moves. Git, calendar helpers and PDF export still require signed sandbox acceptance testing.

## Appearance, tours and agent guidance

Choose **System**, **Light** or **Dark** for appearance. System follows the operating system (the IDE in IntelliJ); your choice is saved. The **Guided tour** starts only after you accept the first-use invitation and can be reopened at any time.

When opening a vault, Merkzeug can suggest root `AGENTS.md` / `CLAUDE.md` instructions for `Note.md` and `Note.assets/`. Review the single proposed text and the full contents of both instruction files. Select the destination files explicitly before choosing **Add**; none is preselected. For example, leave `CLAUDE.md` unchanged when it only redirects to `AGENTS.md`. Missing files are created only when selected. **Later** postpones it for the current session; **Do not suggest again for this vault** suppresses future prompts for that vault. Contradictory or unclear attachment rules require manual review. Concurrent external changes are preserved and require a refreshed preview. Existing shared `assets/` references remain readable.

## Calendar sources

**New meeting note** offers calendar selection. Expand **Calendar sources** to import an `.ics` file or add a named private HTTPS/Webcal subscription. Subscriptions are saved on this device, never in the vault. **Refresh calendars** downloads changes; an error retains the previous snapshot and shows its saved time. Reimporting the same named ICS file updates its source without duplicating notes. Choose an event to create or reopen its meeting note; existing note text is never replaced. CalDAV and calendar write-back are not supported.

In **Settings**, select the PDF template for this vault. Enable **Use PDF template while editing** in the bottom bar to preview its document typography and colors. Disable it to return to the editor theme. Only `.pdf-content` content rules are reused; cover pages, page furniture, print layout and application-wide CSS are excluded. This is a formatting preview, not a paginated PDF proof. PDF export keeps the complete original template and print colors. Linux needs a system keyring for private subscriptions; ICS files can be imported without one.

Mermaid diagrams use the document background instead of a dark code-block panel and switch to the light PDF theme when PDF template editing styles are active, and return to the application theme when the preview is disabled.
