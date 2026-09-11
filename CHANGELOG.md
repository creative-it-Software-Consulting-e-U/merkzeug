# Changelog

- IntelliJ: include the frontmatter area in the light PDF template preview surface.

- Mermaid diagrams follow the light PDF theme while template editing styles are active and restore the host theme when disabled.

- IntelliJ: discover desktop PDF templates in standard and custom locations; choose a shared template directly in project settings.

- IntelliJ: optional project-specific PDF content styles while editing, using the shared desktop style filter. Existing desktop template folders can be selected directly.

- Instruction guidance now previews both existing files and one shared addition, with explicit destination selection. IntelliJ extra actions share a consistent row above the guidance banner.

- IntelliJ: PDF export uses an IDE dialog listing linked documents, explicit export choices and a real cancel action.

- IntelliJ: compact formatting toolbar, IDE appearance, project PDF settings and IDE file choosers; removed calendar creation and redundant toolbar actions.

User-visible changes are recorded here. Versions follow `VERSION`; version tags use `vX.Y.Z` or `vX.Y.Z-beta.N` (also `alpha` and `rc`). An entry does not imply binaries have been published.

## Unreleased

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

- IntelliJ cross-document heading navigation and integration with desktop vault template assignments are incomplete.
- iOS PDF export and VS Code support are not implemented.
- Native iOS, Windows and Linux regression testing and the first hosted release workflow run are still required before a public release.
