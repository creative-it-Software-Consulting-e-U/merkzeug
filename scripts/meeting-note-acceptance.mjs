// Isolated desktop regression: title naming, autosave rename, assets and calendar identity.
import { _electron } from 'playwright'
import electronPath from 'electron'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
const temp = await mkdtemp(join(tmpdir(), 'merkzeug-meeting-'))
const vault = join(temp, 'vault'); await mkdir(vault)
const content = '---\ncalendar-event: "synthetic-event"\ncalendar-start: "2026-09-17T09:00:00Z"\n---\n\n# Team Meeting\n\nSaved notes\n'
const old = join(vault, 'meeting-0123456789abcdefabcd.md')
await writeFile(old, content)
await mkdir(old.slice(0, -3) + '.assets')
await writeFile(join(old.slice(0, -3) + '.assets', 'sample.txt'), 'attachment')
const env = { ...process.env, MERKZEUG_VAULT: vault }; delete env.ELECTRON_RUN_AS_NODE
const app = await _electron.launch({ executablePath: electronPath, args: [resolve('crossplatform'), `--user-data-dir=${join(temp, 'profile')}`, '--lang=en'], env })
try {
 const page = await app.firstWindow(); page.setDefaultTimeout(20000)
 await page.locator('.tour-dialog').getByRole('button', { name: 'Later', exact: true }).click()
 await page.locator('.tree-label').filter({ hasText: 'meeting-0123456789abcdefabcd' }).click()
 const heading = page.locator('.ProseMirror h1'); await heading.waitFor()
 await heading.fill('Updated Meeting')
 await page.waitForFunction(() => [...document.querySelectorAll('.tree-label')].some(el => el.textContent === 'Updated Meeting'))
 const renamed = join(vault, 'Updated Meeting.md')
 assert.match(await readFile(renamed, 'utf8'), /# Updated Meeting/)
 await access(join(vault, 'Updated Meeting.assets', 'sample.txt'))
 const reopened = await page.evaluate(({vault, content}) => window.merkzeug.createMeetingNote(vault, 'unused.md', content), {vault, content})
 assert.equal(reopened, renamed)
 const created = await page.evaluate(({vault, content}) => window.merkzeug.createMeetingNote(vault, 'unused.md', content), {vault, content: content.replace('synthetic-event','second-event')})
 assert.equal(created, join(vault, 'Team Meeting.md'))
 const collision = await page.evaluate(({vault, content}) => window.merkzeug.createMeetingNote(vault, 'unused.md', content), {vault, content: content.replace('synthetic-event','third-event')})
 assert.equal(collision, join(vault, 'Team Meeting (2).md'))
 console.log('PASS: legacy meeting auto-rename, attachment move, event re-open, heading filename and collision preservation')
} finally { await app.close(); await rm(temp, { recursive:true, force:true }) }
