import test from 'node:test'
import assert from 'node:assert/strict'
import { htmlImageSources, parseHtmlImages } from '../src/htmlImages.ts'

test('a single HTML image keeps size, alt and title', () => {
  assert.deepEqual(
    parseHtmlImages('<img src="Note.assets/image 1.png" alt="Call &amp; activity" width="450">'),
    { images: [{ src: 'Note.assets/image 1.png', alt: 'Call & activity', width: '450' }], centered: false }
  )
  assert.deepEqual(
    parseHtmlImages("<IMG SRC='a.png' height=120 title=\"T\" />"),
    { images: [{ src: 'a.png', title: 'T', height: '120' }], centered: false }
  )
})

test('wrapped and centered images are recognised', () => {
  const block = parseHtmlImages('<p align="center">\n  <a href="https://x"><img src="a.png"></a>\n  <img src="b.png" width="50%">\n</p>')
  assert.deepEqual(block, { images: [{ src: 'a.png' }, { src: 'b.png', width: '50%' }], centered: true })
  assert.equal(parseHtmlImages('<center><img src="a.png"></center>')?.centered, true)
  assert.equal(parseHtmlImages('<!-- c --><img src="a.png"><br>')?.images.length, 1)
})

test('HTML that is more than images stays raw', () => {
  for (const html of ['<img alt="no source">', '<img src="a.png"> caption', '<table><tr><td><img src="a.png"></td></tr></table>', '<b>bold</b>', '<img src="a.png" alt=">']) {
    assert.equal(parseHtmlImages(html), null, html)
  }
})

test('image sources are located for link rewriting', () => {
  const html = '<p><img alt="x" src="a b.png" width="4"> <img src=\'c.png\'><img src=d.png></p>'
  const sources = htmlImageSources(html)
  assert.deepEqual(sources.map(s => s.src), ['a b.png', 'c.png', 'd.png'])
  assert.deepEqual(sources.map(s => html.slice(s.start, s.end)), ['a b.png', 'c.png', 'd.png'])
  assert.deepEqual(htmlImageSources('<img data-src="x" src="y.png">').map(s => s.src), ['y.png'])
})
