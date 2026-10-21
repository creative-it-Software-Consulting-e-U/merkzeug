import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// IntelliJ and VS Code host the same shared shell (@merkzeug/ide); both adapters must answer
// every bridge request it can send. Only JCEF's in-view PDF reload has no VS Code equivalent.
const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const java = read('intellij/src/main/java/com/creativeit/merkzeug/MerkzeugEditor.java')
const dispatch = java.slice(java.indexOf('switch (arg(m, "method"))'), java.indexOf('default -> throw'))
const intellij = new Set([...dispatch.matchAll(/case "(\w+)" ->/g)].map(m => m[1]))
const vscode = new Set([...read('vscode/src/editor.ts').matchAll(/case '(\w+)':/g), ...read('vscode/src/pdf.ts').matchAll(/case '(\w+)':/g)].map(m => m[1]))
const shell = new Set([...read('packages/ide/src/IdeShell.tsx').matchAll(/request(?:<[^>]*>)?\(\s*['"](\w+)['"]/g)].map(m => m[1]))

test('both IDE adapters implement every shared shell request', () => {
  for (const method of shell) {
    assert.ok(intellij.has(method), `IntelliJ lacks ${method}`)
    assert.ok(vscode.has(method), `VS Code lacks ${method}`)
  }
})

test('IDE adapters expose the same bridge methods', () => {
  intellij.delete('editor')
  assert.deepEqual([...vscode].sort(), [...intellij].sort())
})
