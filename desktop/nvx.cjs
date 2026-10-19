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
//
// It is a small Postman: any of GET / POST / PUT / PATCH / DELETE to any path on the device, with
// your own headers and body, through the same logged-in session. The manual's way to change a
// setting is a POST of a partial CresNext object to /Device.
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

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const MAX_BODY_BYTES = 100 * 1024
const MAX_HEADERS = 20
/** Headers the app sets itself or that could smuggle a second request. */
const BLOCKED_HEADERS = new Set(['cookie', 'host', 'content-length', 'transfer-encoding', 'connection', 'keep-alive', 'upgrade', 'expect', 'te', 'trailer'])
/** Pictures the page can show. (SVG is left out: it is treated as text.) */
const IMAGE_TYPE = /^image\/(png|jpe?g|gif|webp|bmp)\b/i

/** Why `headers` cannot be sent, as a message for the person, or `null` when they can. */
function checkHeaders(headers) {
  if (headers === undefined || headers === null) return null
  if (typeof headers !== 'object' || Array.isArray(headers)) return 'Headers must be a list of name and value pairs.'
  const entries = Object.entries(headers)
  if (entries.length > MAX_HEADERS) return `At most ${MAX_HEADERS} headers can be sent.`
  for (const [name, value] of entries) {
    if (!/^[A-Za-z0-9-]+$/.test(name)) return `"${name}" is not a valid header name.`
    if (BLOCKED_HEADERS.has(name.toLowerCase()) || name.toLowerCase().startsWith('proxy-')) return `The ${name} header is set by the app and cannot be changed.`
    if (typeof value !== 'string' || value.length > 500 || !/^[\x20-\x7e]*$/.test(value)) return `The value of the ${name} header must be plain text on one line.`
  }
  return null
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

/** What a failed answer means, in a sentence. */
function describeFailure(status, method, path) {
  if (status === 404) return `${path} was not found on the device (HTTP 404).`
  if (status === 403 && method !== 'GET') {
    return 'The device refused the request (HTTP 403) even after logging in again. The account may not be allowed to do this, or the device wants an extra security header.'
  }
  return `The device answered HTTP ${status}.`
}

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
 * One HTTPS exchange. Resolves with the status, headers and body bytes, whatever the status is;
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
          accept: 'application/json, text/html, image/*, */*',
          ...(cookies ? { cookie: cookies } : {}),
          ...(body === undefined ? {} : { 'content-length': Buffer.byteLength(body) }),
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
          resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) })
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
        'content-type': 'application/x-www-form-urlencoded',
        origin: base,
        referer: `${base}/userlogin.html`,
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

  /** The double-submit token some Crestron web services want back as a header, when the device hands one out as a cookie. */
  const xsrfHeader = (jar) => (jar.has('CREST-XSRF-TOKEN') ? { 'x-crest-xsrf-token': jar.get('CREST-XSRF-TOKEN') } : {})

  /** One request through the device's session: logs in when needed, and again once if the device says 403. */
  async function exchange(ip, { username, password }, { method, path, headers, body }) {
    const session = sessionFor(ip)
    const run = async () => {
      const sameLogin = session.username === username && session.password === password
      if (!sameLogin || !session.jar.has('AuthByPasswd')) await login(ip, session, username, password)
      const attempt = () =>
        send({ ip, port, method, path, headers: { referer: `https://${ip}/`, ...xsrfHeader(session.jar), ...headers }, body, jar: session.jar, timeoutMs })
      let response = await attempt()
      if (response.status === 403) {
        // Expired session: log in again once and retry.
        await login(ip, session, username, password)
        response = await attempt()
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
      await send({ ip, port, method: 'GET', path: '/logout', headers: { referer: `https://${ip}/` }, jar: session.jar, timeoutMs })
    } catch {
      // Best effort: the device drops idle sessions on its own.
    }
  }

  const logoutAll = () => Promise.all([...sessions.keys()].map(logout))

  /** The request as it will go on the wire, or `{ error }` for the person when it cannot be sent. */
  function build({ ip, method = 'GET', path, headers, body }) {
    const verb = typeof method === 'string' ? method.toUpperCase() : ''
    if (!METHODS.has(verb)) return { error: `The method must be one of ${[...METHODS].join(', ')}.` }
    if (!isValidPath(path)) return { error: 'The path must start with / and contain no spaces (for example /Device/DeviceInfo).' }
    const headerProblem = checkHeaders(headers)
    if (headerProblem) return { error: headerProblem }
    if (body !== undefined && typeof body !== 'string') return { error: 'The body must be text.' }
    const hasBody = typeof body === 'string' && body !== ''
    if (hasBody && verb === 'GET') return { error: 'A GET request has no body. Use POST (or PUT, PATCH, DELETE) to send one.' }
    if (hasBody && Buffer.byteLength(body) > MAX_BODY_BYTES) return { error: 'The body is too large.' }
    const own = Object.fromEntries(Object.entries(headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]))
    return {
      request: {
        method: verb,
        path,
        body: hasBody ? body : undefined,
        // Like a browser: a body is JSON unless said otherwise, and a change names its origin. Your own headers win.
        headers: { ...(hasBody ? { 'content-type': 'application/json' } : {}), ...(verb === 'GET' ? {} : { origin: `https://${ip}` }), ...own },
      },
    }
  }

  /**
   * What the page calls. Validates the request, runs it and turns every outcome (including a failure)
   * into a plain object, so the page never sees an exception.
   */
  async function request(input) {
    const started = Date.now()
    const done = (fields) => ({ ok: false, status: null, ms: Date.now() - started, ...fields })
    const { ip, username, password } = input ?? {}
    if (!isPrivateIPv4(ip, { allowLoopback })) return done({ kind: 'invalid', error: 'Enter the device IPv4 address on your network (for example 10.0.0.5).' })
    if (typeof username !== 'string' || !username || typeof password !== 'string') return done({ kind: 'invalid', error: 'Enter the username and password for the device.' })
    const built = build(input)
    if (built.error) return done({ kind: 'invalid', error: built.error })
    const { method, path } = built.request
    try {
      const response = await exchange(ip, { username, password }, built.request)
      const type = String(response.headers['content-type'] ?? '')
      const isImage = IMAGE_TYPE.test(type) && response.body.length > 0
      const text = isImage ? undefined : response.body.toString('utf8')
      let data
      try {
        data = text === undefined ? undefined : JSON.parse(text)
      } catch {
        data = undefined
      }
      const ok = response.status >= 200 && response.status < 300
      return done({
        ok,
        status: response.status,
        bytes: response.body.length,
        // Everything but the session cookies, which are the keys to the device.
        headers: Object.fromEntries(Object.entries(response.headers).filter(([name, value]) => name !== 'set-cookie' && typeof value === 'string')),
        data,
        text,
        ...(isImage ? { image: { type: type.split(';')[0].trim(), base64: response.body.toString('base64') } } : {}),
        ...(ok ? {} : { kind: 'http', error: describeFailure(response.status, method, path) }),
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
  ipcMain.handle('nvx:request', (event, input) => {
    if (!isTrusted(event)) throw new Error('Untrusted sender')
    return client.request(input)
  })
  ipcMain.handle('nvx:logout', (event, ip) => {
    if (!isTrusted(event)) throw new Error('Untrusted sender')
    return client.logout(ip)
  })
}

module.exports = { createNvxClient, registerNvxIpc, isPrivateIPv4, isValidPath, updateJar, checkHeaders }
