# Changelog

- Correct company register number to FN 473229 a and VAT ID to ATU61645777. Publish the shared proprietary End User License Agreement in English and German.

User-visible changes are recorded here. Versions follow `VERSION`; version tags use `vX.Y.Z` or `vX.Y.Z-beta.N` (also `alpha` and `rc`). An entry does not imply binaries have been published.

## Unreleased

### Added

- A styled Merkzeug PDF starter template for desktop and IntelliJ, with a cover, headers, footers, document styles and an agent customization guide.

- Shared editor and PDF packages used by desktop, iOS and the IntelliJ preview.
- IntelliJ visual Markdown editing, native document synchronization, conflict checks, undo/redo, saving and PDF export.
- English-first project documentation and edition-specific user guides.
- German UI localization selected from the system/host language, with English fallback.
- Version consistency checks, CI checks and a draft-release workflow with binaries, documentation and SHA-256 checksums.

### Changed

- Dependencies now use one npm workspace lockfile at the repository root.
- PDF output waits for document rendering, images and fonts before printing.

### Known limitations

- IntelliJ dark-theme contrast is incomplete, including file dialogs.
- IntelliJ cross-document heading navigation and integration with desktop vault template assignments are incomplete.
- iOS PDF export and VS Code support are not implemented.
- Native iOS, Windows and Linux regression testing and the first hosted release workflow run are still required before a public release.
