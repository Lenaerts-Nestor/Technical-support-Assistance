// Talks to Crestron devices over their HTTPS REST API (DM NVX and others that use the same
// CresNext login). A web page cannot do this login itself (it has to set Cookie / Origin /
// Referer headers and keep HttpOnly cookies), so it runs here, in the app's main process.
//
// The login follows "Authentication" in the DM NVX API manual:
//   1. GET  /userlogin.html         -> TRACKID cookie
//   2. POST /userlogin.html         -> Cookie: TRACKID, Origin, Referer, body login=..&passwd=..
//   3. keep every cookie; AuthByPasswd changes on each response
//   4. GET  /logout                 -> ends the session
// A 403 means bad credentials or an expired session.
const https = require('node:https')
const net = require('node:net')

const REQUEST_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024
const MAX_PATH_LENGTH = 500

/** Only these devices' certificates are accepted unchecked: the self-signed ones NVX units ship with. */
const insecureAgent = new https.Agent({ rejectUnauthorized: false })

/** Private LAN addresses only, so the app can never be pointed at the internet. */
function isPrivateIPv4(ip, { allowLoopback = false } = {}) {
  if (!net.isIPv4(ip)) return false
  const [a, b] = ip.split('.').map(Number)
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  return allowLoopback && a === 127
}

/** A path on the device: starts with one slash, printable ASCII only, no spaces. */
function isValidPath(path) {
  return (
    typeof path === 'string' &&
    path.length <= MAX_PATH_LENGTH &&
    /^\/[\x21-\x7e]*$/.test(path) &&
    !path.startsWith('//')
  )
}

/** Fold a response's Set-Cookie headers into the jar; an expired cookie removes its entry. */
function updateJar(jar, setCookie) {
  for (const line of setCookie ?? []) {
    const [pair, ...attributes] = line.split(';')
    const eq = pair.indexOf('=')
    if (eq < 1) continue
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    const expired = attributes.some((attribute) => {
      const [key, raw = ''] = attribute.split('=').map((s) => s.trim())
      if (/^max-age$/i.test(key)) return Number(raw) <= 0
      if (/^expires$/i.test(key)) return Date.parse(raw) <= Date.now()
      return false
    })
    if (expired || value === '') jar.delete(name)
    else jar.set(name, value)
  }
}

const cookieHeader = (jar) => [...jar].map(([name, value]) => `${name}=${value}`).join('; ')

class NvxError extends Error {
  constructor(kind, message, status = null) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

function describeNetworkError(error, ip, port) {
  switch (error.code) {
    case 'ECONNREFUSED':
      return `${ip} refused the connection on HTTPS (port ${port}). Is HTTPS / authentication enabled on the device?`
    case 'EHOSTUNREACH':
    case 'ENETUNREACH':
      return `${ip} cannot be reached from this computer (no route to the device).`
    case 'ETIMEDOUT':
    case 'ESOCKETTIMEDOUT':
      return `No answer from ${ip} (timed out).`
    default:
      return `Could not talk to ${ip}: ${error.message}`
  }
}

/**
 * One HTTPS exchange. Resolves with the status, headers and text, whatever the status is;
 * rejects only when nothing came back.
 */
function send({ ip, port, method, path, headers, body, jar, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const cookies = cookieHeader(jar)
    const request = https.request(
      {
        host: ip,
        port,
        method,
        path,
        agent: insecureAgent,
        headers: {
          Accept: 'application/json, text/html, */*',
          ...(cookies ? { Cookie: cookies } : {}),
          ...(body === undefined ? {} : { 'Content-Length': Buffer.byteLength(body) }),
          ...headers,
        },
      },
      (response) => {
        const chunks = []
        let size = 0
        response.on('data', (chunk) => {
          size += chunk.length
          if (size > MAX_RESPONSE_BYTES) {
            request.destroy(new NvxError('http', 'The device sent more data than expected.'))
            return
          }
          chunks.push(chunk)
        })
        response.on('end', () => {
          updateJar(jar, response.headers['set-cookie'])
          resolve({ status: response.statusCode ?? 0, headers: response.headers, text: Buffer.concat(chunks).toString('utf8') })
        })
        response.on('error', reject)
      },
    )
    // One deadline for the whole exchange. `request.setTimeout` only starts once connected, so an
    // address that silently drops packets (a mistyped IP) would wait for the OS's own, much longer, limit.
    const deadline = setTimeout(() => request.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })), timeoutMs)
    request.on('close', () => clearTimeout(deadline))
    request.on('error', (error) => reject(error instanceof NvxError ? error : new NvxError('network', describeNetworkError(error, ip, port))))
    if (body !== undefined) request.write(body)
    request.end()
  })
}

/**
 * Keeps one logged-in session per device and runs GET requests through it. Requests to the
 * same device go one at a time, because AuthByPasswd rotates on every response.
 */
