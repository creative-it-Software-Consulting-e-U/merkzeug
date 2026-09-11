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

## PDF template starter

Merkzeug ships a ready-to-use **Merkzeug** PDF template: a warm paper cover, serif headings, blue accents, page headers and numbered footers. In **Settings → Template for this vault**, select **Merkzeug**. Existing vaults keep their current selection, including **No template**. **Create** makes an editable copy under a new name; **Edit** opens its folder. Your changes are never overwritten by an app update. Changing the templates root makes the starter available there too, if the folder is writable.

Remove or rename `deckblatt.html` to omit the cover. Customize `stil.css` for document styles and `kopfzeile.html` / `fusszeile.html` for inline header/footer styles. Margins are in `vorlage.json`. Keep the German filenames and `{{titel}}` / `{{datum}}` placeholders; they are the shared template format. Put logo images in the template folder and reference them using relative paths. The template works in IntelliJ too: **PDF template…** opens the bundled starter folder initially when no other template is selected. PDF export is not yet available on iOS.

### Adapt a template with an agent

Create a copy first, then give the agent that folder and this prompt:

> Read README.md and all five template files in this folder. Adapt this copy to my visual style: [COLORS], [FONTS] and [LOCAL LOGO PATH]. Preserve the filenames, title/date placeholders and Chromium page-number spans. Keep header/footer CSS inline and document CSS scoped to PDF selectors. Use local assets, no scripts or network dependencies. Support A4 portrait and landscape without clipping. Update README.md to explain the changes. Validate by exporting notes with a long title, headings, links, code, a table and a diagram; inspect every page of the resulting PDFs.

The template README includes the full file-format reference and a reusable prompt. Export through Merkzeug to check the result: browser previews alone do not verify page breaks. The settings link **Template guide and agent prompt** opens this section of the online manual; the same instructions are also included in the app's offline help.

Template sources and full agent prompt: [Merkzeug starter](../../resources/pdf-templates/Merkzeug/README.md).

### Template styling prompt

Desktop Settings provides **Template styling prompt** for each template; expand it to review and copy a complete agent brief with the template's folder path. IntelliJ offers the same action in **Settings → Tools → Merkzeug**, using the folder currently shown in the settings field. On iOS, open **Help → Template styling prompt** and substitute the folder path on the agent's computer; iOS does not currently export PDFs or preview PDF template styles.

Replace the new template name and your colors, fonts, logo and design wishes before sending it. The prompt is in English, includes the complete offline technical reference, and works with older templates that lack instruction files. Copying it does not read note contents or modify existing templates. If clipboard access is unavailable in the web view, select and copy the displayed text manually.

New starter copies include `AGENTS.md` (format, CSS examples, placeholders, preview limitations and validation) and `STYLING-PROMPT.md` (reusable brief). Keep template-specific design choices in `README.md`. The brief instructs the agent to create a separate copy and preserve existing instructions. Existing desktop templates are not upgraded or overwritten. For manual use, concatenate STYLING-PROMPT.md and AGENTS.md and replace the template-path placeholder.
