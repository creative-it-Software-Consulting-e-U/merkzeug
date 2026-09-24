import test from 'node:test'
import assert from 'node:assert/strict'
import { collectLinkedDocs, fillTemplate, resolvePath } from '../src/exportPlan.ts'
import { splitFrontmatter } from '../src/docTitle.ts'

test('export selects only direct local Markdown links in hierarchy and respects exclusions', async () => {
  const md = '---\npdf-exclude:\n  - private\n---\n# Index\n[b](b.md) [a](a) [a again](a.md#heading) [outside](../outside.md) [private](private.md) [web](https://example.com/a.md) ![image](image.md)\n```md\n[example](code.md)\n```\n'
  const found = await collectLinkedDocs('/vault/docs/index.md', md, '/vault', async () => true)
  assert.deepEqual(found, ['/vault/docs/a.md', '/vault/docs/b.md'])
})
test('vault-relative, encoded and Windows paths resolve consistently', async () => {
  assert.equal(resolvePath('C:\\vault\\docs', '../note.md'), 'C:/vault/note.md')
  const found = await collectLinkedDocs('/vault/docs/index.md', '[a](/docs/Gr%C3%B6%C3%9Fe.md) [bad](%ZZ.md) [missing](missing.md)', '/vault', async p => p.includes('Größe'))
  assert.deepEqual(found, ['/vault/docs/Größe.md'])
})
test('export templates escape titles and choose the linked title', () => {
  const output = fillTemplate({name:'Test',header:'{{titel}} / {{datum}}'}, '---\ntitle: Main\npdf-linked-title: A & B <C>\n---\n# Other', 'fallback', true, new Date(2026,8,9))
  assert.equal(output.header, 'A &amp; B &lt;C&gt; / 09.09.2026')
})
test('frontmatter survives untouched round trips', () => {
  const source = '---\ntitle: Test\ncustom: [a, b]\n---\n\n# Test\n'
  const {frontmatter,body} = splitFrontmatter(source)
  assert.equal(frontmatter + body, source)
})

test('mobile vault root exports direct children, nested notes and frontmatter exclusions', async () => {
  const md = '---\npdf-exclude: [Hidden.md]\n---\n# Index\n[chapter](Chapter.md) [nested](sub/Note.md) [hidden](Hidden.md) [missing](Missing.md)'
  const files = new Set(['/Chapter.md', '/sub/Note.md', '/Hidden.md'])
  assert.deepEqual(await collectLinkedDocs('/Index.md', md, '/', async path => files.has(path)), ['/Chapter.md', '/sub/Note.md'])
})
