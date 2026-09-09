import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

/** Each renderer must save against its own last explicit read, including on close. */
export class FileRevisions {
  private revisions = new Map<string, string>()

  move(source: string, target: string): void {
    const from = resolve(source), to = resolve(target)
    for (const [key, content] of [...this.revisions]) {
      if (key === from || key.startsWith(from + sep)) {
        this.revisions.delete(key)
        this.revisions.set(to + key.slice(from.length), content)
      }
    }
  }

  read(path: string, options?: { peek?: boolean }): string {
    const content = readFileSync(path, 'utf8')
    if (!options?.peek) this.revisions.set(resolve(path), content)
    return content
  }

  write(path: string, content: string): void {
    const key = resolve(path)
    const expected = this.revisions.get(key)
    if (expected === undefined || readFileSync(path, 'utf8') !== expected) {
      throw new Error('CONFLICT: File changed since it was opened. Reload before saving.')
    }
    // Synchronous comparison/write prevents another renderer interleaving in this process.
    // External processes can still race; filesystem notifications provide an additional check.
    writeFileSync(path, content, 'utf8')
    this.revisions.set(key, content)
  }
}
