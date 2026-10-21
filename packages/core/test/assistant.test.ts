import test from 'node:test'
import assert from 'node:assert/strict'
import { contextBlock, fencedBlock, foldedPrompt, splitAnswer, STABLE_INSTRUCTIONS } from '../src/assistant.ts'

test('answers split into prose and fenced code blocks, including an open fence while streaming', () => {
  const blocks = splitAnswer('Hier ist das Diagramm:\n\n```mermaid\nflowchart TD\n  A --> B\n```\n\nFertig.\n\n~~~~\nraw\n~~~~\n```js\nconst x = 1')
  assert.deepEqual(blocks, [
    { kind: 'text', text: 'Hier ist das Diagramm:' },
    { kind: 'code', lang: 'mermaid', code: 'flowchart TD\n  A --> B' },
    { kind: 'text', text: 'Fertig.' },
    { kind: 'code', lang: '', code: 'raw' },
    { kind: 'code', lang: 'js', code: 'const x = 1' }
  ])
})

test('a longer closing fence ends a shorter one but a shorter fence does not', () => {
  const blocks = splitAnswer('````md\n```\ninner\n```\n````\n')
  assert.deepEqual(blocks, [{ kind: 'code', lang: 'md', code: '```\ninner\n```' }])
})

test('fenced blocks for the note drop trailing newlines only', () => {
  assert.equal(fencedBlock('mermaid', 'graph LR\n  A --> B\n\n'), '```mermaid\ngraph LR\n  A --> B\n```')
})

test('the context block carries only what was shared and wraps the note', () => {
  assert.equal(contextBlock({ vaultName: null, notePath: null, noteMarkdown: null, selection: null }), '')
  const block = contextBlock({ vaultName: 'Work', notePath: 'a/b.md', noteMarkdown: '# B', selection: 'x' })
  assert.match(block, /^Context from Merkzeug:/)
  assert.match(block, /Vault: Work/)
  assert.match(block, /Open note: a\/b\.md/)
  assert.match(block, /<selection>\nx\n<\/selection>/)
  assert.match(block, /<note>\n# B\n<\/note>/)
})

test('the folded CLI prompt keeps earlier turns and marks the new request', () => {
  const prompt = foldedPrompt(
    [{ role: 'user', content: 'eins' }, { role: 'assistant', content: 'zwei' }, { role: 'user', content: 'drei' }],
    { vaultName: null, notePath: null, noteMarkdown: null, selection: null },
    true
  )
  assert.ok(prompt.startsWith(STABLE_INSTRUCTIONS))
  assert.match(prompt, /Earlier turns of this conversation:\n\nUser:\neins\n\nAssistant:\nzwei/)
  assert.match(prompt, /New request from the user:\ndrei$/)
  assert.doesNotMatch(foldedPrompt([{ role: 'user', content: 'solo' }], { vaultName: null, notePath: null, noteMarkdown: null, selection: null }, false), /Earlier turns|You are the/)
})
