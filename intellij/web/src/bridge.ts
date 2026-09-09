declare global {
  interface Window {
    __merkzeugSend?: (json: string) => void
    __merkzeugReply: (id: number, value: unknown, error?: string) => void
    __merkzeugChanged: () => void
  }
}
let sequence = 0
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>()
window.__merkzeugReply = (id, value, error) => {
  const request = pending.get(id)
  if (!request) return
  pending.delete(id)
  if (error) request.reject(new Error(error))
  else request.resolve(value)
}
export async function request<T = any>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!window.__merkzeugSend) {
    await new Promise<void>((resolve) => window.addEventListener('merkzeug-ready', () => resolve(), { once: true }))
  }
  return new Promise<T>((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject })
    window.__merkzeugSend!(JSON.stringify({ id, method, ...args }))
  })
}
