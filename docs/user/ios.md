# iOS and iPadOS guide

The current iOS edition is a development preview. There is no public TestFlight invitation or generally installable iOS binary yet. Developers can build it using [Xcode](../../mobile/README.md). Future beta invitations will be linked from the release notes; a GitHub ZIP or unsigned IPA is not a general iPhone installer.

## Open a folder

1. Put Markdown notes in a folder accessible through the Files app. If using Git, clone your repository in Working Copy first.
2. Open Merkzeug and tap **Open vault folder**.
3. Select the folder in the system picker. For Working Copy, browse to its repository folder.

Merkzeug remembers the selected folder permission. Use the home button to choose another folder. If the provider moves the folder or revokes access, select it again.

## Read and edit

Notes open read-only. Tap the pencil to enable editing. Use back/forward buttons or edge swipes to navigate. Search finds notes by filename and content. Press and hold an item to rename or delete it; use **＋** to create a note or folder.

Edits save automatically. After a pull in Working Copy, return to Merkzeug or tap refresh. If local edits conflict with external changes, resolve the conflict before proceeding. Commit, push and pull in Working Copy; the Merkzeug mobile app does not perform Git operations.

PDF export is not implemented on iOS. Use the same vault in desktop Merkzeug or IntelliJ to export it. The app also has no desktop-style tabs or split panes. Large images may affect performance.

The [mobile reference manual](../../mobile/src/help/Help.en.md) is bundled in the app's Help view. See [editing](editing.md) for frontmatter and saving behavior.
