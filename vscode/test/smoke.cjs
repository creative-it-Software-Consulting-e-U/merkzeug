// Runs inside an isolated VS Code extension host (see vscode/smoke.py).
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vscode = require('vscode')

const wait = async (condition, label, timeout = 30000) => {
  const start = Date.now()
  while (!(await condition())) {
    if (Date.now() - start > timeout) throw new Error('Timed out: ' + label)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
const log = message => console.log('[merkzeug-smoke] ' + message)

exports.run = async function run() {
  const root = vscode.workspace.workspaceFolders[0].uri.fsPath
  const file = name => path.join(root, name)
  const extension = vscode.extensions.all.find(e => e.packageJSON.name === 'merkzeug')
  const { provider } = await extension.activate()

  // 1. The custom editor boots the shared web shell, which loads the document through the bridge.
  const note = vscode.Uri.file(file('Note.md'))
  await vscode.commands.executeCommand('vscode.openWith', note, 'merkzeug.editor')
  await wait(() => provider.sessions.size === 1, 'editor session')
  const session = [...provider.sessions][0]
  const posted = []
  const post = session.post.bind(session)
  session.post = message => { posted.push(message); post(message) }
  await wait(() => session.handled.includes('init') && session.handled.includes('read'), 'web shell init and read', 60000)
  log('web shell requests: ' + [...new Set(session.handled)].join(', '))
  const init = await session.handle({ id: 0, method: 'init' })
  assert.equal(init.path, file('Note.md').replace(/\\/g, '/'))
  assert.equal(init.readonly, false)
  const document = session.document

  // 2. Writes are minimal TextDocument edits guarded by the revision; VS Code owns undo and save.
  const original = document.getText()
  let { revision } = await session.handle({ id: 0, method: 'read', path: init.path })
  const edited = original.replace('Hello', 'Hello from Merkzeug')
  ;({ revision } = await session.handle({ id: 0, method: 'write', path: init.path, text: edited, revision }))
  assert.equal(document.getText(), edited)
  assert.equal(document.isDirty, true)
  assert.equal(posted.filter(m => m.type === 'changed').length, 0, 'own writes are not echoed')
  await assert.rejects(session.handle({ id: 0, method: 'write', path: init.path, text: 'stale', revision: '1' }), /CONFLICT/)
  await session.handle({ id: 0, method: 'undo' })
  await wait(() => document.getText() === original, 'undo through VS Code')
  await wait(() => posted.some(m => m.type === 'changed'), 'undo announced to the web shell')
  await session.handle({ id: 0, method: 'redo' })
  await wait(() => document.getText() === edited, 'redo through VS Code')
  await session.handle({ id: 0, method: 'save' })
  assert.equal(document.isDirty, false)
  assert.equal(fs.readFileSync(file('Note.md'), 'utf8'), edited)
  log('document sync, conflict, undo/redo and save ok')

  // 3. Images go to the companion folder; paths outside the workspace are refused.
  const image = await session.handle({ id: 0, method: 'image', base64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'), extension: 'svg' })
  assert.match(image, /^Note\.assets\/image-.*\.svg$/)
  assert.ok(fs.existsSync(file(image)))
  await assert.rejects(session.handle({ id: 0, method: 'read', path: path.join(root, '..', 'outside.md') }), /outside/)
  assert.equal(await session.handle({ id: 0, method: 'exists', path: file('Other.md').replace(/\\/g, '/') }), true)

  // 4. Portable vault template assignment in .merkzeug/settings.json and the editing preview setting.
  let state = await session.handle({ id: 0, method: 'templateAssign', name: 'vault:.merkzeug/templates/Smoke' })
  assert.equal(state.assigned, 'vault:.merkzeug/templates/Smoke')
  assert.deepEqual(JSON.parse(fs.readFileSync(file('.merkzeug/settings.json'), 'utf8')).pdfTemplate, { source: 'vault', path: '.merkzeug/templates/Smoke' })
  const template = await session.handle({ id: 0, method: 'template' })
  assert.match(template.css, /Smoke template/)
  assert.match(template.header, /data:image\/png;base64,/)
  assert.equal(await session.handle({ id: 0, method: 'templatePreview', enabled: true }), true)
  assert.equal(vscode.workspace.getConfiguration('merkzeug', note).get('editor.pdfTemplatePreview'), true)
  await wait(() => posted.some(m => m.type === 'settings'), 'settings change announced')
  log('templates and settings ok')

  // 5. PDF through headless Chromium with template, linked document and Mermaid.
  if (process.env.MERKZEUG_PDF_TARGET) {
    const read = name => fs.readFileSync(file(name), 'utf8')
    const payload = { vault: init.vault, docs: [{ path: init.path, content: read('Note.md') }, { path: file('Other.md').replace(/\\/g, '/'), content: read('Other.md') }], template: { ...template, header: template.header.replace('{{titel}}', 'Smoke Test') } }
    const started = Date.now()
    assert.equal(await session.handle({ id: 0, method: 'export', payload, print: false }), true)
    const pdf = fs.readFileSync(process.env.MERKZEUG_PDF_TARGET)
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
    log(`pdf ok: ${pdf.length} bytes in ${Date.now() - started} ms`)
  }

  // 6. Renaming a note moves its companion folder and updates links in the same operation.
  await vscode.commands.executeCommand('workbench.action.closeAllEditors')
  const rename = new vscode.WorkspaceEdit()
  rename.renameFile(note, vscode.Uri.file(file('Renamed.md')))
  assert.equal(await vscode.workspace.applyEdit(rename), true)
  await wait(() => fs.existsSync(file('Renamed.assets')), 'companion folder renamed')
  assert.equal(fs.existsSync(file('Note.assets')), false)
  assert.match(read2(file('Linker.md')), /\]\(Renamed\.md\)/)
  assert.match(read2(file('Linker.md')), /Renamed\.assets\/pic\.png/)
  assert.match(read2(file('Renamed.md')), /Renamed\.assets\/pic\.png/)
  // Moving into a folder recalculates outgoing relative links.
  const move = new vscode.WorkspaceEdit()
  move.renameFile(vscode.Uri.file(file('Renamed.md')), vscode.Uri.file(file('sub/Renamed.md')))
  assert.equal(await vscode.workspace.applyEdit(move), true)
  await wait(() => fs.existsSync(file('sub/Renamed.assets/pic.png')), 'companion folder moved')
  assert.match(read2(file('sub/Renamed.md')), /\]\(\.\.\/Other\.md\)/)
  assert.match(read2(file('Linker.md')), /\]\(sub\/Renamed\.md\)/)
  // Existing destinations are not merged.
  fs.mkdirSync(file('Blocked.assets'))
  const blocked = new vscode.WorkspaceEdit()
  blocked.renameFile(vscode.Uri.file(file('sub/Renamed.md')), vscode.Uri.file(file('Blocked.md')))
  assert.equal(await vscode.workspace.applyEdit(blocked), true)
  assert.ok(fs.existsSync(file('sub/Renamed.assets/pic.png')), 'colliding companion stays in place')
  await vscode.workspace.saveAll(false)
  log('rename/move refactoring ok')
  log('PASS')
}
const read2 = name => {
  const open = vscode.workspace.textDocuments.find(d => d.uri.fsPath === name)
  return open ? open.getText() : fs.readFileSync(name, 'utf8')
}
