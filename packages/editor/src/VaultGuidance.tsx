import { useEffect, useRef, useState } from 'react'
import { t, getLocale } from '@merkzeug/core/i18n'
import { guidanceAddition, inspectGuidance, instructionNames, type InstructionName } from '@merkzeug/core/vaultGuidance'
export interface GuidanceHost {
  suppressed?(): Promise<boolean>
  suppress?(never: boolean): Promise<void>
  read(name: InstructionName): Promise<string | null>
  append(name: InstructionName, expected: string | null, addition: string): Promise<void>
}
export function VaultGuidance({ vaultId, host }: { vaultId: string; host: GuidanceHost }) {
  const [files, setFiles] = useState<Partial<Record<InstructionName, string | null>>>({})
  const [show, setShow] = useState(false)
  const [preview, setPreview] = useState(false)
  const [selected, setSelected] = useState<InstructionName[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const applying = useRef(false)
  const key = `guidance:${vaultId}`
  useEffect(() => {
    let active = true
    if (localStorage.getItem(key) === 'never' || sessionStorage.getItem(key)) return
    void (async () => {
      if (await host.suppressed?.()) return null
      return Promise.all(instructionNames.map(async name => [name, await host.read(name)] as const))
    })().then(entries => {
      if (!active || !entries) return
      const result = Object.fromEntries(entries)
      setFiles(result)
      setShow(entries.some(([, value]) => value !== null && inspectGuidance(value) !== 'present') || entries.every(([, value]) => value === null))
    }).catch(e => { if (active) { setError(String(e)); setShow(true) } })
    return () => { active = false }
  }, [host, key])
  const exists = instructionNames.filter(name => files[name] != null)
  const targets = selected.filter(name => inspectGuidance(files[name] ?? '') !== 'present')
  const addition = guidanceAddition(exists.map(name => files[name]).join('\n\n'), getLocale()).trim()
  function appendText(expected: string | null) {
    const newline = expected?.includes('\r\n') ? '\r\n' : '\n'
    return (expected && !expected.endsWith('\n') ? newline : '') + newline + addition.replace(/\r?\n/g, newline) + newline
  }
  const dismiss = (never = false) => { if (never) localStorage.setItem(key, 'never'); else sessionStorage.setItem(key, 'later'); setShow(false); void host.suppress?.(never).catch(e => { setError(String(e)); setShow(true) }) }
  async function apply() {
    if (applying.current || !targets.length || targets.some(name => inspectGuidance(files[name] ?? '') === 'review')) return
    applying.current = true; setBusy(true); setError('')
    try {
      for (const name of targets) {
        const expected = files[name] ?? null
        await host.append(name, expected, appendText(expected))
        // A partial failure can be retried without duplicating earlier additions.
        setFiles(previous => ({ ...previous, [name]: (expected ?? '') + appendText(expected) }))
      }
      dismiss()
    } catch (e) {
      setError(String(e))
      const entries = await Promise.all(instructionNames.map(async name => [name, await host.read(name)] as const)).catch(() => null)
      if (entries) setFiles(Object.fromEntries(entries))
    } finally { applying.current = false; setBusy(false) }
  }
  if (!show) return null
  return <aside className="vault-guidance">
    <span>{t('Help coding agents preserve note attachments.')}</span>{' '}
    <button onClick={() => setPreview(true)}>{t('Review guidance')}</button>{' '}
    <button onClick={() => dismiss()}>{t('Later')}</button>{' '}
    <button onClick={() => dismiss(true)}>{t('Do not suggest again for this vault')}</button>
    {preview && <dialog open aria-label={t('Review guidance')} className="guidance-dialog">
      <h2>{t('Review guidance')}</h2>
      <h3>{t('Text to add')}</h3>
      <pre>{addition}</pre>
      <p>{t('Review the existing files and select where to add this text. Files that only refer to another instruction file can remain unchanged.')}</p>
      {instructionNames.map(name => <section key={name}>
        <h3><label><input type="checkbox" checked={selected.includes(name)} disabled={busy || inspectGuidance(files[name] ?? '') !== 'missing'} onChange={e => setSelected(previous => e.target.checked ? [...previous, name] : previous.filter(item => item !== name))} /> {name}</label></h3>
        {files[name] != null ? <pre aria-label={name}>{files[name] || t('This file is empty.')}</pre> : <p>{t('This file does not exist. Selecting it will create it.')}</p>}
        {inspectGuidance(files[name] ?? '') === 'present' && <p>{t('This file already contains attachment guidance.')}</p>}
        {inspectGuidance(files[name] ?? '') === 'review' && <p role="alert">{t('Existing attachment instructions need review. Resolve contradictions before adding this guidance.')}</p>}
      </section>)}
      {error && <p role="alert">{error}</p>}
      <button disabled={busy || !targets.length || targets.some(name => inspectGuidance(files[name] ?? '') === 'review')} onClick={() => void apply()}>{t('Add')}</button>{' '}
      <button disabled={busy} onClick={() => setPreview(false)}>{t('Close')}</button>
    </dialog>}
  </aside>
}
