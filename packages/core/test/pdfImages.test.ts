import { test } from 'node:test'
import assert from 'node:assert/strict'
import { imagesDecoded } from '../src/pdfImages.ts'

const image = (src: string | null, result: 'ok' | 'broken', decoded: string[]) => ({
  getAttribute: (name: string) => (name === 'src' ? src : null),
  decode: () => {
    decoded.push(src ?? '<none>')
    return result === 'ok' ? Promise.resolve() : Promise.reject(new Error('EncodingError: The source image cannot be decoded.'))
  }
})

test('PDF export waits for real images and ignores source-less placeholders and broken images', async () => {
  const decoded: string[] = []
  await imagesDecoded([
    image('data:image/webp;base64,AAAA', 'ok', decoded),
    image(null, 'broken', decoded),
    image('', 'broken', decoded),
    image('vault-file://local/missing.png', 'broken', decoded)
  ])
  assert.deepEqual(decoded, ['data:image/webp;base64,AAAA', 'vault-file://local/missing.png'])
})
