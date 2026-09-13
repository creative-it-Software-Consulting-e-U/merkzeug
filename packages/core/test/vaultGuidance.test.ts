import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guidanceAddition, inspectGuidance } from '../src/vaultGuidance.ts'
test('recognizes English and German rules without exact wording', () => {
  assert.equal(inspectGuidance('When you rename or move a Markdown note, take its .assets folder along with it.'), 'present')
  assert.equal(inspectGuidance('Markdown-Notiz und .assets-Ordner immer gemeinsam verschieben und umbenennen.'), 'present')
  assert.equal(inspectGuidance('Never move the companion .assets directory.'), 'review')
  assert.equal(inspectGuidance('Attachments use a companion directory.'), 'review')
  assert.equal(inspectGuidance('Use tabs.'), 'missing')
})
test('preserves language and newline style and avoids repeat suggestions', () => {
  for (const locale of ['en', 'de']) {
    const addition = guidanceAddition('existing\r\n', locale)
    assert.equal(inspectGuidance(addition), 'present')
    assert.ok(addition.includes('\r\n'))
    assert.ok(addition.includes('assets/'))
  }
})
