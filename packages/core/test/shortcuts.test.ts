import test from 'node:test'
import assert from 'node:assert/strict'
import { shortcutLabels } from '../src/shortcuts.ts'

test('desktop shortcut hints follow the host including special meeting/help bindings', () => {
  const source = '⌘N · ⌃⌘N · ⌘? · ⌥⌘X · ⇧⌘R · ⌘[ · ⌘\\ · ⌘+scroll'
  assert.equal(shortcutLabels(source, true), source)
  assert.equal(shortcutLabels(source, false), 'Ctrl+N · Ctrl+Alt+Shift+N · F1 · Ctrl+Alt+X · Ctrl+Shift+R · Ctrl+[ · Ctrl+\\ · Ctrl+scroll')
  assert.equal(shortcutLabels('Neue Notiz (⌘N)', false, true), 'Neue Notiz (Strg+N)')
})
