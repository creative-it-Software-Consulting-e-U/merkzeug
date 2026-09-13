import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadTemplateFiles } from '../src/templateLoader.ts'

test('template loader embeds local images and preserves Unicode, unrelated text and configured margins', async () => {
  const files: Record<string, string> = {
    'stil.css': '.pdf-content { background: url("images/logo.svg"); }',
    'deckblatt.html': '<h1>Grüße</h1><p>images/logo.svg</p><img src="images/logo.svg"><img src="../private.png">',
    'vorlage.json': '{"margins":{"top":30,"left":0,"bottom":-1}}',
    'images/logo.svg': '<svg/>'
  }
  const seen: string[] = []
  const template = await loadTemplateFiles('Report', async path => { seen.push(path); return files[path] === undefined ? undefined : Buffer.from(files[path]).toString('base64') })
  assert.match(template.cover!, /Grüße/)
  assert.match(template.cover!, /<p>images\/logo.svg<\/p>/)
  assert.match(template.cover!, /src="data:image\/svg\+xml;base64,/)
  assert.match(template.css!, /url\("data:image\/svg\+xml;base64,/)
  assert.equal(seen.includes('../private.png'), false)
  assert.deepEqual(template.margins, { top: 30, bottom: 18, left: 0, right: 10 })
})
