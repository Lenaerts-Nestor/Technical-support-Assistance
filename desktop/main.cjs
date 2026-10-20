// Electron shell for Support Hub: loads the built web app in a window.
// Everything the pages store stays on this computer; nothing here talks to the network.
const { app, BrowserWindow, Menu, ipcMain, net, protocol, safeStorage, session, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { createNvxClient, registerNvxIpc } = require('./nvx.cjs')
const { createTerminalManager, registerTerminalIpc } = require('./terminal.cjs')
const { createUpdater, registerUpdaterIpc } = require('./updater.cjs')

const SCHEME = 'app'
const HOST = 'support-hub'
const APP_ORIGIN = `${SCHEME}://${HOST}`
const DIST_DIR = path.join(__dirname, '..', 'dist')

// Chosen before `ready` so the profile folder (localStorage, IndexedDB) is named after the app.
app.setName('Support Hub')

// The built app is served from its own secure origin instead of file://, so
// localStorage, IndexedDB and the folder picker behave exactly as they do on the web.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
])

/** Answer app://support-hub/<path> from the dist folder; unknown paths fall back to index.html. */
function serveApp(request) {
  const { hostname, pathname } = new URL(request.url)
  if (hostname !== HOST) return new Response('Not found', { status: 404 })

  const requested = path.join(DIST_DIR, decodeURIComponent(pathname))
  const inside = requested === DIST_DIR || requested.startsWith(DIST_DIR + path.sep)
  if (!inside) return new Response('Forbidden', { status: 403 })

  const isFile = fs.existsSync(requested) && fs.statSync(requested).isFile()
  return net.fetch(pathToFileURL(isFile ? requested : path.join(DIST_DIR, 'index.html')).toString())
}

/** Where new versions are published (releases of the private repository, read with the person's token). */
const UPDATE_REPO = { owner: 'Lenaerts-Nestor', repo: 'Technical-support-Assistance' }

const nvx = createNvxClient()
/** Created once the app is ready, because it keeps its remembered SSH host keys in the user-data folder. */
let terminals = null

/** Only the app's own page may use the device bridge. */
const isTrustedSender = (event) => {
  const url = event.senderFrame?.url ?? ''
  return url.startsWith(APP_ORIGIN) || Boolean(devUrl() && url.startsWith(devUrl()))
}

/** What the pages may ask the browser for. Everything else is denied. */
const ALLOWED_PERMISSIONS = new Set(['fileSystem', 'clipboard-sanitized-write'])

function restrictPermissions() {
  const ses = session.defaultSession
  // The check handler is also what lets the remembered folder keep its access between launches.
  ses.setPermissionCheckHandler((_contents, permission, origin) =>
    origin.startsWith(APP_ORIGIN) && ALLOWED_PERMISSIONS.has(permission),
  )
  ses.setPermissionRequestHandler((contents, permission, callback) =>
    callback(contents.getURL().startsWith(APP_ORIGIN) && ALLOWED_PERMISSIONS.has(permission)),
  )
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    title: 'Support Hub',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())

  // Web links (the Links page, guides) open in the normal browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_ORIGIN) && !(devUrl() && url.startsWith(devUrl()))) event.preventDefault()
  })

  // No menu bar; F12 or Ctrl+Shift+I still opens the developer tools for troubleshooting.
  win.webContents.on('before-input-event', (event, input) => {
    const toggle = input.type === 'keyDown' && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))
    if (toggle) {
      win.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  void win.loadURL(devUrl() ?? `${APP_ORIGIN}/`)
  return win
}

/** `npm run desktop:dev` points the window at the Vite dev server instead of the built app. */
function devUrl() {
  return process.env.SUPPORT_HUB_DEV_URL || null
}

// One window only: two copies would fight over the same saved data.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    protocol.handle(SCHEME, serveApp)
    restrictPermissions()
    registerNvxIpc(ipcMain, nvx, isTrustedSender)
    terminals = createTerminalManager({ knownHostsFile: path.join(app.getPath('userData'), 'known-hosts.json') })
    registerTerminalIpc(ipcMain, terminals, isTrustedSender)
    const updater = createUpdater({
      autoUpdater,
      app,
      safeStorage,
      tokenFile: path.join(app.getPath('userData'), 'update-token.bin'),
      repo: UPDATE_REPO,
      emit: (state) => BrowserWindow.getAllWindows().forEach((win) => win.webContents.send('updater:state', state)),
    })
    registerUpdaterIpc(ipcMain, updater, isTrustedSender)
    createWindow()
    // A quiet check a moment after start-up (only with a token, and only in an installed app).
    setTimeout(() => void updater.startupCheck(), 5000)
  })

  app.on('window-all-closed', () => app.quit())

  // Leave devices tidily: close every terminal and end every login before quitting (but never wait more than 2 seconds).
  let closing = false
  app.on('before-quit', (event) => {
    if (closing) return
    closing = true
    event.preventDefault()
    terminals?.closeAll()
    void Promise.race([nvx.logoutAll(), new Promise((resolve) => setTimeout(resolve, 2000))]).finally(() => app.quit())
  })
}
