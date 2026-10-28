# Changelog

## Unreleased

- Tables: while the caret is in a table, a table bar below the toolbar inserts rows above/below and columns left/right, aligns the current column and deletes the row, column or table — on desktop, iOS, IntelliJ and VS Code. **Delete Row** and **Delete Column** in the Table menus now work at the caret instead of requiring selected cells; the header row and the last data row are protected.
- Tables: Tab in the last cell and Enter in the last row add a new row; Enter moves to the cell below instead of leaving the table, and Enter in an empty last row removes it and continues below the table.
- Desktop and iOS: **Markdown source** view (desktop: `</>` button, **View → Markdown Source**, ⌘/ / Ctrl+/; iOS: `</>` in the title bar) to read and edit the note's Markdown including frontmatter. Switching views never reformats the file.
- Mac App Store: the AI assistant can use Claude Code and Codex with their own login after a one-time approval in the assistant panel or **Settings → AI assistant** (**Allow…** saves a small launcher in Merkzeug's Application Scripts folder); before, the sandbox hid these CLIs or blocked their login.

## 1.4.0

- Desktop: **AI assistant** panel (⇧⌘A) for Mermaid diagrams, summaries, rewrites and tables with one-click insertion into the note. Backends: Anthropic API and OpenAI API with your own key, or the locally installed Claude Code and Codex CLIs with their existing login. Mermaid answers are validated and repaired automatically before they are offered.
- Desktop: the AI assistant can list, search and read the vault's text files (**Read vault**, on by default) and, with **Allow editing** for the current session, create and change them. Requests that need editing while it is off offer **Allow editing and send again**. Paths are confined to the vault (no `..`, hidden or ignored folders, or escaping symbolic links); the hosted APIs use Merkzeug's own tools, the Claude Code and Codex CLIs work in the vault folder with read-only tools or, with editing, write inside the vault only. Every read and changed file is listed per answer, and **Undo changes** restores them.
- Desktop: **Settings → Calendars** shows the system calendar (macOS Calendar access and accounts, classic Outlook on Windows) with buttons to allow access or open System Settings; the meeting dialog links to System Settings when access is off.
- Desktop: the file tree context menu offers **Copy path** (vault-relative or absolute) and, on folders, **New meeting note…** for that folder.
- iOS: press and hold an entry to copy its vault-relative path; folders offer **New meeting note…** for that folder.
- IntelliJ: **New → Merkzeug Meeting Note…** creates meeting notes from calendar sources and, on Windows, classic Outlook.
- IntelliJ on macOS: ⌘←/→, ⌘↑/↓, ⌥←/→ and ⌘⌫/⌥⌫ move and delete as in other Mac apps.
- The caret stays at the end of a soft-wrapped line after ⌘→ instead of jumping to the next line.
- Visual Studio Code extension with the same features as the IntelliJ plugin: visual editing of the VS Code document with native saving and undo, `.assets` companion folders and link updates on rename/move, PDF export and printing with templates via an installed Chromium browser, vault and central templates, template styling prompts, agent guidance, release notes and support. Settings use VS Code's Settings editor (`merkzeug.*`).
- IntelliJ and VS Code share one IDE web shell (`@merkzeug/ide`); a parity test keeps their bridge requests identical.
- Obsidian callouts and GitHub alerts (`> [!note]`, `> [!warning]` …) render as colored, foldable boxes; the slash menu inserts them and PDF exports print them expanded.
- Raw HTML `<img>` tags display as images (with width, height and centering) in the editor and PDF export; note moves and renames update their paths.
- Clicking an image shows a toolbar to switch between a Markdown image and an HTML `<img>` tag and, for HTML images, to set width, height (with aspect-ratio lock) and left/center/right alignment. A new setting inserts new images as `<img>` tags: per app on every edition and per vault via `"imageInsert"` in `.merkzeug/settings.json` (VS Code: `merkzeug.editor.insertImagesAsHtml`).
- Mermaid 12, Electron 44.9, Capacitor 8.5.3 and current Milkdown/React releases.
- Security updates for bundled and build dependencies, including DOMPurify 3.4.17 (Mermaid) and KaTeX 0.18.10 (Markdown math parsing), plus fast-uri, xmldom, js-yaml, undici, uuid, brace-expansion and Vite in the build tools.
- PDF export no longer fails with “The source image cannot be decoded” when a document contains inline HTML such as `<details>`; a broken image no longer aborts the whole export.

## 1.3.0

- Merkzeug is now open source under the MIT License.
- About views show the license, website and creative-it Software & Consulting e.U. copyright across editions.

## 1.2.0

- Choose central or vault-relative PDF templates in the PDF controls across desktop, iOS and IntelliJ. Shared vault settings live in `.merkzeug/settings.json`.
- iPhone and iPad export and print single or linked Markdown documents using PDF templates and frontmatter, including covers, headers, footers and a table of contents.
- All editions offer the full English/German release history and show new-version notes on first launch. Apps and website use `website/release-notes.json` as the common source.
- Bilingual website and guides explain vaults, platform availability, PDF workflows, assets, agents and Working Copy. Release notes replace roadmap status groups.

## Earlier development history

- Prepare the proprietary Marketplace preview: shared English/German EULA, plugin logo and metadata, public IntelliJ APIs, and a package without the unpublished tour.

- Shared offline template styling kit with CSS examples, agent instructions and copyable prompts in desktop settings, IntelliJ settings and iOS help; existing templates remain intact.

- PDF editing preview: remove the dark code-block background behind transparent Mermaid diagrams, including in IntelliJ.

- IntelliJ Move/Rename includes a Markdown note’s companion `.assets` directory, with collision checks, link updates and native undo/redo.

- IntelliJ: include the frontmatter area in the light PDF template preview surface.

- Mermaid diagrams follow the light PDF theme while template editing styles are active and restore the host theme when disabled.

- IntelliJ: discover desktop PDF templates in standard and custom locations; choose a shared template directly in project settings.

- IntelliJ: optional project-specific PDF content styles while editing, using the shared desktop style filter. Existing desktop template folders can be selected directly.

- Instruction guidance now previews both existing files and one shared addition, with explicit destination selection. IntelliJ extra actions share a consistent row above the guidance banner.

- IntelliJ: PDF export uses an IDE dialog listing linked documents, explicit export choices and a real cancel action.

- IntelliJ: compact formatting toolbar, IDE appearance, project PDF settings and IDE file choosers; removed calendar creation and redundant toolbar actions.

User-visible changes are recorded here. Versions follow `VERSION`; version tags use `vX.Y.Z` or `vX.Y.Z-beta.N` (also `alpha` and `rc`). An entry does not imply binaries have been published.

## Unreleased

- Prepare MIT licensing across source, bundled applications, plugin metadata and website; public repository launch remains a separate step.

### Fixed

- iOS search/help toolbars no longer inherit the editor search popup layout, keeping Done reachable.
- iOS search can be dismissed with keyboard Done even with an empty query; cleared searches no longer show late results from previous queries.

### Added

- System, light and dark appearance across desktop, iOS and IntelliJ, including diagrams.
- Shared ICS imports and HTTPS/Webcal subscriptions, with meeting notes and native iOS Calendar access.
- Explicit Working Copy pull, commit and push actions on iOS with protected configuration and callback handling.
- Confirmed AGENTS.md/CLAUDE.md attachment guidance, first-use tours and a bundled German desktop tour video.
- Optional PDF-template content styling in the desktop editor.

- A styled Merkzeug PDF starter template for desktop and IntelliJ, with a cover, headers, footers, document styles and an agent customization guide.

- Shared editor and PDF packages used by desktop, iOS and the IntelliJ preview.
- IntelliJ visual Markdown editing, native document synchronization, conflict checks, undo/redo, saving and PDF export.
- English-first project documentation and edition-specific user guides.
- German UI localization selected from the system/host language, with English fallback.
- Version consistency checks, CI checks and a draft-release workflow with binaries, documentation and SHA-256 checksums.

### Changed

- iOS image attachments now use adjacent `Note.assets/` directories, matching desktop and IntelliJ; existing shared asset links remain readable.

- Dependencies now use one npm workspace lockfile at the repository root.
- PDF output waits for document rendering, images and fonts before printing.

### Known limitations

- IntelliJ cross-document heading navigation remains limited.
- VS Code support is not implemented.
- Native iOS, Windows and Linux regression testing and the first hosted release workflow run are still required before a public release.
