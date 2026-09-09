/** Encode a local image path as URL path data, including Windows drive letters. */
export function vaultFileUrl(notePath: string, source: string): string {
  if (!source || /^(https?:|data:|vault-file:)/i.test(source)) return source
  let decoded: string
  try { decoded = decodeURIComponent(source) } catch { decoded = source }
  decoded = decoded.replace(/\\/g, '/')
  const absolute = /^(\/|[a-z]:\/)/i.test(decoded)
    ? decoded : notePath.replace(/\\/g, '/').replace(/\/[^/]*$/, '') + '/' + decoded
  const path = absolute.split('/').map(encodeURIComponent).join('/')
  return 'vault-file://local' + (path.startsWith('/') ? '' : '/') + path
}

export function vaultFilePath(url: string, platform: string): string {
  const path = decodeURIComponent(new URL(url).pathname)
  return platform === 'win32' && /^\/[a-z]:\//i.test(path) ? path.slice(1) : path
}
