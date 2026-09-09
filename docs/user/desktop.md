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

Git commands operate on the vault repository. Inspect the selected files and commit message before using **Commit & Push**; use **Pull** to receive changes. Merkzeug does not resolve every Git conflict for you: use your preferred Git client when necessary.

The calendar button creates notes from locally configured calendars on macOS or classic Outlook on Windows. It is not available on Linux or with new Outlook. Calendar access may require an OS permission prompt.

## Detailed reference

The [desktop reference manual](../../crossplatform/resources/help/Help.en.md) is also bundled in **Help → Merkzeug Help**. It contains all formatting commands, keyboard shortcuts, image behavior, meeting notes and file navigation details.

Continue with [editing](editing.md) and [PDF export](pdf.md).

## Mac App Store preparation

A sandboxed Mac App Store build is being prepared; it is not published yet. The experimental build stores access bookmarks for selected vault and PDF-template folders. Select a folder again if access is revoked or the folder moves. Git, calendar helpers and PDF export still require signed sandbox acceptance testing.
