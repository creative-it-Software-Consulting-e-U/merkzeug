/** Keep calendar identity in metadata, independent of a human-readable filename. */
export function meetingIdentity(markdown: string): string | null {
  const block = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]
  if (!block) return null
  const field = (key: string): string | null => {
    const raw = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim()
    if (!raw) return null
    if (raw.startsWith('"')) { try { return JSON.parse(raw) } catch { return null } }
    return raw.startsWith("'") ? raw.slice(1, -1).replace(/''/g, "'") : raw
  }
  const event = field('calendar-event'), start = field('calendar-start')
  return event && start ? JSON.stringify([event, start]) : null
}

export function firstHeading(markdown: string): string | null {
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
  let fence = ''
  for (const line of body.split(/\r?\n/)) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1]
    if (marker) { if (!fence) fence = marker; else if (marker[0] === fence[0] && marker.length >= fence.length) fence = ''; continue }
    if (fence) continue
    const title = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)?.[1]
    if (title) return title.trim()
  }
  return null
}

/** Preserve case, spaces and Unicode; replace only cross-platform unsafe characters. */
export function headingFileBase(title: string): string {
  let safe = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim().replace(/[. ]+$/, '')
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) safe = '_' + safe
  // Leave room for .assets and collision suffixes on filesystems with 255-byte names.
  while (new TextEncoder().encode(safe).length > 220) safe = Array.from(safe).slice(0, -1).join('')
  return safe || 'Meeting'
}

export interface MeetingFiles {
  list(folder: string): Promise<string[]>
  read(path: string): Promise<string>
  exists(path: string): Promise<boolean>
  create(path: string, content: string): Promise<void>
}
export async function ensureMeetingFile(folder: string, content: string, files: MeetingFiles): Promise<string> {
  const identity = meetingIdentity(content)
  if (!identity) throw new Error('Missing calendar identity.')
  const prefix = folder.replace(/\/$/, '') + '/'
  for (const path of await files.list(folder)) {
    if (path.toLowerCase().endsWith('.md') && meetingIdentity(await files.read(path)) === identity) return path
  }
  const base = headingFileBase(firstHeading(content) ?? 'Meeting')
  for (let n = 1; ; n++) {
    const stem = prefix + base + (n === 1 ? '' : ` (${n})`)
    if (await files.exists(stem + '.md') || await files.exists(stem + '.assets')) continue
    // The adapter must create exclusively: an external change must not be overwritten.
    await files.create(stem + '.md', content)
    return stem + '.md'
  }
}
