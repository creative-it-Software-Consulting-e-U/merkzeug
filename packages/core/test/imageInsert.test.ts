import test from 'node:test'
import assert from 'node:assert/strict'
import { effectiveImageInsert, vaultImageInsert, withVaultImageInsert } from '../src/imageInsert.ts'

test('the vault setting overrides the app setting', () => {
  assert.equal(effectiveImageInsert(false, null), 'markdown')
  assert.equal(effectiveImageInsert(true, null), 'html')
  assert.equal(effectiveImageInsert(true, 'markdown'), 'markdown')
  assert.equal(effectiveImageInsert(false, 'html'), 'html')
})

test('vault settings are read defensively and updated without losing entries', () => {
  for (const settings of [null, [], 'html', {}, { imageInsert: 'HTML' }, { imageInsert: true }]) assert.equal(vaultImageInsert(settings), null)
  assert.equal(vaultImageInsert({ imageInsert: 'html' }), 'html')
  const settings = { pdfTemplate: 'Firma', imageInsert: 'html' }
  assert.deepEqual(withVaultImageInsert(settings, 'markdown'), { pdfTemplate: 'Firma', imageInsert: 'markdown' })
  assert.deepEqual(withVaultImageInsert(settings, null), { pdfTemplate: 'Firma' })
  assert.deepEqual(settings, { pdfTemplate: 'Firma', imageInsert: 'html' })
})
