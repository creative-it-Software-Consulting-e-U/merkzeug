import { t, getLocale } from '@merkzeug/core/i18n'
import { shortcutLabels } from '@merkzeug/core/shortcuts'

export function translate(message: string): string {
  return shortcutLabels(t(message), navigator.platform.startsWith('Mac'), /^de/i.test(getLocale()))
}
