import { spawn, type ChildProcess } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { Readable, Writable } from 'node:stream'
import type { PdfPayload } from '@merkzeug/core/pdf'
import { allowed, mime, t } from './files'

/** Chromium-based browsers, most common first. VS Code's own Electron cannot print from an extension. */
export function browserCandidates(platform = process.platform, env = process.env, home = os.homedir()): string[] {
  if (platform === 'darwin') {
    const apps = [['Google Chrome', 'Google Chrome'], ['Microsoft Edge', 'Microsoft Edge'], ['Chromium', 'Chromium'], ['Brave Browser', 'Brave Browser']]
    return ['/Applications', path.join(home, 'Applications')].flatMap(base => apps.map(([app, binary]) => path.join(base, `${app}.app/Contents/MacOS/${binary}`)))
  }
  if (platform === 'win32') {
    const bases = [env.LOCALAPPDATA, env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.ProgramW6432].filter((v): v is string => !!v)
    const binaries = ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe', 'Chromium/Application/chrome.exe', 'BraveSoftware/Brave-Browser/Application/brave.exe']
    return bases.flatMap(base => binaries.map(binary => path.join(base, binary)))
  }
  const names = ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge-stable', 'microsoft-edge', 'brave-browser']
  const dirs = (env.PATH ?? '').split(path.delimiter).filter(Boolean).concat('/snap/bin')
  return dirs.flatMap(dir => names.map(name => path.join(dir, name)))
}
export async function findBrowser(configured: string): Promise<string | undefined> {
  if (configured.trim()) return configured.trim()
  for (const candidate of browserCandidates()) if (await fs.stat(candidate).then(s => s.isFile(), () => false)) return candidate
  return undefined
}

type CdpEvent = { method: string; params: any; sessionId?: string }
/** Chrome DevTools Protocol over --remote-debugging-pipe: no network port is opened. */
class Cdp {
  private sequence = 0
  private buffer = ''
  private readonly pending = new Map<number, { resolve(value: any): void; reject(error: Error): void }>()
  constructor(private readonly output: Writable, input: Readable, private readonly onEvent: (event: CdpEvent) => void) {
    input.setEncoding('utf8')
    input.on('data', (chunk: string) => {
      this.buffer += chunk
      let end: number
      while ((end = this.buffer.indexOf('\0')) >= 0) {
        const message = JSON.parse(this.buffer.slice(0, end))
        this.buffer = this.buffer.slice(end + 1)
        if (message.id !== undefined) {
          const request = this.pending.get(message.id)
          this.pending.delete(message.id)
          if (message.error) request?.reject(new Error(message.error.message))
          else request?.resolve(message.result)
        } else this.onEvent(message)
      }
    })
  }
  send<T = any>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    const id = ++this.sequence
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.output.write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0')
    })
  }
  fail(error: Error) { for (const request of this.pending.values()) request.reject(error); this.pending.clear() }
}

export interface RenderOptions {
  browser: string
  webDir: string
  /** Workspace root; images outside it are refused. */
  root: string
  locale: string
  payload: PdfPayload
  target: string
  timeoutMs?: number
}

const ORIGIN = 'https://merkzeug.invalid/'
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'"

/**
 * Render the shared print view (`index.html?pdf`) in headless Chromium and write an A4 PDF.
 * The page is served from a private origin through request interception, exactly as the
 * IntelliJ plugin serves it through JCEF, and signals readiness through the same bridge.
 */
