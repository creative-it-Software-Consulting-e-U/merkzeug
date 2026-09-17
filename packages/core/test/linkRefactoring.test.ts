import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rewriteMarkdownLinks, planLinkEdits } from '../src/linkRefactoring.ts'
const moves = [{ from: '/v/notes/Old.md', to: '/v/archive/New Name.md' }, { from: '/v/notes/Old.assets', to: '/v/archive/New Name.assets' }]
test('incoming, root-relative, encoded, reference and image destinations retain labels, titles and fragments', () => {
 const input = '[Label](notes/Old.md#topic "Title")\n![Image](/notes/Old.assets/image.png)\n\n[ref]: <notes/Old.md> "Reference title"\n[Other](notes/Other.md)'
 assert.equal(rewriteMarkdownLinks(input, '/v/index.md', moves, '/v'), '[Label](archive/New%20Name.md#topic "Title")\n![Image](/archive/New%20Name.assets/image.png)\n\n[ref]: <archive/New%20Name.md> "Reference title"\n[Other](notes/Other.md)')
})
test('outgoing links rebase and the companion follows the moved note', () => {
 assert.equal(rewriteMarkdownLinks('[Other](Other.md) ![Image](Old.assets/image.png) [Self](Old.md#x) [Local](#x)', '/v/notes/Old.md', moves, '/v'), '[Other](../notes/Other.md) ![Image](New%20Name.assets/image.png) [Self](New%20Name.md#x) [Local](#x)')
})
test('code, frontmatter, external URLs, prose and unrelated paths are unchanged', () => {
 const input = '---\nlink: "[x](notes/Old.md)"\n---\n`[x](notes/Old.md)`\n\n```md\n[x](notes/Old.md)\n```\n\n    [x](notes/Old.md)\n\nhttps://host/notes/Old.md [x](https://host/notes/Old.md) [x](//host/notes/Old.md) notes/Old.md'
 assert.equal(rewriteMarkdownLinks(input, '/v/index.md', moves, '/v'), input)
})
test('nested labels and balanced or escaped parentheses preserve syntax', () => {
 const m = [{from:'/v/A (1).md',to:'/v/B (2).md'}]
 assert.equal(rewriteMarkdownLinks('[**label**](A%20(1).md "title") [x](<A (1).md>) [x](A%20\\(1\\).md)', '/v/index.md', m, '/v'), '[**label**](B%20%282%29.md "title") [x](<B%20%282%29.md>) [x](B%20%282%29.md)')
})
test('folder moves keep internal links, rebase external links and do not match same-prefix directories', () => {
 const m = [{from:'/v/notes',to:'/v/archive/notes'}]
 assert.equal(rewriteMarkdownLinks('[Internal](Other.md) [Outside](../index.md)', '/v/notes/Old.md', m, '/v'), '[Internal](Other.md) [Outside](../../index.md)')
 assert.equal(rewriteMarkdownLinks('[x](notes/Old.md) [y](notes2/Old.md)', '/v/index.md', m, '/v'), '[x](archive/notes/Old.md) [y](notes2/Old.md)')
})
test('plans only changed files and records both locations for rollback', () => {
 const plan = planLinkEdits([{path:'/v/notes/Old.md',content:'[x](Other.md)'},{path:'/v/unchanged.md',content:'# plain'}], moves, '/v')
 assert.equal(plan.length,1); assert.equal(plan[0].target,'/v/archive/New Name.md'); assert.equal(plan[0].before,'[x](Other.md)')
})
