// Opens a device's video stream (an rtsp:// address) in VLC. A web page cannot play RTSP, and the app
// does not decode video itself; VLC does it. The address is checked before anything is started, and
// VLC is started with the address as its only argument (no shell), so nothing else can be injected.
const childProcess = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { isPrivateIPv4 } = require('./nvx.cjs')

const MAX_URL_LENGTH = 300

/**
 * The address as a URL, or `null` when it is not one the app will open: it must be rtsp:// or rtsps://,
 * on a private network address, with no user name or password in it (VLC asks for those itself, so a
 * password never ends up in a saved file or a command line).
 */
function parseStreamUrl(input, { allowLoopback = false } = {}) {
  if (typeof input !== 'string' || input.length > MAX_URL_LENGTH || !/^[\x21-\x7e]+$/.test(input)) return null
  let url
  try {
    url = new URL(input)
  } catch {
    return null
  }
  if (url.protocol !== 'rtsp:' && url.protocol !== 'rtsps:') return null
  if (url.username || url.password) return null
  if (!isPrivateIPv4(url.hostname, { allowLoopback })) return null
  return url
}

/** Where VLC usually is. On Linux and macOS (development machines) the name on the PATH or the app bundle. */
function vlcCandidates(env = process.env, platform = process.platform) {
  if (platform === 'win32') {
    const { join } = path.win32
    return [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs')]
      .filter(Boolean)
      .map((base) => join(base, 'VideoLAN', 'VLC', 'vlc.exe'))
  }
  if (platform === 'darwin') return ['/Applications/VLC.app/Contents/MacOS/VLC']
  return ['vlc']
}

/**
 * Start VLC on a stream. Resolves with `{ ok: true }` once VLC has started, or `{ ok: false, error }`
 * with something to tell the person. The injected parts are for the tests.
 */
function openStream(input, { spawn = childProcess.spawn, exists = fs.existsSync, env = process.env, platform = process.platform, allowLoopback = false } = {}) {
  const url = parseStreamUrl(input, { allowLoopback })
  if (!url) {
    return Promise.resolve({ ok: false, error: 'The stream address must look like rtsp://10.0.0.5/… (a device on your network, with no password in it).' })
  }
  const candidates = vlcCandidates(env, platform)
  const absolute = platform === 'win32' ? path.win32.isAbsolute : path.posix.isAbsolute
  const exe = candidates.find((candidate) => !absolute(candidate) || exists(candidate))
  if (!exe) return Promise.resolve({ ok: false, error: 'VLC was not found. Install VLC, or copy the address and open it in your player.' })
  return new Promise((resolve) => {
    const child = spawn(exe, [url.href], { detached: true, stdio: 'ignore' })
    child.once('error', () => resolve({ ok: false, error: 'VLC could not be started. Install VLC, or copy the address and open it in your player.' }))
    child.once('spawn', () => {
      child.unref()
      resolve({ ok: true })
    })
  })
}

/** Wire it to the window. Only the app's own pages may call it. */
function registerStreamIpc(ipcMain, isTrusted) {
  ipcMain.handle('stream:open', (event, url) => {
    if (!isTrusted(event)) throw new Error('Untrusted sender')
    return openStream(url)
  })
}

module.exports = { parseStreamUrl, vlcCandidates, openStream, registerStreamIpc }
