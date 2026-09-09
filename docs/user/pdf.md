# PDF export and templates

PDF export is available in the desktop app and IntelliJ plugin. It runs locally using the host's Chromium engine. It is not currently implemented on iOS.

## Export a note or a document set

On desktop, choose **File → Export as PDF…** or use **⌘P / Ctrl+P**. In IntelliJ, click **Export PDF**. Choose a destination and confirm replacement if that file exists.

When the current note links to eligible documents, you can export it with those documents appended. Selection includes directly linked Markdown files within the index note's folder hierarchy, sorted alphabetically by path. It does not recursively crawl links from every appended document. Links to included documents become PDF destinations.

Set `pdf-exclude` in the index note to exclude individual linked notes. Set `pdf-linked-title` for the combined export's title. Set `pdf-toc: true` to add a clickable table of contents after the optional cover, before the document content. Its heading follows the system language (German or English) unless the note specifies `language`. Use `language: en` to explicitly request an English heading.

The output is A4. Tables wider than the portrait content area trigger landscape output. Mermaid diagrams are rendered before printing and scaled to fit. Missing images or rendering failures can stop the export; see [troubleshooting](troubleshooting.md).

Desktop additionally supports selecting multiple notes in one folder and exporting each as a separate PDF through the context menu. IntelliJ currently exports one note or linked set at a time.

## Select a template

**Desktop:** Settings lets you choose the root templates folder, create a template, and assign it to a vault. The assignment is saved in `.merkzeug/settings.json`; the template files themselves must be available on each computer.

**IntelliJ:** **PDF template …** selects one template folder and remembers it per project. It does not import the desktop vault assignment automatically.

Each template is a folder. These filenames are retained for compatibility, even though the UI and documentation are English:

| File | Purpose |
| --- | --- |
| `kopfzeile.html` | Page header |
| `fusszeile.html` | Page footer |
| `deckblatt.html` | Optional cover page |
| `stil.css` | Additional document styles |
| `vorlage.json` | Page margins in millimetres |

All files are optional. Put logos inside the template folder and reference them with relative image URLs. Use inline CSS for headers and footers: those run in Chromium's separate print context.

```html
<div style="font-family:Arial;font-size:9px;width:100%;text-align:center">
  {{titel}} — Page <span class="pageNumber"></span> of <span class="totalPages"></span>
</div>
```

`{{titel}}` is the escaped export title: frontmatter title, otherwise the first H1, otherwise the filename. A combined export prefers `pdf-linked-title`. `{{datum}}` is the export date in the existing `DD.MM.YYYY` format. The German placeholder names remain compatible.

Example `vorlage.json`:

```json
{"margins":{"top":24,"bottom":18,"left":15,"right":15}}
```

For landscape-specific styles, target `html.pdf-landscape` in `stil.css`. Different host Chromium versions can produce slightly different pagination; compare the final PDF before distributing an important document.
