// Exercise the real Electron IPC and filesystem transaction in an isolated vault.
import { _electron } from 'playwright'
import electronPath from 'electron'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
const temp = await mkdtemp(join(tmpdir(), 'merkzeug-links-')), vault = join(temp, 'vault')
await mkdir(join(vault, 'notes', 'Old.assets'), { recursive: true }); await mkdir(join(vault, 'archive'))
await writeFile(join(vault, 'notes', 'Old.assets', 'x.png'), 'test-image')
await writeFile(join(vault, 'notes', 'Old.md'), '# Old\n\n[Other](../Other.md) ![Image](Old.assets/x.png)')
await writeFile(join(vault, 'Other.md'), '# Other')
await writeFile(join(vault, 'index.md'), '[Note](notes/Old.md#topic) ![Image](notes/Old.assets/x.png)\n\n`[Example](notes/Old.md)`')
const env = { ...process.env, MERKZEUG_VAULT: vault }; delete env.ELECTRON_RUN_AS_NODE
const app = await _electron.launch({ executablePath: electronPath, args: [resolve('crossplatform'), `--user-data-dir=${join(temp, 'profile')}`, '--lang=en'], env })
try {
 const page = await app.firstWindow()
 const rename = (path, name) => page.evaluate(({path,name})=>window.merkzeug.renamePath(path,name),{path,name})
 const move = (path, folder) => page.evaluate(({path,folder})=>window.merkzeug.movePath(path,folder),{path,folder})
 let note = await rename(join(vault,'notes','Old.md'), 'New Name.md')
 assert.match(await readFile(join(vault,'index.md'),'utf8'), /notes\/New%20Name.md#topic/)
 assert.match(await readFile(join(vault,'index.md'),'utf8'), /`\[Example\]\(notes\/Old.md\)`/)
 note = await move(note, join(vault,'archive'))
 assert.match(await readFile(note,'utf8'), /New%20Name.assets\/x.png/)
 assert.match(await readFile(join(vault,'index.md'),'utf8'), /archive\/New%20Name.md#topic/)
 await access(join(vault,'archive','New Name.assets','x.png'))
 // A deeper folder move changes outgoing links too.
 await mkdir(join(vault,'deep'))
 await move(join(vault,'archive'),join(vault,'deep'))
 note = join(vault,'deep','archive','New Name.md')
 assert.match(await readFile(note,'utf8'), /\.\.\/\.\.\/Other.md/)
 assert.match(await readFile(join(vault,'index.md'),'utf8'), /deep\/archive\/New%20Name.md/)
 // A renderer that read an old link must not be allowed to overwrite the rewrite.
 await page.evaluate(path=>window.merkzeug.readFile(path),join(vault,'index.md'))
 await rename(note,'Final.md')
 await assert.rejects(page.evaluate(({path})=>window.merkzeug.writeFile(path,'stale edit'),{path:join(vault,'index.md')}), /CONFLICT/)
 // Failed multi-file commit restores names, assets and every already-written document.
 const before = await readFile(join(vault,'index.md'),'utf8')
 await app.evaluate(({app},root)=>{
   const fs = process.getBuiltinModule('fs'), original = fs.renameSync
   fs.renameSync = function(path,...args) {
     if (String(args[0]) === root + '/index.md') { fs.renameSync=original; throw new Error('Synthetic write failure') }
     return original.call(this,path,...args)
   }
 },vault)
 await assert.rejects(rename(join(vault,'deep','archive','Final.md'),'Failed.md'), /Synthetic write failure/)
 await access(join(vault,'deep','archive','Final.md')); await access(join(vault,'deep','archive','Final.assets','x.png'))
 assert.equal(await readFile(join(vault,'index.md'),'utf8'),before)
 assert.match(await readFile(join(vault,'deep','archive','Final.md'),'utf8'), /Final.assets\/x.png/)
 console.log('PASS: incoming/outgoing links, folders, attachments, code exclusions, stale saves and rollback')
} finally { await app.close(); await rm(temp,{recursive:true,force:true}) }
