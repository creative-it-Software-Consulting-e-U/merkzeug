/** Display the desktop menu/editor shortcuts using the host platform's keys. */
export function shortcutLabels(text: string, mac: boolean, german = false): string {
  if (mac) return text
  const ctrl = german ? 'Strg' : 'Ctrl'
  return text.replace(/⌃⌘N/g, `${ctrl}+Alt+Shift+N`)
    .replace(/⌘\?/g, 'F1')
    .replace(/([⌥⇧]*)(?:⌘)([A-Za-z0-9,\[\]\\]|\+)?/g, (_, modifiers: string, key: string = '') => {
      const parts = [ctrl]
      if (modifiers.includes('⌥')) parts.push('Alt')
      if (modifiers.includes('⇧')) parts.push('Shift')
      return parts.join('+') + (key === '+' ? '+' : key ? '+' + key : '')
    })
}
