import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { createUpdater, notesText, describeError } = createRequire(import.meta.url)('./updater.cjs')

const TOKEN = 'github_pat_11ABCDEFG0abcdefghijklmnopqrstuvwxyz0123456789'

/** electron-updater's autoUpdater, as far as the app uses it: an emitter with a few methods. */
function fakeAutoUpdater({ check = async () => {}, download = async () => {} } = {}) {
  const u = new EventEmitter()
  u.calls = { feeds: [], quit: [] }
  u.setFeedURL = (feed) => u.calls.feeds.push(feed)
  u.checkForUpdates = vi.fn(check.bind(null, u))
  u.downloadUpdate = vi.fn(download.bind(null, u))
  u.quitAndInstall = (...args) => u.calls.quit.push(args)
  return u
}

/** Stands in for Windows' DPAPI: scrambles, so a test can see the token is not stored as written. */
const fakeSafeStorage = (available = true) => ({
  isEncryptionAvailable: () => available,
  encryptString: (text) => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`),
  decryptString: (buffer) => Buffer.from(buffer.toString().slice(4), 'base64').toString(),
})

let dir
function setup({ mode = 'installed', autoUpdater = fakeAutoUpdater(), available = true } = {}) {
  dir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'updater-'))
  const states = []
  const tokenFile = path.join(dir, 'token.bin')
  const updater = createUpdater({
    autoUpdater,
    app: { getVersion: () => '0.1.0', isPackaged: true },
    safeStorage: fakeSafeStorage(available),
    tokenFile,
    repo: { owner: 'someone', repo: 'private-repo' },
    emit: (state) => states.push(state),
    getMode: () => mode,
  })
  return { updater, autoUpdater, states, tokenFile }
}

afterEach(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

describe('the token', () => {
  it('is kept encrypted, and never appears in what the page is told', () => {
    const { updater, tokenFile, states } = setup()
    expect(updater.getState().hasToken).toBe(false)
    expect(updater.setToken(`  ${TOKEN}  `)).toEqual({ ok: true })
    expect(fs.readFileSync(tokenFile, 'utf8')).not.toContain(TOKEN)
    expect(updater.getState().hasToken).toBe(true)
    expect(JSON.stringify([updater.getState(), ...states])).not.toContain(TOKEN)
  })

  it('refuses something that is not a token, and refuses to save it when the computer cannot encrypt', () => {
    const { updater, tokenFile } = setup()
    for (const text of ['', 'short', 'has spaces in it which is not a token', 'x'.repeat(300), undefined, 42]) {
      expect(updater.setToken(text)).toMatchObject({ ok: false })
    }
    expect(fs.existsSync(tokenFile)).toBe(false)
    const none = setup({ available: false })
    expect(none.updater.setToken(TOKEN)).toMatchObject({ ok: false, error: expect.stringContaining('cannot encrypt') })
    expect(fs.existsSync(none.tokenFile)).toBe(false)
  })

  it('can be removed, which also forgets an update that was found', async () => {
    const autoUpdater = fakeAutoUpdater({ check: async (u) => u.emit('update-available', { version: '0.2.0' }) })
    const { updater } = setup({ autoUpdater })
    updater.setToken(TOKEN)
    await updater.check()
    expect(updater.getState().status).toBe('available')
    updater.clearToken()
    expect(updater.getState()).toMatchObject({ hasToken: false, status: 'idle', available: null })
  })
})

describe('checking', () => {
  it('asks GitHub for the private repository with the token, and reports a newer version', async () => {
    const autoUpdater = fakeAutoUpdater({
      check: async (u) => u.emit('update-available', { version: '0.2.0', releaseNotes: '<h2>New</h2><ul><li>Terminal history</li><li>Images &amp; more</li></ul>' }),
    })
    const { updater, states } = setup({ autoUpdater })
    updater.setToken(TOKEN)
    await updater.check()
    expect(autoUpdater.calls.feeds).toEqual([{ provider: 'github', owner: 'someone', repo: 'private-repo', private: true, token: TOKEN }])
    expect(autoUpdater.autoDownload).toBe(false)
    expect(autoUpdater.autoInstallOnAppQuit).toBe(false)
    expect(states.map((s) => s.status)).toEqual(['idle', 'checking', 'available']) // the first is the page hearing that the token was saved
    expect(updater.getState()).toMatchObject({ version: '0.1.0', mode: 'installed', status: 'available', available: { version: '0.2.0' } })
    expect(updater.getState().available.notes).toBe('New\n• Terminal history\n• Images & more')
    expect(updater.getState().checkedAt).toEqual(expect.any(Number))
  })

  it('says when it is up to date', async () => {
    const { updater } = setup({ autoUpdater: fakeAutoUpdater({ check: async (u) => u.emit('update-not-available', {}) }) })
    updater.setToken(TOKEN)
    await updater.check()
    expect(updater.getState()).toMatchObject({ status: 'uptodate', available: null })
  })

  it('asks for a token first, and does not call GitHub without one', async () => {
    const { updater, autoUpdater } = setup()
    await updater.check()
    expect(updater.getState()).toMatchObject({ status: 'error', error: expect.stringContaining('token') })
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('does not check in a development build', async () => {
    const { updater, autoUpdater } = setup({ mode: 'dev' })
    updater.setToken(TOKEN)
    await updater.check()
    expect(updater.getState().error).toContain('installed app')
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('explains a refusal from GitHub and a missing connection in plain words', async () => {
    const refused = setup({ autoUpdater: fakeAutoUpdater({ check: async () => { throw new Error('Cannot find latest.yml in the latest release artifacts: HttpError: 404 Not Found') } }) })
    refused.updater.setToken(TOKEN)
    await refused.updater.check()
    expect(refused.updater.getState().error).toContain('did not let the app read the releases')

    const offline = setup({ autoUpdater: fakeAutoUpdater({ check: async () => { throw new Error('net::ERR_INTERNET_DISCONNECTED') } }) })
    offline.updater.setToken(TOKEN)
    await offline.updater.check()
    expect(offline.updater.getState().error).toContain('Could not reach GitHub')
  })

  it('shows an error that arrives as an event as well as one that is thrown, once', async () => {
    const autoUpdater = fakeAutoUpdater({ check: async (u) => { u.emit('error', new Error('getaddrinfo ENOTFOUND api.github.com')); throw new Error('getaddrinfo ENOTFOUND api.github.com') } })
    const { updater, states } = setup({ autoUpdater })
    updater.setToken(TOKEN)
    await updater.check()
    expect(updater.getState().status).toBe('error')
    expect(states.at(-1).error).toContain('Could not reach GitHub')
  })

  it('does not start a second check while one is running', async () => {
    let release
    const autoUpdater = fakeAutoUpdater({ check: () => new Promise((resolve) => (release = resolve)) })
    const { updater } = setup({ autoUpdater })
    updater.setToken(TOKEN)
    const first = updater.check()
    await updater.check()
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
    release()
    await first
  })
})

describe('the check at startup', () => {
  it('runs only for a real install that has a token, and never shows a failure', async () => {
    const { updater, autoUpdater } = setup({ autoUpdater: fakeAutoUpdater({ check: async () => { throw new Error('getaddrinfo ENOTFOUND') } }) })
    await updater.startupCheck()
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled() // no token yet

    updater.setToken(TOKEN)
    await updater.startupCheck()
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(updater.getState()).toMatchObject({ status: 'idle', error: null })

    const dev = setup({ mode: 'dev' })
    dev.updater.setToken(TOKEN)
    await dev.updater.startupCheck()
    expect(dev.autoUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('still reports a newer version', async () => {
    const { updater } = setup({ autoUpdater: fakeAutoUpdater({ check: async (u) => u.emit('update-available', { version: '0.3.0' }) }) })
    updater.setToken(TOKEN)
    await updater.startupCheck()
    expect(updater.getState()).toMatchObject({ status: 'available', available: { version: '0.3.0' } })
  })
})

describe('downloading and installing', () => {
  const found = (extra = {}) =>
    fakeAutoUpdater({
      check: async (u) => u.emit('update-available', { version: '0.2.0' }),
      download: async (u) => {
        u.emit('download-progress', { percent: 12.4, transferred: 1_000_000, total: 8_000_000, bytesPerSecond: 500_000 })
        u.emit('download-progress', { percent: 99.6, transferred: 7_900_000, total: 8_000_000, bytesPerSecond: 600_000 })
        u.emit('update-downloaded', { version: '0.2.0' })
      },
      ...extra,
    })

  it('follows the download and ends ready to install', async () => {
    const { updater, states } = setup({ autoUpdater: found() })
    updater.setToken(TOKEN)
    await updater.check()
    await updater.download()
    const progress = states.filter((s) => s.status === 'downloading').map((s) => s.progress.percent)
    expect(progress).toEqual([0, 12, 100])
    expect(updater.getState()).toMatchObject({ status: 'ready', progress: null })
  })

  it('installs only a downloaded update, by quitting into the installer', async () => {
    const autoUpdater = found()
    const { updater } = setup({ autoUpdater })
    updater.setToken(TOKEN)
    updater.install()
    expect(autoUpdater.calls.quit).toEqual([]) // nothing to install yet
    await updater.check()
    updater.install()
    expect(autoUpdater.calls.quit).toEqual([]) // found, but not downloaded
    await updater.download()
    updater.install()
    expect(autoUpdater.calls.quit).toEqual([[true, true]])
  })

  it('downloads nothing that was not found first', async () => {
    const autoUpdater = found()
    const { updater } = setup({ autoUpdater })
    updater.setToken(TOKEN)
    await updater.download()
    expect(autoUpdater.downloadUpdate).not.toHaveBeenCalled()
  })

  it('tells the portable version it cannot update itself, and downloads nothing', async () => {
    const autoUpdater = found()
    const { updater } = setup({ autoUpdater, mode: 'portable' })
    updater.setToken(TOKEN)
    await updater.check()
    expect(updater.getState().status).toBe('available') // it can still find out that there is a newer one
    await updater.download()
    expect(updater.getState()).toMatchObject({ status: 'error', error: expect.stringContaining('portable') })
    expect(autoUpdater.downloadUpdate).not.toHaveBeenCalled()
  })

  it('shows a failed download', async () => {
    const autoUpdater = found({ download: async () => { throw new Error('ECONNRESET') } })
    const { updater } = setup({ autoUpdater })
    updater.setToken(TOKEN)
    await updater.check()
    await updater.download()
    expect(updater.getState()).toMatchObject({ status: 'error', error: expect.stringContaining('Could not reach GitHub') })
  })
})

describe('words', () => {
  it('turns release notes into plain text and keeps them short', () => {
    expect(notesText('<p>One &amp; two</p><p>Three</p>')).toBe('One & two\nThree')
    expect(notesText([{ version: '1', note: 'A' }, { version: '2', note: 'B' }])).toBe('A\nB')
    expect(notesText(null)).toBe('')
    expect(notesText('x'.repeat(2000)).length).toBeLessThanOrEqual(701)
  })

  it('names the likely causes of a failure', () => {
    expect(describeError(new Error('HttpError: 401 Bad credentials'))).toContain('token')
    expect(describeError(new Error('connect ETIMEDOUT 140.82.0.1:443'))).toContain('Could not reach GitHub')
    expect(describeError(new Error('Something odd\nwith a stack'))).toBe('Something odd')
    expect(describeError(undefined)).toBe('The update check failed.')
  })
})
