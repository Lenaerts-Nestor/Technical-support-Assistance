// Checks for a newer version of the app and installs it, using electron-updater.
//
// The repository is private, so the app reads its releases with a GitHub token that the person pastes
// once on the Sync page. The token is never part of the app or the repository: it is kept on this
// computer, encrypted with the operating system's own protection (Windows DPAPI), and is only ever
// handed to electron-updater when a check runs. It is not part of the state sent to the page.
//
// Only the installed version (the setup.exe) can update itself. The portable file can check and tell
// you a newer version exists, but cannot replace itself.
const fs = require('node:fs')

/** GitHub tokens are letters, digits, "_" and "-" (github_pat_…, ghp_…). */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,255}$/
const NOTES_LIMIT = 700

/** Release notes as plain text: GitHub hands them over as HTML (or, rarely, a list of per-version notes). */
function notesText(releaseNotes) {
  const raw = Array.isArray(releaseNotes) ? releaseNotes.map((n) => n?.note ?? '').join('\n') : String(releaseNotes ?? '')
  const text = raw
    .replace(/<\/(p|li|h\d|div|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text.length > NOTES_LIMIT ? `${text.slice(0, NOTES_LIMIT).trimEnd()}…` : text
}

/** What a failure means, in a sentence for the person. */
function describeError(error) {
  const message = String(error?.message ?? error ?? '')
  if (/\b(401|403|404)\b|Bad credentials|Not Found|Unauthorized|Forbidden/i.test(message)) {
    return 'GitHub did not let the app read the releases. Check that the token is still valid and has read access to this repository’s contents (or that a release has been published).'
  }
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|net::|getaddrinfo|socket hang up|timed? ?out/i.test(message)) {
    return 'Could not reach GitHub. Check the internet connection and try again.'
  }
  return message.split('\n')[0].slice(0, 300) || 'The update check failed.'
}

/**
 * `autoUpdater` is electron-updater's; `safeStorage` is Electron's. `emit(state)` is how the page hears of
 * every change. `feedFor(token)` and `getMode()` have defaults and exist for the tests.
 */
function createUpdater({ autoUpdater, app, safeStorage, tokenFile, repo, emit = () => {}, feedFor, getMode }) {
  const mode = getMode ?? (() => (!app.isPackaged ? 'dev' : process.env.PORTABLE_EXECUTABLE_DIR ? 'portable' : 'installed'))
  const feed = feedFor ?? ((token) => ({ provider: 'github', owner: repo.owner, repo: repo.repo, private: true, token }))

  let state = { status: 'idle', available: null, progress: null, error: null, checkedAt: null }
  /** True while a check started at startup runs: its failures are not shown. */
  let quiet = false

  const hasToken = () => fs.existsSync(tokenFile)
  const snapshot = () => ({ ...state, mode: mode(), version: app.getVersion(), hasToken: hasToken() })
  const set = (patch) => {
    state = { ...state, ...patch }
    emit(snapshot())
  }

  function readToken() {
    try {
      return safeStorage.decryptString(fs.readFileSync(tokenFile))
    } catch {
      return null
    }
  }

  const fail = (error) => {
    if (quiet) set({ status: 'idle', error: null })
    else set({ status: 'error', error: describeError(error) })
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowPrerelease = false
  autoUpdater.disableDifferentialDownload = true // a full download is simple and works the same for a private repository
  autoUpdater.on('update-available', (info) =>
    set({ status: 'available', available: { version: info.version, notes: notesText(info.releaseNotes) }, error: null, checkedAt: Date.now() }),
  )
  autoUpdater.on('update-not-available', () => set({ status: 'uptodate', available: null, error: null, checkedAt: Date.now() }))
  autoUpdater.on('download-progress', (p) =>
    set({ status: 'downloading', progress: { percent: Math.round(p.percent ?? 0), transferred: p.transferred ?? 0, total: p.total ?? 0, bytesPerSecond: p.bytesPerSecond ?? 0 } }),
  )
  autoUpdater.on('update-downloaded', () => set({ status: 'ready', progress: null }))
  autoUpdater.on('error', fail)

  const api = {
    getState: snapshot,

    /** Keep the token (encrypted) for next time. Resolves with `{ ok: true }` or `{ ok: false, error }`. */
    setToken(text) {
      const token = typeof text === 'string' ? text.trim() : ''
      if (!TOKEN_PATTERN.test(token)) return { ok: false, error: 'That does not look like a GitHub token (letters, digits, _ and -, usually starting with github_pat_).' }
      if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'This computer cannot encrypt the token, so it is not saved.' }
      try {
        fs.writeFileSync(tokenFile, safeStorage.encryptString(token), { mode: 0o600 })
      } catch {
        return { ok: false, error: 'The token could not be saved.' }
      }
      set({ error: null })
      return { ok: true }
    },

    clearToken() {
      fs.rmSync(tokenFile, { force: true })
      set({ status: 'idle', available: null, progress: null, error: null })
      return { ok: true }
    },

    /** Ask GitHub for the latest release. `silent` is for the check at startup: it never shows an error. */
    async check({ silent = false } = {}) {
      if (mode() === 'dev') {
        if (!silent) set({ status: 'error', error: 'Updates are checked in the installed app, not in a development build.' })
        return
      }
      const token = hasToken() ? readToken() : null
      if (!token) {
        if (!silent) set({ status: 'error', error: 'Add a GitHub token first (see below).' })
        return
      }
      if (['checking', 'downloading', 'ready'].includes(state.status)) return
      quiet = silent
      set({ status: 'checking', error: null })
      try {
        autoUpdater.setFeedURL(feed(token))
        await autoUpdater.checkForUpdates()
      } catch (error) {
        fail(error)
      } finally {
        quiet = false
      }
    },

    async download() {
      if (state.status !== 'available') return
      if (mode() !== 'installed') {
        set({ status: 'error', error: 'The portable version cannot update itself. Install the setup version to update from here.' })
        return
      }
      set({ status: 'downloading', progress: { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 }, error: null })
      try {
        await autoUpdater.downloadUpdate()
      } catch (error) {
        fail(error)
      }
    },

    /** Close the app and run the downloaded installer, which starts the new version. */
    install() {
      if (state.status !== 'ready') return
      autoUpdater.quitAndInstall(true, true)
    },

    /** The quiet check a moment after the app starts: only when there is a token and this is a real install. */
    startupCheck() {
      if (mode() === 'dev' || !hasToken()) return Promise.resolve()
      return api.check({ silent: true })
    },
  }
  return api
}

/** Wire the updater to the window. Only the app's own pages may use it. */
function registerUpdaterIpc(ipcMain, updater, isTrusted) {
  const guarded = (name, run) =>
    ipcMain.handle(name, (event, ...args) => {
      if (!isTrusted(event)) throw new Error('Untrusted sender')
      return run(...args)
    })
  guarded('updater:state', () => updater.getState())
  guarded('updater:check', () => updater.check())
  guarded('updater:download', () => updater.download())
  guarded('updater:install', () => updater.install())
  guarded('updater:setToken', (token) => updater.setToken(token))
  guarded('updater:clearToken', () => updater.clearToken())
}

module.exports = { createUpdater, registerUpdaterIpc, notesText, describeError }
