import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calloutDefaultTitle,
  calloutKind,
  parseCalloutMarker,
  restoreCalloutMarker
} from '../src/callouts.ts'

test('Obsidian callout and GitHub alert markers are recognised', () => {
  assert.deepEqual(parseCalloutMarker('[!info] Title'), { type: 'info', fold: '', length: 8 })
  assert.deepEqual(parseCalloutMarker('[!NOTE]'), { type: 'NOTE', fold: '', length: 7 })
  assert.deepEqual(parseCalloutMarker('[!faq]- Collapsed'), { type: 'faq', fold: '-', length: 8 })
  assert.deepEqual(parseCalloutMarker('[!tip]+'), { type: 'tip', fold: '+', length: 7 })
  assert.deepEqual(parseCalloutMarker('[!my-type]Title'), { type: 'my-type', fold: '', length: 10 })
  for (const text of ['[info] x', ' [!info]', '[!] x', '[!two words]', 'Text [!info]']) {
    assert.equal(parseCalloutMarker(text), null, text)
  }
})

test('types and aliases map to Obsidian styles; unknown types look like notes', () => {
  assert.equal(calloutKind('WARNING'), 'warning')
  assert.equal(calloutKind('caution'), 'warning')
  assert.equal(calloutKind('IMPORTANT'), 'tip')
  assert.equal(calloutKind('tldr'), 'abstract')
  assert.equal(calloutKind('cite'), 'quote')
  assert.equal(calloutKind('custom'), 'note')
})

test('default titles capitalise the written type', () => {
  assert.equal(calloutDefaultTitle('NOTE'), 'Note')
  assert.equal(calloutDefaultTitle('info'), 'Info')
  assert.equal(calloutDefaultTitle('my-type'), 'My-type')
})

test('escaped markers in serialized blockquotes are restored', () => {
  assert.equal(restoreCalloutMarker('> \\[!NOTE]\n> Text'), '> [!NOTE]\n> Text')
  assert.equal(restoreCalloutMarker('> \\[!info]- Title \\[x]\n> y'), '> [!info]- Title \\[x]\n> y')
  assert.equal(restoreCalloutMarker('> \\[!my\\_type]\\+'), '> [!my_type]+')
  assert.equal(restoreCalloutMarker('> [!tip] ok'), '> [!tip] ok')
})
