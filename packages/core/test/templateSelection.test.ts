import test from 'node:test'
import assert from 'node:assert/strict'
import { templateSelection, storedTemplateSelection } from '../src/templateSelection.ts'
test('portable template assignments retain central names and vault-relative folders', () => {
  assert.equal(templateSelection('Merkzeug'), 'Merkzeug')
  const selection = { source: 'vault', path: '.merkzeug/templates/Company' }
  assert.equal(templateSelection(selection), 'vault:.merkzeug/templates/Company')
  assert.deepEqual(storedTemplateSelection(templateSelection(selection)), selection)
  assert.equal(templateSelection(null), null)
})
test('template assignment rejects escape paths and absolute device locations', () => {
  for (const path of ['../Company', '/Company', 'a/../../Company', 'C:\\Company', 'a//b', './Company']) {
    assert.throws(() => templateSelection({ source: 'vault', path }))
  }
  assert.throws(() => templateSelection('a/b'))
})
