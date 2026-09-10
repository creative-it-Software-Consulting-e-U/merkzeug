# Merkzeug PDF starter template

A warm paper palette, serif headings and blue accents, matching the Merkzeug website.
Works with desktop and IntelliJ PDF export; iOS does not export PDFs yet.

## Use and customize

On desktop, select **Merkzeug** under **Settings → Template for this vault**.
**Create** makes a separate editable copy under your chosen name. **Edit** opens
its folder. Existing templates and vault assignments are never overwritten.
In IntelliJ, select this folder using **PDF template…**.

- `kopfzeile.html`: header (inline CSS required)
- `fusszeile.html`: footer (inline CSS required)
- `deckblatt.html`: cover; remove or rename to disable
- `stil.css`: document styles, scoped to `.pdf-app` / `.pdf-content`
- `vorlage.json`: page margins in millimetres

`{{titel}}` is the escaped document title; `{{datum}}` is the export date.
`pageNumber` and `totalPages` are Chromium header/footer span classes.
Keep these filenames and placeholders unchanged. Put logos in this folder and
use relative image paths. Use local fonts and images; do not depend on web fonts.
`html.pdf-landscape` handles wide tables. Do not set a fixed height or hidden
overflow on document content. Headers and footers also appear on the cover.

## Suggested prompt for an agent

> Create a new Merkzeug PDF template based on the files in this folder. Work in a
> separate copy named [NAME]; preserve the original. Read README.md and all five
> template files first. Adapt the palette to [COLORS], typography to [FONTS], and
> use [LOCAL LOGO PATH]. Keep the supported filenames, escaped title/date
> placeholders, Chromium page-number spans and inline header/footer CSS. Scope
> content styles to PDF selectors. Support A4 portrait and landscape without
> clipping. Do not add scripts, network dependencies or external services. Include
> a short README explaining my changes. Validate by exporting notes with a long
> title, headings, links, code, a table and a diagram, then inspect every PDF page.

Export from the actual app to check pagination; an HTML preview is not sufficient.
Only share documents with an agent if you intend to give it access to their content.
