/** Wire/UI representation; persisted vault references are explicitly typed. */
export function templateSelection(value: unknown): string | null {
  if (typeof value === 'string' && value) return validateTemplateSelection(value)
  if (value && typeof value === 'object' && 'source' in value && value.source === 'vault' && 'path' in value && typeof value.path === 'string') return validateTemplateSelection('vault:' + value.path)
  return null
}
export function validateTemplateSelection(value: string): string {
  const vault = value.startsWith('vault:')
  const path = vault ? value.slice(6) : value
  if (!path || path.startsWith('/') || path.includes('\\') || path.includes(':') || path.split('/').some(p => !p || p === '.' || p === '..') || (!vault && path.includes('/'))) throw new Error('Invalid template location')
  return value
}
export function storedTemplateSelection(value: string | null): unknown {
  if (!value) return undefined
  validateTemplateSelection(value)
  return value.startsWith('vault:') ? { source: 'vault', path: value.slice(6) } : value
}
