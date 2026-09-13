import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

function inside(parent: string, path: string): boolean {
  const rel = relative(parent, path)
  return !rel || (!rel.startsWith(`..${sep}`) && rel !== '..' && !rel.startsWith(sep))
}
function canonical(path: string): string {
  if (existsSync(path)) return realpathSync(path)
  return join(canonical(dirname(path)), basename(path))
}
/** Copy before switching the configured root. Keep originals as a recovery copy.
 * Different files at the destination are a conflict, never an overwrite.
 * Repeating an interrupted migration is safe, including identical files.
 */
export function migrateTemplateFiles(source: string, destination: string): void {
  const from = canonical(resolve(source)), to = canonical(resolve(destination))
  if (from === to) return
  if (inside(from, to) || inside(to, from)) throw new Error('Template folders must not contain each other.')
  if (!existsSync(from)) { mkdirSync(to, { recursive: true }); return }
  const files: string[] = [], folders: string[] = ['']
  const scan = (rel: string) => {
    for (const name of readdirSync(join(from, rel))) {
      const path = join(rel, name), stat = lstatSync(join(from, path)), target = join(to, path)
      if (stat.isSymbolicLink()) throw new Error(`Template symbolic links cannot be migrated: ${path}`)
      if (stat.isDirectory()) {
        if (existsSync(target) && (!lstatSync(target).isDirectory() || lstatSync(target).isSymbolicLink())) throw new Error(`Template conflict: ${path}`)
        folders.push(path); scan(path)
      } else if (stat.isFile()) {
        if (existsSync(target) && (lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile() || !readFileSync(target).equals(readFileSync(join(from, path))))) throw new Error(`Template conflict: ${path}`)
        files.push(path)
      } else throw new Error(`Unsupported template file: ${path}`)
    }
  }
  scan('') // Validate all conflicts before copying anything.
  for (const path of folders) mkdirSync(join(to, path), { recursive: true })
  for (const path of files) {
    const target = join(to, path)
    if (!existsSync(target)) cpSync(join(from, path), target, { force: false, errorOnExist: true })
    if (lstatSync(target).isSymbolicLink() || !readFileSync(target).equals(readFileSync(join(from, path)))) throw new Error(`Template copy could not be verified: ${path}`)
  }
}
