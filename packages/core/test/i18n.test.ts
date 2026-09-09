import test from 'node:test'
import assert from 'node:assert/strict'
import { getLocale, setLocale, t } from '../src/i18n.ts'

test('German locales use translations while English and unsupported locales use source text', () => {
  for (const locale of ['de', 'de-AT', 'de-DE', 'de_CH', 'DE-at']) {
    assert.equal(t('Save', locale), 'Sichern')
    assert.equal(t('Export PDF', locale), 'PDF exportieren')
  }
  for (const locale of ['en', 'en-US', 'fr-FR', '']) assert.equal(t('Save', locale), 'Save')
  assert.equal(t('A new untranslated message', 'de-AT'), 'A new untranslated message')
})
test('host locale overrides navigator and message whitespace is preserved', () => {
  setLocale('de-AT')
  try {
    assert.equal(getLocale(), 'de-AT')
    assert.equal(t('  Cancel\n'), '  Abbrechen\n')
  } finally { setLocale(undefined) }
})
