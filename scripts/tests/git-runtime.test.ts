import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGitRuntime } from '../../crossplatform/src/main/gitRuntime.mts'

const ok = { code: 0, out: 'git version 2.50.0' }

test('macOS without developer tools never launches the Git shim, including repeated checks', async () => {
  const calls: string[] = []
  const runtime = createGitRuntime({ platform: 'darwin', path: '/usr/bin',
    executable: async path => path === '/usr/bin/git' ? path : null,
    run: async file => { calls.push(file); return { code: 1, out: 'No developer tools selected' } }
  })
  const results = await Promise.all(Array.from({ length: 5 }, () => runtime.command('/notes', ['status'])))
  assert.ok(results.every(result => result.errorCode === 'GIT_UNAVAILABLE'))
  assert.deepEqual(calls, ['/usr/bin/xcode-select'])
})

test('macOS resolves selected developer Git directly, without executing the shim', async () => {
  const calls: string[] = []
  const actual = '/Applications/Xcode-beta.app/Contents/Developer/usr/bin/git'
  const runtime = createGitRuntime({ platform: 'darwin', path: '/usr/bin',
    executable: async path => ['/usr/bin/git', actual].includes(path) ? path : null,
    run: async file => {
      calls.push(file)
      return file === '/usr/bin/xcode-select' ? { code: 0, out: '/Applications/Xcode-beta.app/Contents/Developer' } : ok
    }
  })
  assert.deepEqual(await runtime.availability(), { path: actual })
  await runtime.command('/notes', ['status'])
  assert.deepEqual(calls, ['/usr/bin/xcode-select', actual, actual])
})

test('explicit retry discovers Git installed after a cached missing result', async () => {
  let installed = false
  const runtime = createGitRuntime({ platform: 'linux', path: '/usr/bin',
    executable: async path => installed ? path : null, run: async () => ok
  })
  assert.deepEqual(await runtime.availability(), { reason: 'missing' })
  installed = true
  assert.deepEqual(await runtime.availability(), { reason: 'missing' })
  runtime.retry()
  assert.deepEqual(await runtime.availability(), { path: '/usr/bin/git' })
})

test('unusable Git is cached and ordinary repository errors do not disable working Git', async () => {
  let count = 0
  let usable = false
  const runtime = createGitRuntime({ platform: 'linux', path: '/usr/bin', executable: async path => path,
    run: async (_file, args) => { count++; return usable && args[0] === '--version' ? ok : { code: 128, out: 'failure' } }
  })
  assert.deepEqual(await runtime.availability(), { reason: 'unusable' })
  await runtime.command('/notes', ['status'])
  assert.equal(count, 1)
  usable = true
  runtime.retry()
  assert.equal((await runtime.command('/notes', ['status'])).code, 128)
  assert.deepEqual(await runtime.availability(), { path: '/usr/bin/git' })
})

test('a removed Git executable disables subsequent subprocesses until retry', async () => {
  let count = 0
  const runtime = createGitRuntime({ platform: 'linux', path: '/usr/bin', executable: async path => path,
    run: async (_file, args) => { count++; return args[0] === '--version' ? ok : { code: 1, out: '', errorCode: 'ENOENT' } }
  })
  assert.equal((await runtime.command('/notes', ['status'])).errorCode, 'GIT_UNAVAILABLE')
  await runtime.command('/notes', ['status'])
  assert.equal(count, 2)
})

test('macOS discovers Homebrew Git when it is absent from the application PATH', async () => {
  const runtime = createGitRuntime({ platform: 'darwin', path: '/usr/bin',
    executable: async path => path === '/opt/homebrew/bin/git' ? path : null, run: async () => ok
  })
  assert.deepEqual(await runtime.availability(), { path: '/opt/homebrew/bin/git' })
})
