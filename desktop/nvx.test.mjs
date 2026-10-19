import { createRequire } from 'node:module'
import https from 'node:https'
import { randomBytes } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { generate } from 'selfsigned'

const { createNvxClient, isPrivateIPv4, isValidPath, updateJar } = createRequire(import.meta.url)('./nvx.cjs')

/** A throwaway self-signed certificate, like the one an NVX ships with. Made fresh for each run. */
let tls
beforeAll(async () => {
  const pems = await generate([{ name: 'commonName', value: 'mock-nvx.test' }], { days: 2, keySize: 2048 })
  tls = { key: pems.private, cert: pems.cert }
})

const parseCookies = (header = '') =>
  Object.fromEntries(header.split(';').map((p) => p.trim().split(/=(.*)/s).slice(0, 2)).filter(([k]) => k))
const token = () => randomBytes(8).toString('hex')

/**
 * A device that behaves as the DM NVX API manual describes: TRACKID from GET /userlogin.html,
 * a POST that needs Cookie + Origin + Referer, six cookies back, AuthByPasswd that changes on
 * every response, 403 when the session is wrong, and GET /logout.
 */
async function startMockDevice({ user = 'admin', password = 'secret' } = {}) {
  const state = { sessions: new Map(), pending: new Set(), loginPosts: [], forbidden: 0, requests: [], logouts: 0 }
  const server = https.createServer(tls, (req, res) => {
    const cookies = parseCookies(req.headers.cookie)
    const reply = (status, body, headers = {}) => {
      res.writeHead(status, headers)
      res.end(body)
    }
    if (req.method === 'GET' && req.url === '/userlogin.html') {
      const id = token()
      state.pending.add(id)
      return reply(200, '<html>login</html>', { 'Set-Cookie': [`TRACKID=${id}; Path=/; Secure; HttpOnly`] })
    }
    if (req.method === 'POST' && req.url === '/userlogin.html') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const form = new URLSearchParams(body)
        state.loginPosts.push({ cookie: req.headers.cookie, origin: req.headers.origin, referer: req.headers.referer, contentType: req.headers['content-type'], form: Object.fromEntries(form) })
        if (!state.pending.has(cookies.TRACKID) || form.get('login') !== user || form.get('passwd') !== password) {
          state.forbidden++
          return reply(403, 'Forbidden')
        }
        const session = { auth: token() }
        state.sessions.set(cookies.TRACKID, session)
        return reply(302, '', {
          Location: '/',
          'Set-Cookie': [
            `AuthByPasswd=${session.auth}; Path=/; Secure; HttpOnly`,
            `TRACKID=${cookies.TRACKID}; Path=/; Secure; HttpOnly`,
            'iv=aa; Path=/; Secure; HttpOnly',
            'tag=bb; Path=/; Secure; HttpOnly',
            'userid=cc; Path=/; Secure; HttpOnly',
            'userstr=dd; Path=/; Secure; HttpOnly',
          ],
        })
      })
      return
    }
    const session = state.sessions.get(cookies.TRACKID)
    if (!session || session.auth !== cookies.AuthByPasswd || !cookies.userid || !cookies.userstr) {
      state.forbidden++
      return reply(403, 'Forbidden')
    }
    if (req.url === '/logout') {
      state.logouts++
      state.sessions.delete(cookies.TRACKID)
      return reply(200, 'bye', { 'Set-Cookie': ['AuthByPasswd=; Max-Age=0; Path=/', 'TRACKID=; Max-Age=0; Path=/'] })
    }
    state.requests.push({ url: req.url, referer: req.headers.referer })
    session.auth = token()
    const headers = { 'Set-Cookie': [`AuthByPasswd=${session.auth}; Path=/; Secure; HttpOnly`] }
    if (req.url === '/Device/DeviceInfo') return reply(200, JSON.stringify({ Device: { DeviceInfo: { Model: 'DM-NVX-E30', Name: 'Lab encoder' } } }), headers)
    if (req.url === '/Device/Ethernet/HostName') return reply(200, JSON.stringify({ Device: { Ethernet: { HostName: 'NVX-LAB' } } }), headers)
    if (req.url === '/plain') return reply(200, 'not json', headers)
    if (req.url === '/hang') return // the device never answers
    return reply(404, 'nope', headers)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { state, port: server.address().port, close: () => new Promise((resolve) => server.close(resolve)) }
}

let device
afterEach(async () => {
  await device?.close()
  device = undefined
})

const creds = { username: 'admin', password: 'secret' }
const clientFor = (d) => createNvxClient({ port: d.port, allowLoopback: true })

