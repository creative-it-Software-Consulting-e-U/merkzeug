import { useRef, useState } from 'react'
import { t } from '@merkzeug/core/i18n'
import instructions from '../../../resources/pdf-templates/Merkzeug/AGENTS.md?raw'
import prompt from '../../../resources/pdf-templates/Merkzeug/STYLING-PROMPT.md?raw'

/** Self-contained, offline guidance also works with older or external templates. */
export function TemplateStylingPrompt({ path }: { path?: string }) {
  const [status, setStatus] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  const text = prompt.replace('{{TEMPLATE_PATH}}', () => path || '[TEMPLATE FOLDER PATH ON THE AGENT’S COMPUTER]') + '\n' + instructions
  return <details style={{ maxWidth: '100%', padding: '8px', boxSizing: 'border-box' }}>
    <summary>{t('Template styling prompt')}</summary>
    <p>{t('Replace the name and styling wishes before sending this prompt to your agent. No template files are changed.')}</p>
    <textarea ref={field} aria-label={t('Template styling prompt')} readOnly value={text} rows={10} style={{ width: '100%', boxSizing: 'border-box', font: 'inherit' }} />
    <button onClick={() => {
      setStatus('')
      void navigator.clipboard?.writeText(text).then(() => setStatus(t('Prompt copied.')), () => {
        field.current?.focus(); field.current?.select(); setStatus(t('Select and copy the prompt manually.'))
      })
      if (!navigator.clipboard) { field.current?.focus(); field.current?.select(); setStatus(t('Select and copy the prompt manually.')) }
    }}>{t('Copy styling prompt')}</button>
    <span role="status" style={{ marginInlineStart: '8px' }}>{status}</span>
  </details>
}
