/** Record the actual Electron renderer in an isolated synthetic vault. Never uploads. */
import { _electron } from 'playwright'
import { mkdtemp, mkdir, cp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
const temp = await mkdtemp(join(tmpdir(), 'merkzeug-tour-'))
const vault = join(temp, 'vault'), frames = join(temp, 'frames')
await cp(resolve('store/demo/de'), vault, { recursive: true }); await mkdir(frames)
const output = resolve('release-artifacts/roadmap'); await mkdir(output, { recursive: true })
execFileSync('git', ['init', '-q', vault]); execFileSync('git', ['-C', vault, 'add', '.']); execFileSync('git', ['-C', vault, '-c', 'user.name=Merkzeug Demo', '-c', 'user.email=demo@example.invalid', 'commit', '-qm', 'Demo vault'])
const env = { ...process.env, MERKZEUG_VAULT: vault, MERKZEUG_PDF_TARGET: join(output, 'tour-example.pdf') }; delete env.ELECTRON_RUN_AS_NODE
const app = await _electron.launch({ executablePath: resolve('crossplatform/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [resolve('crossplatform'), `--user-data-dir=${join(temp, 'profile')}`, '--lang=de'], env })
let recording = false, capture
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
 const page = await app.firstWindow(); page.setDefaultTimeout(20000)
 await page.getByRole('button', { name: 'Tour starten', exact: true }).waitFor()
 await page.locator('.tour-dialog').getByRole('button', { name: 'Später', exact: true }).click()
 await page.getByRole('button', { name: 'Für diesen Vault nicht mehr vorschlagen', exact: true }).click()
 const note = page.locator('.tree-label').filter({ hasText: /^Willkommen$/ }); await note.click()
 await page.locator('.ProseMirror h1').waitFor()
 recording = true
 capture = (async () => { let i = 0; while (recording) { const started = Date.now(); await page.screenshot({ path: join(frames, `${String(i++).padStart(5,'0')}.png`), scale: 'css' }); await pause(Math.max(0, 125 - (Date.now() - started))) } })()
 await page.getByRole('button', { name: 'Geführte Tour', exact: true }).click()
 await pause(2000); await page.getByRole('button', { name: 'Tour starten', exact: true }).click()
 for (let i = 0; i < 5; i++) { await pause(3500); await page.getByRole('button', { name: 'Weiter', exact: true }).click() }
 await pause(3500); await page.getByRole('button', { name: 'Fertig', exact: true }).click()
 await page.locator('.ProseMirror').click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.press('Enter'); await page.keyboard.type('Eine neue Idee, direkt als Markdown gespeichert.', { delay: 70 }); await pause(2000)
 const settingsPromise = app.waitForEvent('window'); await page.getByRole('button', { name: 'Einstellungen', exact: true }).click(); const settings = await settingsPromise
 await settings.getByLabel('Darstellung', { exact: true }).selectOption('dark'); await pause(2500)
 await settings.getByLabel('Darstellung', { exact: true }).selectOption('light')
 await settings.locator('.settings-select').selectOption('Merkzeug'); await settings.close()
 await page.getByLabel('PDF-Vorlage beim Bearbeiten verwenden').check(); await pause(4000)
 await page.evaluate(async vault => window.merkzeug.exportPdf(vault + '/Willkommen.md'), vault); await pause(3000)
 recording = false; await capture
 const video = join(output, 'guided-tour-de.mp4')
 execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '8', '-i', join(frames, '%05d.png'), '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video])
 await writeFile(join(output, 'guided-tour.txt'), 'German silent screencast of the actual desktop renderer in a synthetic local Git vault. Prepared for review; no upload or public URL.\n')
 console.log(video)
} finally { recording = false; if (capture) await capture.catch(() => {}); await app.close() }
