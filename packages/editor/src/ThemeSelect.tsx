import { useEffect, useState } from 'react'
import { t } from '@merkzeug/core/i18n'
import { setTheme, themeChoice, type ThemeChoice } from '@merkzeug/editor/theme'
export function ThemeSelect() {
  const [choice, setChoice] = useState(themeChoice)
  useEffect(() => { const update = () => setChoice(themeChoice()); window.addEventListener('merkzeug-theme', update); return () => window.removeEventListener('merkzeug-theme', update) }, [])
  return <label className="theme-select">{t('Appearance')}{' '}<select aria-label={t('Appearance')} value={choice} onChange={event => setTheme(event.target.value as ThemeChoice)}>
    <option value="system">{t('System')}</option><option value="light">{t('Light')}</option><option value="dark">{t('Dark')}</option>
  </select></label>
}
