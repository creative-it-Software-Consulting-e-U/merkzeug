/** Only explicit application metadata belongs in support links, never note contents or paths. */
export function supportUrl(locale: string, edition: string, version?: string): string {
  const url = new URL('https://support.apps.creative-it.com/')
  url.searchParams.set('app', 'merkzeug')
  url.searchParams.set('lang', /^de(?:[-_]|$)/i.test(locale) ? 'de' : 'en')
  url.searchParams.set('environment', edition)
  if (version) url.searchParams.set('appVersion', version)
  return url.toString()
}
