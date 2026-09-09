import { de } from './locales/de.ts'

let override: string | undefined

/** Hosts without navigator (Electron main) supply their OS locale at startup. */
export function setLocale(locale: string | undefined): void {
  override = locale
}

export function getLocale(): string {
  return override ?? (typeof navigator !== 'undefined' ? navigator.language : 'en')
}

/** English is both the source language and the fallback for untranslated messages. */
export function t(message: string, locale = getLocale()): string {
  if (!/^de(?:[-_]|$)/i.test(locale)) return message
  const key = message.trim()
  const translated = de[key]
  return translated === undefined ? message : message.replace(key, translated)
}
