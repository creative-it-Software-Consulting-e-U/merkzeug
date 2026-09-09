import { setLocale } from '@merkzeug/core/i18n'

// Electron's navigator locale may differ from its native menu/OS locale.
setLocale(window.merkzeug.locale)
document.documentElement.lang = window.merkzeug.locale
