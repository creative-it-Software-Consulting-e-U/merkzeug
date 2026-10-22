import test from 'node:test'
import assert from 'node:assert/strict'
import { alignHtmlImages, htmlImageSources, htmlImageTag, isImageSize, parseHtmlImages, resizeHtmlImage } from '../src/htmlImages.ts'

test('a single HTML image keeps size, alt and title', () => {
  assert.deepEqual(
    parseHtmlImages('<img src="Note.assets/image 1.png" alt="Call &amp; activity" width="450">'),
    { images: [{ src: 'Note.assets/image 1.png', alt: 'Call & activity', width: '450' }], align: 'left', linked: false }
  )
  assert.deepEqual(
    parseHtmlImages("<IMG SRC='a.png' height=120 title=\"T\" />"),
    { images: [{ src: 'a.png', title: 'T', height: '120' }], align: 'left', linked: false }
  )
})

test('wrapped and centered images are recognised', () => {
  const block = parseHtmlImages('<p align="center">\n  <a href="https://x"><img src="a.png"></a>\n  <img src="b.png" width="50%">\n</p>')
  assert.deepEqual(block, { images: [{ src: 'a.png' }, { src: 'b.png', width: '50%' }], align: 'center', linked: true })
  assert.equal(parseHtmlImages('<center><img src="a.png"></center>')?.align, 'center')
  assert.equal(parseHtmlImages('<p align=right><img src="a.png"></p>')?.align, 'right')
  assert.equal(parseHtmlImages('<div align="left"><img src="a.png"></div>')?.align, 'left')
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

test('image tags are built with escaped attributes', () => {
  assert.equal(htmlImageTag({ src: 'My%20Note.assets/a.png' }), '<img src="My%20Note.assets/a.png">')
  assert.equal(htmlImageTag({ src: 'a.png', alt: 'A "B" & C', width: '450', height: '' }), '<img src="a.png" alt="A &quot;B&quot; &amp; C" width="450">')
  assert.deepEqual(parseHtmlImages(htmlImageTag({ src: 'a.png', alt: 'x > y' }))?.images, [{ src: 'a.png', alt: 'x > y' }])
})

test('resizing changes only the chosen image size', () => {
  const html = '<p align="center"><img src="a.png" width=10 class="x"><IMG src="b.png" alt="b"/></p>'
  assert.equal(resizeHtmlImage(html, 0, { width: '450' }), '<p align="center"><img src="a.png" width="450" class="x"><IMG src="b.png" alt="b"/></p>')
  assert.equal(resizeHtmlImage(html, 1, { width: '20', height: '30' }), '<p align="center"><img src="a.png" width=10 class="x"><IMG src="b.png" alt="b" width="20" height="30" /></p>')
  assert.equal(resizeHtmlImage('<img src="a.png" width="4" height="3">', 0, { width: '', height: '6' }), '<img src="a.png" height="6">')
  assert.equal(isImageSize('450'), true)
  assert.equal(isImageSize('50%'), true)
  for (const value of ['', '4.5', '-1', '12px', '1"']) assert.equal(isImageSize(value), false, value)
})

test('alignment wraps, rewraps and unwraps images', () => {
  const img = '<img src="a.png" width="450">'
  assert.equal(alignHtmlImages(img, 'center'), `<p align="center">${img}</p>`)
  assert.equal(alignHtmlImages(`<p align="center">${img}</p>`, 'right'), `<p align="right">${img}</p>`)
  assert.equal(alignHtmlImages(`<p align="center">\n  ${img}\n</p>`, 'left'), img)
  assert.equal(alignHtmlImages(`<center>${img}</center>`, 'right'), `<p align="right">${img}</p>`)
  assert.equal(alignHtmlImages(`<div class="hero" align="center">${img}</div>`, 'left'), `<div class="hero">${img}</div>`)
  assert.equal(alignHtmlImages(img, 'left'), img)
  const twoParagraphs = '<p><img src="a.png"></p><p><img src="b.png"></p>'
  assert.equal(alignHtmlImages(twoParagraphs, 'center'), `<div align="center">${twoParagraphs}</div>`)
  for (const align of ['left', 'center', 'right'] as const) assert.equal(parseHtmlImages(alignHtmlImages(img, align))?.align, align)
})
