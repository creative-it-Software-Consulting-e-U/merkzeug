import { existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

/**
 * Abhängigkeits- und Build-Ordner, die im Dateibaum und in der
 * Dateiüberwachung übersprungen werden. Ohne diese Ausnahme blockieren
 * große Code-Repos als Vault die App (zigtausende Dateien in
 * node_modules, Maven-target usw.).
 */
const ALWAYS_IGNORED = new Set(['node_modules', 'bower_components', '__pycache__'])

/**
 * Mehrdeutige Ordnernamen nur ignorieren, wenn daneben eine Datei des
 * zugehörigen Build-Systems liegt — so bleiben normale Notiz-Ordner
 * mit gleichem Namen sichtbar.
 */
const MARKERS: Record<string, string[]> = {
  target: ['pom.xml'],
  build: ['build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts'],
  dist: ['package.json'],
  out: ['package.json', 'tsconfig.json']
}

export function isIgnoredDir(dirPath: string): boolean {
  const name = basename(dirPath)
  if (ALWAYS_IGNORED.has(name)) return true
  const markers = MARKERS[name]
  if (markers) {
    const parent = dirname(dirPath)
    if (markers.some((marker) => existsSync(join(parent, marker)))) return true
  }
  // Python-virtualenvs unabhängig vom Namen erkennen
  return existsSync(join(dirPath, 'pyvenv.cfg'))
}
