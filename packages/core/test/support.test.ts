import test from 'node:test'
import assert from 'node:assert/strict'
import { supportUrl } from '../src/support.ts'

test('support links select Merkzeug, localize and carry only explicit app metadata', () => {
  for (const [locale, expected] of [['de-AT', 'de'], ['de_DE', 'de'], ['fr-FR', 'en']]) {
    const url = new URL(supportUrl(locale, 'desktop-darwin', '0.1.0'))
    assert.equal(url.origin, 'https://support.apps.creative-it.com')
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      app: 'merkzeug', lang: expected, environment: 'desktop-darwin', appVersion: '0.1.0'
    })
  }
  assert.equal(new URL(supportUrl('en', 'iOS/iPadOS')).searchParams.has('appVersion'), false)
})
