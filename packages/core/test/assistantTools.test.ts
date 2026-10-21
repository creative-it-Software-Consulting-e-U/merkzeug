import test from 'node:test'
import assert from 'node:assert/strict'
import { NEEDS_WRITE_MARKER, isTextPath, parseToolCall, stripNeedsWrite, vaultInstructions, vaultToolSpecs } from '../src/assistantTools.ts'

test('tool sets follow the access level; read-only offers to ask for editing', () => {
  assert.deepEqual(vaultToolSpecs('none'), [])
  assert.deepEqual(vaultToolSpecs('read').map((t) => t.name), ['list_files', 'search_vault', 'read_file', 'request_write_access'])
  assert.deepEqual(vaultToolSpecs('write').map((t) => t.name), ['list_files', 'search_vault', 'read_file', 'write_file', 'edit_file'])
  for (const tool of vaultToolSpecs('write')) {
    assert.deepEqual(tool.parameters.required, Object.keys(tool.parameters.properties))
    assert.equal(tool.parameters.additionalProperties, false)
  }
})

test('tool input is validated before anything runs', () => {
  assert.deepEqual(parseToolCall('read_file', { path: 'a.md' }), { name: 'read_file', path: 'a.md' })
  assert.deepEqual(parseToolCall('list_files', {}), { name: 'list_files', folder: '' })
  assert.deepEqual(parseToolCall('edit_file', { path: 'a.md', old_text: 'x', new_text: 'y' }), {
    name: 'edit_file', path: 'a.md', oldText: 'x', newText: 'y', replaceAll: false
  })
  assert.equal(parseToolCall('edit_file', { path: 'a.md', old_text: 'x', new_text: 'y', replace_all: true }).name, 'edit_file')
  for (const [name, input] of [
    ['read_file', null],
    ['read_file', []],
    ['read_file', { path: 3 }],
    ['write_file', { path: 'a.md' }],
    ['edit_file', { path: 'a.md', old_text: '', new_text: 'y' }],
    ['edit_file', { path: 'a.md', old_text: 'x', new_text: 'y', replace_all: 'yes' }],
    ['search_vault', { query: '  ' }],
    ['delete_file', { path: 'a.md' }]
  ] as const) {
    assert.ok('error' in parseToolCall(name, input), `${name} ${JSON.stringify(input)}`)
  }
})

test('only text files are accessible', () => {
  for (const path of ['a.md', 'b.MARKDOWN', 'c.txt', 'd.yaml', 'e.mmd']) assert.ok(isTextPath(path), path)
  for (const path of ['a.png', 'b.pdf', 'c', 'md']) assert.ok(!isTextPath(path), path)
})

test('instructions describe the access level and the CLI marker', () => {
  assert.equal(vaultInstructions('none', 'tools'), '')
  assert.match(vaultInstructions('read', 'tools'), /request_write_access/)
  assert.match(vaultInstructions('write', 'tools'), /edit_file/)
  assert.ok(vaultInstructions('read', 'cli').includes(NEEDS_WRITE_MARKER))
  assert.doesNotMatch(vaultInstructions('write', 'cli'), /MERKZEUG_NEEDS_WRITE/)
  assert.deepEqual(stripNeedsWrite(`I would add links.\n${NEEDS_WRITE_MARKER}\n`), { text: 'I would add links.', needsWrite: true })
  assert.deepEqual(stripNeedsWrite('plain'), { text: 'plain', needsWrite: false })
})
