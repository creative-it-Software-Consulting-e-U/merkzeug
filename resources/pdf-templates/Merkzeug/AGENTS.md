# Merkzeug template styling instructions

These instructions apply to this template folder, not to the user's notes or application code.

## Files and assets

- `stil.css`: document, table-of-contents and cover styles.
- `kopfzeile.html` / `fusszeile.html`: header / footer HTML with inline CSS. Chromium renders them in separate print contexts; document CSS does not apply there.
- `deckblatt.html`: optional cover. Remove it in the working copy to omit the cover. Headers and footers also appear on the cover.
- `vorlage.json`: `{"margins":{"top":24,"bottom":22,"left":18,"right":18}}`, nonnegative millimetres. Reserve enough space for headers and footers.
- `README.md`: describe the palette, typography, assets and changes made to this particular template.

Keep filenames and `{{titel}}` / `{{datum}}` unchanged. These placeholders receive the escaped title and export date. Page numbering uses `<span class="pageNumber"></span>` and `<span class="totalPages"></span>` in headers/footers.
Keep logos inside this folder and reference them with relative image paths. Prefer locally installed font families with fallbacks: font availability differs between computers. Do not assume a relative font URL is embedded in the PDF. Do not introduce scripts, web fonts, remote assets or services.

## Document styling

Use `.pdf-content` for content rules and `.pdf-app` for the PDF shell. Never target application toolbars or global `body` styles. Typical selectors:

```css
.pdf-content .milkdown .ProseMirror {
  font: 10.5pt/1.6 Arial, sans-serif;
  color: #242424;
}
.pdf-content .milkdown .ProseMirror h1 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 28pt;
  line-height: 1.15;
  break-after: avoid;
}
.pdf-content .milkdown .ProseMirror a { color: #28568f; }
.pdf-content .milkdown .ProseMirror blockquote {
  border-left: 3px solid #28568f;
  background: #f7f3ec;
  padding: 3mm 5mm;
}
.pdf-content .milkdown .ProseMirror :is(pre, code) { background: #f7f3ec; }
.pdf-content .milkdown .ProseMirror :is(td, th) {
  border-color: #dcd6ca;
  padding: 2mm 3mm;
}
```

Also review h2–h6, lists, strong/emphasis, long links, code text contrast and table headings. The starter uses `.merkzeug-cover` for its cover, `.pdf-toc` and `.pdf-toc-title` for the contents page. Preserve wrapping. Do not give document content fixed heights or hidden overflow. Support A4 portrait and `html.pdf-landscape`; large tables can trigger landscape export. Avoid applying `break-inside: avoid` to entire long sections or tables.

## Editor preview versus PDF

Desktop and IntelliJ can apply PDF content styles while editing. Only rules containing `.pdf-content` are transferred to the editor, scoped to its content root. Print media rules, cover, contents page, header/footer and page margins are not reproduced there. Positioning, z-index, display, visibility, generated content, page/break and pointer-events declarations are filtered out. Non-print media rules can be retained; do not rely on other at-rules in the live preview.
The preview uses a light paper surface. Put text styles under `.pdf-content`, not only `.pdf-app`, so they apply in both modes. Frontmatter shares the paper surface but is an editor control, not a PDF content section.
Mermaid has its own rendering theme. PDF/light-template preview uses light rendering; document CSS is not a general Mermaid theme configuration API. Avoid broad SVG fills, filters or inversions, and do not modify the user's diagram source to style a template. Transparent diagram surfaces must remain legible on the document background.
iOS can provide this styling prompt and access shared files, but currently has no PDF export or PDF-template editor preview. Validate output on desktop or IntelliJ.

## Working and validation

Read the existing files first. Work in a separate named copy and preserve the original. Keep unrelated files intact. If this folder already has agent instructions, preserve them and reconcile guidance instead of overwriting them. Record design decisions in README.md.
Export a synthetic sample through Merkzeug containing a long title, headings, links, lists, quotations, code, a wide table, images and Mermaid. Inspect every PDF page, including cover, contents, page numbers, breaks and margins. Check portrait and landscape, and toggle live preview on/off in desktop or IntelliJ. A browser preview alone does not validate pagination. Report which checks were actually performed and any unavailable fonts or untested platform behavior.