function createNvxClient({ port = 443, allowLoopback = false, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  /** ip -> { jar, username, password, queue } */
  const sessions = new Map()

  const sessionFor = (ip) => {
    let session = sessions.get(ip)
    if (!session) {
      session = { jar: new Map(), username: null, password: null, queue: Promise.resolve() }
      sessions.set(ip, session)
    }
    return session
  }

  async function login(ip, session, username, password) {
    session.jar.clear()
    const base = `https://${ip}`
    const first = await send({ ip, port, method: 'GET', path: '/userlogin.html', jar: session.jar, timeoutMs })
    if (!session.jar.has('TRACKID')) {
      throw new NvxError('auth', `${ip} did not offer a login (no TRACKID cookie). Is authentication enabled on the device?`, first.status)
    }
    const body = `login=${encodeURIComponent(username)}&passwd=${encodeURIComponent(password)}`
    const second = await send({
      ip,
      port,
      method: 'POST',
      path: '/userlogin.html',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: base,
        Referer: `${base}/userlogin.html`,
      },
      body,
      jar: session.jar,
      timeoutMs,
    })
    // A good login redirects to "/" (or answers 200 when a client follows it) and sets AuthByPasswd.
    const accepted = (second.status === 302 || second.status === 200) && session.jar.has('AuthByPasswd')
    if (!accepted) {
      session.jar.clear()
      const refused = [200, 302, 403].includes(second.status)
      throw new NvxError('auth', refused ? 'Login refused: wrong username or password.' : `Login failed (HTTP ${second.status}).`, second.status)
    }
    session.username = username
    session.password = password
  }

  async function get(ip, path, { username, password }) {
    const session = sessionFor(ip)
    const run = async () => {
      const sameLogin = session.username === username && session.password === password
      if (!sameLogin || !session.jar.has('AuthByPasswd')) await login(ip, session, username, password)
      const request = () => send({ ip, port, method: 'GET', path, headers: { Referer: `https://${ip}/` }, jar: session.jar, timeoutMs })
      let response = await request()
      if (response.status === 403) {
        // Expired session: log in again once and retry.
        await login(ip, session, username, password)
        response = await request()
      }
      return response
    }
    // Chain onto the device's queue; a failed request must not block the next one.
    const result = session.queue.then(run, run)
    session.queue = result.catch(() => {})
    return result
  }

  async function logout(ip) {
    const session = sessions.get(ip)
    if (!session) return
    sessions.delete(ip)
    if (!session.jar.size) return
    try {
      await send({ ip, port, method: 'GET', path: '/logout', headers: { Referer: `https://${ip}/` }, jar: session.jar, timeoutMs })
    } catch {
      // Best effort: the device drops idle sessions on its own.
    }
  }

  const logoutAll = () => Promise.all([...sessions.keys()].map(logout))

  /**
   * What the page calls. Validates the request, runs it and turns every outcome (including a
   * failure) into a plain object, so the page never sees an exception.
   */
  async function request(input) {
    const started = Date.now()
    const done = (fields) => ({ ok: false, status: null, ms: Date.now() - started, ...fields })
    const { ip, username, password, path } = input ?? {}
    if (!isPrivateIPv4(ip, { allowLoopback })) return done({ kind: 'invalid', error: 'Enter the device IPv4 address on your network (for example 10.0.0.5).' })
    if (!isValidPath(path)) return done({ kind: 'invalid', error: 'The path must start with / and contain no spaces (for example /Device/DeviceInfo).' })
    if (typeof username !== 'string' || !username || typeof password !== 'string') return done({ kind: 'invalid', error: 'Enter the username and password for the device.' })
    try {
      const response = await get(ip, path, { username, password })
      let data
      try {
        data = JSON.parse(response.text)
      } catch {
        data = undefined
      }
      const ok = response.status >= 200 && response.status < 300
      return done({
        ok,
        status: response.status,
        data,
        text: response.text,
        ...(ok ? {} : { kind: 'http', error: response.status === 404 ? `${path} was not found on the device (HTTP 404).` : `The device answered HTTP ${response.status}.` }),
      })
    } catch (error) {
      if (error instanceof NvxError) return done({ kind: error.kind, status: error.status, error: error.message })
      return done({ kind: 'network', error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` })
    }
  }

  return { request, logout: (ip) => (isPrivateIPv4(ip, { allowLoopback }) ? logout(ip) : Promise.resolve()), logoutAll }
}

/**
 * Wire the client to the window. Only the app's own pages may call it.
 * `isTrusted(event)` decides who that is.
 */
function registerNvxIpc(ipcMain, client, isTrusted) {
  ipcMain.handle('nvx:get', (event, input) => {
    if (!isTrusted(event)) throw new Error('Untrusted sender')
    return client.request(input)
  })
  ipcMain.handle('nvx:logout', (event, ip) => {
    if (!isTrusted(event)) throw new Error('Untrusted sender')
    return client.logout(ip)
  })
}

module.exports = { createNvxClient, registerNvxIpc, isPrivateIPv4, isValidPath, updateJar }
