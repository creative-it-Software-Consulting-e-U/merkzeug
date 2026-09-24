# Changelog

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
