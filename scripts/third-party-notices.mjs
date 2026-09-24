/** Bundle available license and notice texts for installed build/runtime dependencies. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
const records = []
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location.includes('node_modules/') || entry.link) continue
  const dir = path.join(root, location)
  if (!fs.existsSync(path.join(dir, 'package.json'))) continue // Optional dependency for another OS.
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const files = fs.readdirSync(dir).filter(name => /^(licen[sc]e|copying|notice)([.-]|$)/i.test(name))
    .filter(name => fs.statSync(path.join(dir, name)).isFile())
  const upstream = manifest.name === 'ical.js'
    ? `https://github.com/kewisch/ical.js/tree/v${manifest.version}`
    : manifest.name === 'lightningcss' || manifest.name.startsWith('lightningcss-')
      ? `https://github.com/parcel-bundler/lightningcss/tree/v${manifest.version}` : ''
  records.push({source: upstream, archive: entry.resolved ?? '', name: manifest.name, version: manifest.version, license: manifest.license ?? entry.license ?? 'SEE PACKAGE',
    texts: files.map(name => `--- ${name} ---\n${fs.readFileSync(path.join(dir, name), 'utf8')}`)})
}
records.sort((a,b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`, 'en'))
const body = 'Merkzeug third-party notices\n\nMPL component source locations are listed alongside the corresponding package versions below. Merkzeug does not modify these upstream source files.\n\nThis inventory includes installed build tools as well as runtime dependencies.\nUpstream components retain their own licenses. Electron and the host IDE also ship their own notices.\n\n' + records.map(r => `${r.name}@${r.version}\nLicense: ${JSON.stringify(r.license)}\n${r.source ? `Upstream source: ${r.source}\n` : ''}${r.archive ? `Package archive: ${r.archive}\n` : ''}${r.texts.join('\n')}\n`).join('\n')
const output = path.join(root, 'crossplatform/resources/THIRD_PARTY_NOTICES.txt')
fs.writeFileSync(output, body)
const mobilePublic = path.join(root, 'mobile/public')
fs.mkdirSync(mobilePublic, { recursive: true })
fs.writeFileSync(path.join(mobilePublic, 'THIRD_PARTY_NOTICES.txt'), body)
console.log(`Wrote notices for ${records.length} installed dependency packages.`)
