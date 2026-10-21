# Editing Markdown

## Formatting

Type `/` at the start of a block for headings, lists, tables, images and code. Select text to use the formatting toolbar. Markdown remains the saved format; the first edit can normalize whitespace or table alignment. Merely opening a note should not rewrite it.

For Mermaid, insert a code block with the language `mermaid`. Use its preview controls to switch between source and diagram. Invalid Mermaid syntax must be corrected before exporting a successful diagram.

Paste or insert images using the editor's image controls. Desktop and IntelliJ store inserted images in a sibling `NOTE.assets` directory; the iOS adapter uses a sibling `assets` directory. Keep images with their notes when moving them between machines. Existing image paths are preserved.

## Callouts

A quote whose first line starts with `[!type]` is shown as a colored callout. The syntax matches Obsidian callouts and therefore also covers GitHub alerts such as `[!NOTE]` or `[!WARNING]`:

```markdown
> [!info] Optional title
> Content of the callout.

> [!faq]- Collapsed by default
> Shown after expanding.
```

Supported types are `note`, `abstract`, `info`, `todo`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `bug`, `example` and `quote`, including Obsidian's aliases (for example `summary`, `important`, `check`, `faq`, `caution`, `error` or `cite`). Types are case-insensitive; unknown types look like `note`. Without a title, the type name is shown.

A `-` after the marker starts the callout collapsed and a `+` starts it expanded; both show an arrow next to the title. Folding only changes the view, never the file. Click into the title line to see and edit the marker. Use **Callout** in the slash menu to insert one. PDF exports always print callouts expanded.

## Links and frontmatter

Use ordinary Markdown links such as `[Plan](plan.md)` or `[Section](plan.md#next-steps)`. Local link behavior varies by edition; IntelliJ currently restricts access to the project root.

Frontmatter is a YAML block at the beginning of a note. Merkzeug preserves it separately from the visible document body. Expand **Frontmatter** to edit it or use **+ Field** for supported keys.

```yaml
---
title: Project handbook
language: en
pdf-linked-title: Complete project handbook
pdf-toc: true
pdf-exclude:
  - drafts.md
---
```

`title` sets the document title. `pdf-linked-title` overrides it when exporting linked documents. `language` controls the PDF table-of-contents heading. `pdf-toc` enables that table of contents. `pdf-exclude` omits listed linked documents. Custom fields are retained without being interpreted. See the [PDF guide](pdf.md).

## Saving and conflicts

Desktop and mobile use autosave. IntelliJ accepts changes into its native document and controls when that document is saved to disk. Watch the dirty indicator and any error banner; a failed save is not a saved document.

When a file changes elsewhere:

- With no local edits, Merkzeug reloads it.
- With local edits, choose **Reload** to discard your local version, or **Keep my version** to explicitly replace the externally changed version.

Before choosing either version, copy any text you want to preserve. Conflicts can arise when switching editors, pulling from Git or syncing through a file provider. Keep backups or regular Git commits, especially when using previews.
