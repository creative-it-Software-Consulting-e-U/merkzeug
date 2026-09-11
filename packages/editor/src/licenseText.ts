import en from '../../../resources/legal/EULA.en.md?raw'
import de from '../../../resources/legal/EULA.de.md?raw'

/** Identical license text in every edition and on the website. */
export const licenseText = (locale: string): string => locale.startsWith('de') ? de : en