describe('device login', () => {
  it('logs in the way the manual describes, then reads a path', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    const result = await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ Device: { DeviceInfo: { Model: 'DM-NVX-E30', Name: 'Lab encoder' } } })

    const [post] = device.state.loginPosts
    expect(post.cookie).toMatch(/^TRACKID=[0-9a-f]+$/)
    expect(post.origin).toBe('https://127.0.0.1')
    expect(post.referer).toBe('https://127.0.0.1/userlogin.html')
    expect(post.contentType).toBe('application/x-www-form-urlencoded')
    expect(post.form).toEqual({ login: 'admin', passwd: 'secret' })
    expect(device.state.requests[0].referer).toBe('https://127.0.0.1/')
  })

  it('reuses one login for many requests and follows the changing AuthByPasswd cookie', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    for (const path of ['/Device/DeviceInfo', '/Device/Ethernet/HostName', '/Device/DeviceInfo']) {
      expect((await client.request({ ip: '127.0.0.1', path, ...creds })).ok).toBe(true)
    }
    expect(device.state.loginPosts).toHaveLength(1)
    expect(device.state.forbidden).toBe(0)
  })

  it('keeps simultaneous requests to one device in order so the cookie never goes stale', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })
    // Sent together, each request would carry the same AuthByPasswd and all but the first would be refused.
    const results = await Promise.all(
      Array.from({ length: 6 }, () => client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })),
    )
    expect(results.every((r) => r.ok)).toBe(true)
    expect(device.state.forbidden).toBe(0)
    expect(device.state.loginPosts).toHaveLength(1)
  })

  it('says so when the password is wrong, and does not retry in a loop', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    const result = await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', username: 'admin', password: 'nope' })
    expect(result).toMatchObject({ ok: false, kind: 'auth', error: 'Login refused: wrong username or password.' })
    expect(device.state.loginPosts).toHaveLength(1)
  })

  it('logs in again by itself when the device drops the session', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    expect((await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })).ok).toBe(true)
    device.state.sessions.clear() // the device forgets the session (timeout)
    const again = await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })
    expect(again.ok).toBe(true)
    expect(device.state.loginPosts).toHaveLength(2)
  })

  it('logs in again when the credentials change', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })
    const wrong = await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', username: 'admin', password: 'other' })
    expect(wrong.kind).toBe('auth')
  })

  it('ends the session with GET /logout', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })
    await client.logout('127.0.0.1')
    expect(device.state.logouts).toBe(1)
    expect(device.state.sessions.size).toBe(0)
  })

  it('logoutAll ends every open session', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })
    await client.logoutAll()
    expect(device.state.logouts).toBe(1)
  })
})

describe('answers', () => {
  it('returns the text of an answer that is not JSON', async () => {
    device = await startMockDevice()
    const result = await clientFor(device).request({ ip: '127.0.0.1', path: '/plain', ...creds })
    expect(result).toMatchObject({ ok: true, status: 200, text: 'not json' })
    expect(result.data).toBeUndefined()
  })

  it('reports a path the device does not have', async () => {
    device = await startMockDevice()
    const result = await clientFor(device).request({ ip: '127.0.0.1', path: '/Device/Nothing', ...creds })
    expect(result).toMatchObject({ ok: false, status: 404, kind: 'http' })
    expect(result.error).toContain('/Device/Nothing')
  })

  it('gives up on a device that stops answering', async () => {
    device = await startMockDevice()
    const client = createNvxClient({ port: device.port, allowLoopback: true, timeoutMs: 300 })
    const started = Date.now()
    const result = await client.request({ ip: '127.0.0.1', path: '/hang', ...creds })
    expect(result).toMatchObject({ ok: false, kind: 'network' })
    expect(result.error).toContain('timed out')
    expect(Date.now() - started).toBeLessThan(3000)
  })

  it('gives up on an address that silently drops packets instead of waiting for the OS', async () => {
    // 10.255.255.1 is private and goes nowhere: either nothing answers or the network says "unreachable".
    const client = createNvxClient({ port: 8443, timeoutMs: 300 })
    const started = Date.now()
    const result = await client.request({ ip: '10.255.255.1', path: '/Device/DeviceInfo', ...creds })
    expect(result).toMatchObject({ ok: false, kind: 'network' })
    expect(Date.now() - started).toBeLessThan(3000)
  })

  it('reports a device that is not there', async () => {
    const client = createNvxClient({ port: 1, allowLoopback: true })
    const result = await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })
    expect(result).toMatchObject({ ok: false, kind: 'network' })
    expect(result.error).toContain('127.0.0.1')
  })
})

describe('what is allowed', () => {
  it('refuses addresses outside the private network', async () => {
    const client = createNvxClient()
    for (const ip of ['8.8.8.8', '127.0.0.1', 'example.com', '10.0.0', '', undefined]) {
      expect(await client.request({ ip, path: '/Device/DeviceInfo', ...creds })).toMatchObject({ ok: false, kind: 'invalid' })
    }
  })

  it('recognises the private ranges', () => {
    for (const ip of ['10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.1.1']) expect(isPrivateIPv4(ip)).toBe(true)
    for (const ip of ['172.15.0.1', '172.32.0.1', '192.169.1.1', '11.0.0.1', '1.2.3.4']) expect(isPrivateIPv4(ip)).toBe(false)
  })

  it('accepts only simple device paths', () => {
    expect(isValidPath('/Device/DeviceInfo')).toBe(true)
    expect(isValidPath('/Device/Ethernet?x=1')).toBe(true)
    for (const path of ['Device', '', '//evil.com', '/a b', '/a\r\nHost: x', '/ä', undefined, `/${'a'.repeat(600)}`]) {
      expect(isValidPath(path)).toBe(false)
    }
  })

  it('needs a username and a password', async () => {
    const client = createNvxClient({ allowLoopback: true })
    expect(await client.request({ ip: '10.0.0.5', path: '/Device/DeviceInfo', username: '', password: 'x' })).toMatchObject({ kind: 'invalid' })
  })
})

describe('cookie jar', () => {
  it('stores, replaces and removes cookies', () => {
    const jar = new Map()
    updateJar(jar, ['a=1; Path=/; HttpOnly', 'b=2; Secure'])
    updateJar(jar, ['a=3; Path=/'])
    expect([...jar]).toEqual([['a', '3'], ['b', '2']])
    updateJar(jar, ['b=; Max-Age=0', 'a=9; Expires=Thu, 01 Jan 1970 00:00:00 GMT'])
    expect(jar.size).toBe(0)
  })

  it('keeps a value that itself contains an equals sign', () => {
    const jar = new Map()
    updateJar(jar, ['AuthByPasswd=crypt%3AA97d==; Path=/'])
    expect(jar.get('AuthByPasswd')).toBe('crypt%3AA97d==')
  })
})
