// Xcode signs the outer app. Cloud's export step replaces these ad-hoc signatures.
const fs = require('node:fs/promises')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const app = process.argv[2]
const entitlements = path.resolve(__dirname, '../build/entitlements.mas.inherit.plist')
const bundles = []
const binaries = []
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      await walk(file)
      if (/\.(app|framework|xpc)$/.test(entry.name)) bundles.push(file)
    } else if (entry.isFile()) {
      const handle = await fs.open(file, 'r')
      const magic = Buffer.alloc(4)
      try { await handle.read(magic, 0, 4, 0) } finally { await handle.close() }
      if (['feedface', 'feedfacf', 'cefaedfe', 'cffaedfe', 'cafebabe', 'bebafeca', 'cafebabf', 'bfbafeca'].includes(magic.toString('hex'))) binaries.push(file)
    }
  }
}
;(async () => {
  if (!app || path.basename(app) !== 'Merkzeug.app') throw Error('Expected Merkzeug.app')
  await walk(path.join(app, 'Contents'))
  for (const file of [...binaries, ...bundles]) {
    if (file === path.join(app, 'Contents/MacOS/Merkzeug')) continue
    execFileSync('/usr/bin/codesign', ['--force', '--sign', '-', '--timestamp=none', '--entitlements', entitlements, file], { stdio: 'inherit' })
  }
})().catch(error => { console.error(error.message); process.exitCode = 1 })