export async function renderPdf(options: RenderOptions): Promise<void> {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'merkzeug-chromium-'))
  let child: ChildProcess | undefined
  try {
    child = spawn(options.browser, [
      '--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
      '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-sync',
      '--disable-default-apps', '--mute-audio', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'
    ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], windowsHide: true })
    const stderr: string[] = []
    child.stderr?.on('data', chunk => { stderr.push(String(chunk)); if (stderr.length > 50) stderr.shift() })
    const process = child
    await new Promise<void>((resolve, reject) => {
      let session = ''
      let settled = false
      const finish = (error?: Error) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve() }
      const timer = setTimeout(() => finish(new Error(t('Could not generate PDF') + ' (timeout)')), options.timeoutMs ?? 120_000)
      process.once('error', error => finish(new Error(t('Could not start the PDF browser: ') + error.message)))
      process.once('exit', code => finish(new Error(t('Could not generate PDF') + ` (browser exited ${code}) ${stderr.join('').slice(-500)}`)))
      const cdp = new Cdp(process.stdio[3] as Writable, process.stdio[4] as Readable, event => {
        if (event.sessionId !== session) return
        if (event.method === 'Fetch.requestPaused') void serve(event.params).catch(() => {})
        else if (event.method === 'Runtime.bindingCalled' && event.params.name === '__merkzeugSend') void call(event.params.payload)
      })
      const reply = (id: number, value: unknown, error?: string) => cdp.send('Runtime.evaluate', {
        expression: `window.__merkzeugReply?.(${id}, ${JSON.stringify(value ?? null)}, ${JSON.stringify(error ?? null)})`
      }, session).catch(() => {})
      async function serve(request: { requestId: string; request: { url: string } }) {
        let status = 200, body: Buffer, type: string
        try {
          const url = new URL(request.request.url)
          if (url.pathname === '/image') {
            const image = await allowed(options.root, url.searchParams.get('path') ?? '')
            type = mime(image)
            if (!type.startsWith('image/')) throw new Error(t('Not an image file'))
            body = await fs.readFile(image)
          } else {
            const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '')
            if (relative.split('/').includes('..')) throw new Error(t('Invalid resource path'))
            body = await fs.readFile(path.join(options.webDir, relative))
            type = mime(relative)
          }
        } catch { status = 404; body = Buffer.from('Not found'); type = 'text/plain' }
        await cdp.send('Fetch.fulfillRequest', {
          requestId: request.requestId, responseCode: status, body: body.toString('base64'),
          responseHeaders: [{ name: 'Content-Type', value: type }, { name: 'Content-Security-Policy', value: CSP }]
        }, session)
      }
      async function call(json: string) {
        const message = JSON.parse(json) as { id: number; method: string; landscape?: boolean; message?: string }
        try {
          switch (message.method) {
            case 'init': await reply(message.id, { locale: options.locale }); break
            case 'pdfPayload': await reply(message.id, options.payload); break
            case 'pdfError': await reply(message.id, true); finish(new Error(message.message || t('Could not generate PDF'))); break
            case 'pdfReady': {
              await reply(message.id, true)
              const template = options.payload.template
              const inch = (mm: number) => mm / 25.4
              const result = await cdp.send<{ data: string }>('Page.printToPDF', {
                landscape: !!message.landscape, printBackground: true, paperWidth: inch(210), paperHeight: inch(297),
                generateDocumentOutline: true, generateTaggedPDF: true,
                displayHeaderFooter: !!(template?.header || template?.footer),
                headerTemplate: template?.header ?? '<span></span>', footerTemplate: template?.footer ?? '<span></span>',
                ...(template?.margins ? {
                  marginTop: inch(template.margins.top), marginBottom: inch(template.margins.bottom),
                  marginLeft: inch(template.margins.left), marginRight: inch(template.margins.right)
                } : {})
              }, session)
              await fs.writeFile(options.target, Buffer.from(result.data, 'base64'))
              finish()
              break
            }
            default: await reply(message.id, null, t('Unknown action'))
          }
        } catch (error) { finish(error instanceof Error ? error : new Error(String(error))) }
      }
      void (async () => {
        const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
        session = (await cdp.send('Target.attachToTarget', { targetId, flatten: true })).sessionId
        await cdp.send('Fetch.enable', { patterns: [{ urlPattern: ORIGIN + '*' }] }, session)
        await cdp.send('Runtime.addBinding', { name: '__merkzeugSend' }, session)
        await cdp.send('Runtime.enable', {}, session)
        await cdp.send('Page.enable', {}, session)
        await cdp.send('Page.navigate', { url: ORIGIN + 'index.html?pdf' }, session)
      })().catch(error => finish(error instanceof Error ? error : new Error(String(error))))
      process.once('exit', () => cdp.fail(new Error('Browser closed')))
    })
  } finally {
    if (child && child.exitCode === null) {
      const closed = new Promise(resolve => child!.once('exit', resolve))
      child.kill()
      await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 3000))])
    }
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {})
  }
}

/** Print files are opened by the system viewer; remove leftovers from earlier sessions. */
export async function cleanPrintFiles(maxAgeMs = 24 * 3600_000): Promise<void> {
  const directory = os.tmpdir()
  for (const name of await fs.readdir(directory).catch(() => [] as string[])) {
    if (!/^merkzeug-print-.*\.pdf$/.test(name)) continue
    const file = path.join(directory, name)
    const stat = await fs.stat(file).catch(() => undefined)
    if (stat && Date.now() - stat.mtimeMs > maxAgeMs) await fs.rm(file, { force: true }).catch(() => {})
  }
}
export const printFile = () => path.join(os.tmpdir(), `merkzeug-print-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`)
