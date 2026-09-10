import { useEffect, useState } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { t } from '@merkzeug/core/i18n'
interface Operation { status?: string; action?: string; vault?: string }
const workingCopy = registerPlugin<{
  status(options: { vault: string }): Promise<{ available: boolean; repo: string }>
  configure(options: { vault: string; repo: string; key: string }): Promise<void>
  run(options: { vault: string; action: string }): Promise<void>
  operation(): Promise<Operation>
  dismiss(): Promise<void>
}>('MerkzeugWorkingCopy')
export function WorkingCopy({ vaultId }: { vaultId: string }) {
  const [open, setOpen] = useState(false), [repo, setRepo] = useState(''), [key, setKey] = useState(''), [error, setError] = useState('')
  const [configured, setConfigured] = useState(false), [available, setAvailable] = useState(false), [busy, setBusy] = useState(false)
  const [operation, setOperation] = useState<Operation>({})
  async function refresh() {
    if (!Capacitor.isNativePlatform()) return
    const status = await workingCopy.status({ vault: vaultId }); setRepo(status.repo); setConfigured(!!status.repo); setAvailable(status.available)
    setOperation(await workingCopy.operation())
  }
  useEffect(() => {
    void refresh().catch(e => setError(String(e)))
    const visible = () => { if (document.visibilityState === 'visible') void refresh().catch(e => setError(String(e))) }
    document.addEventListener('visibilitychange', visible)
    return () => document.removeEventListener('visibilitychange', visible)
  }, [vaultId])
  async function run(action: string) {
    setBusy(true); setError('')
    try {
      const pending: Promise<void>[] = []
      window.dispatchEvent(new CustomEvent('merkzeug-flush', { detail: pending }))
      await Promise.all(pending)
      await workingCopy.run({ vault: vaultId, action })
      await refresh()
    } catch (e) { setError(String(e)) } finally { setBusy(false) }
  }
  const message: Record<string, string> = {
    success: 'Working Copy confirmed completion.', cancel: 'Working Copy cancelled the operation.', error: 'Working Copy reported an error. Resolve it in Working Copy.',
    pending: 'Waiting for Working Copy. Opening the app does not confirm success.', interrupted: 'The operation was interrupted. Check its result in Working Copy before continuing.'
  }
  return <details className="working-copy" open={open} onToggle={e => setOpen(e.currentTarget.open)}><summary>Working Copy</summary>
    <p>{t('Associate this vault with its exact Working Copy repository. Commit opens Working Copy for reviewing files and entering a message. Push requires the unlocked Working Copy feature.')}</p>
    {!available && <p>{t('Working Copy is unavailable on this device.')}</p>}
    <label>{t('Repository name or remote URL')} <input value={repo} onChange={e => setRepo(e.target.value)} /></label>{' '}
    <label>{t('Callback key')} <input type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} /></label>{' '}
    <button disabled={!available || !repo.trim() || !key || busy || !!operation.status} onClick={() => {
      setBusy(true); void workingCopy.configure({ vault: vaultId, repo: repo.trim(), key }).then(() => { setKey(''); return refresh() }).catch(e => setError(String(e))).finally(() => setBusy(false))
    }}>{t('Save connection')}</button>
    <div>{['pull', 'commit', 'push'].map(action => <button key={action} disabled={!available || !configured || busy || !!operation.status} onClick={() => void run(action)}>{t(action[0].toUpperCase() + action.slice(1))}</button>)}</div>
    {operation.status && <p role="status">{t(message[operation.status] ?? 'Unknown operation result.')} <button disabled={busy} onClick={() => void workingCopy.dismiss().then(() => { setOperation({}); window.dispatchEvent(new Event('merkzeug-external-change')) }).catch(e => setError(String(e)))}>{t('I checked the result in Working Copy')}</button></p>}
    {error && <p role="alert">{error}</p>}
  </details>
}
