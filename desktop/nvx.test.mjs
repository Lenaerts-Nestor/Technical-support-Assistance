import { createRequire } from 'node:module'
import https from 'node:https'
import { randomBytes } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { generate } from 'selfsigned'

const { createNvxClient, buildMultipart, isPrivateIPv4, isValidPath, updateJar, checkHeaders } = createRequire(import.meta.url)('./nvx.cjs')

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
async function startMockDevice({ user = 'admin', password = 'secret', denyChanges = false, requireXsrf = false } = {}) {
  const state = { sessions: new Map(), pending: new Set(), loginPosts: [], forbidden: 0, requests: [], logouts: 0, changes: [], echoes: [], hostName: 'NVX-LAB' }
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
            ...(requireXsrf ? ['CREST-XSRF-TOKEN=tok123; Path=/; Secure'] : []),
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
    if (req.method === 'POST' && req.url === '/Device') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        if (denyChanges || (requireXsrf && req.headers['x-crest-xsrf-token'] !== 'tok123')) {
          state.forbidden++
          return reply(403, 'Forbidden')
        }
        const sent = JSON.parse(body)
        state.changes.push({ body: sent, contentType: req.headers['content-type'], origin: req.headers.origin, referer: req.headers.referer })
        session.auth = token()
        const results = []
        const eth = sent.Device?.Ethernet ?? {}
        if ('HostName' in eth) {
          state.hostName = eth.HostName
          results.push({ Path: 'Device.Ethernet', Property: 'HostName', StatusId: 1, StatusInfo: 'Reboot needed' })
        }
        if ('MacAddress' in eth) results.push({ Path: 'Device.Ethernet', Property: 'MacAddress', StatusId: -2, StatusInfo: 'Read only' })
        reply(200, JSON.stringify({ Actions: [{ Operation: 'SetPartial', Results: results, TargetObject: 'Ethernet', Version: '2.1.0' }] }), {
          'Set-Cookie': [`AuthByPasswd=${session.auth}; Path=/; Secure; HttpOnly`],
        })
      })
      return
    }
    if (req.url === '/echo') {
      let raw = ''
      const chunks = []
      req.on('data', (c) => {
        raw += c
        chunks.push(c)
      })
      req.on('end', () => {
        session.auth = token()
        state.echoes.push({ method: req.method, headers: req.headers, body: raw, buffer: Buffer.concat(chunks) })
        reply(200, JSON.stringify({ method: req.method, body: raw, contentType: req.headers['content-type'] ?? null }), {
          'Content-Type': 'application/json',
          'X-Mock': 'yes',
          'Set-Cookie': [`AuthByPasswd=${session.auth}; Path=/; Secure; HttpOnly`, 'Other=secret; Path=/'],
        })
      })
      return
    }
    state.requests.push({ url: req.url, referer: req.headers.referer })
    session.auth = token()
    const headers = { 'Set-Cookie': [`AuthByPasswd=${session.auth}; Path=/; Secure; HttpOnly`] }
    if (req.url === '/preview/pic.jpeg') {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', ...headers })
      return res.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x80, 0x81, 0xfe, 0xff]))
    }
    if (req.url === '/Device/DeviceInfo') return reply(200, JSON.stringify({ Device: { DeviceInfo: { Model: 'DM-NVX-E30', Name: 'Lab encoder' } } }), headers)
    if (req.url === '/Device/Ethernet/HostName') return reply(200, JSON.stringify({ Device: { Ethernet: { HostName: state.hostName } } }), headers)
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

describe('changing settings', () => {
  const post = (client, body, extra = {}) =>
    client.request({ ip: '127.0.0.1', method: 'POST', path: '/Device', body: typeof body === 'string' ? body : JSON.stringify(body), ...creds, ...extra })
  const hostName = { Device: { Ethernet: { HostName: 'NVX-NEW' } } }

  it('posts a partial object to /Device and returns what the device answered', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    const result = await post(client, hostName)
    expect(result.ok).toBe(true)
    expect(result.data.Actions[0].Results[0]).toMatchObject({ Property: 'HostName', StatusId: 1, StatusInfo: 'Reboot needed' })
    expect(device.state.changes).toHaveLength(1)
    expect(device.state.changes[0]).toMatchObject({ body: hostName, contentType: 'application/json', origin: 'https://127.0.0.1', referer: 'https://127.0.0.1/' })
    // and the device really changed
    expect((await client.request({ ip: '127.0.0.1', path: '/Device/Ethernet/HostName', ...creds })).data).toEqual(hostName)
  })

  it('reports a status the device gives for one property', async () => {
    device = await startMockDevice()
    const result = await post(clientFor(device), { Device: { Ethernet: { MacAddress: '00.00.00.00.00.00' } } })
    expect(result.data.Actions[0].Results[0]).toMatchObject({ Property: 'MacAddress', StatusId: -2 })
  })

  it('logs in again when the session has dropped and still applies the change once', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    await client.request({ ip: '127.0.0.1', path: '/Device/DeviceInfo', ...creds })
    device.state.sessions.clear()
    expect((await post(client, hostName)).ok).toBe(true)
    expect(device.state.loginPosts).toHaveLength(2)
    expect(device.state.changes).toHaveLength(1)
  })

  it('says so when the device keeps refusing the change after a fresh login', async () => {
    device = await startMockDevice({ denyChanges: true })
    const result = await post(clientFor(device), hostName)
    expect(result).toMatchObject({ ok: false, status: 403, kind: 'http' })
    expect(result.error).toContain('refused the request')
    expect(device.state.changes).toHaveLength(0)
  })

  it('sends the security token back as a header when the device hands it out as a cookie', async () => {
    device = await startMockDevice({ requireXsrf: true })
    expect((await post(clientFor(device), hostName)).ok).toBe(true)
    expect(device.state.changes).toHaveLength(1)
  })

  it('sends the body exactly as written, empty objects included: the person has control', async () => {
    device = await startMockDevice()
    const result = await post(clientFor(device), '{"Device":{"DeviceSpecific":{}}}')
    expect(result.ok).toBe(true)
    expect(device.state.changes[0].body).toEqual({ Device: { DeviceSpecific: {} } })
  })

  it('needs a private address and a login like a read does', async () => {
    const client = createNvxClient()
    expect(await post(client, hostName, { ip: '8.8.8.8' })).toMatchObject({ kind: 'invalid' })
    expect(await post(client, hostName, { ip: '10.0.0.5', username: '' })).toMatchObject({ kind: 'invalid' })
  })
})

describe('requests like Postman', () => {
  const send = (client, fields) => client.request({ ip: '127.0.0.1', path: '/echo', ...creds, ...fields })

  it('sends PUT, PATCH, DELETE and POST with a body, and takes the method in any case', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    for (const method of ['PUT', 'patch', 'DELETE', 'POST']) {
      const result = await send(client, { method, body: '{"a":1}' })
      expect(result.ok).toBe(true)
      expect(result.data).toMatchObject({ method: method.toUpperCase(), body: '{"a":1}', contentType: 'application/json' })
    }
    expect(device.state.loginPosts).toHaveLength(1)
  })

  it('lets your own headers win over the defaults and adds them to the request', async () => {
    device = await startMockDevice()
    const result = await send(clientFor(device), {
      method: 'POST',
      body: 'a=1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Custom': 'hello', referer: 'https://elsewhere/' },
    })
    expect(result.data.contentType).toBe('application/x-www-form-urlencoded')
    const sent = device.state.echoes[0].headers
    expect(sent['x-custom']).toBe('hello')
    expect(sent.referer).toBe('https://elsewhere/')
    expect(sent.origin).toBe('https://127.0.0.1')
  })

  it('refuses headers the app manages, odd names and values, and too many', () => {
    expect(checkHeaders({ Cookie: 'a=b' })).toContain('set by the app')
    expect(checkHeaders({ 'content-length': '5' })).toContain('set by the app')
    expect(checkHeaders({ Host: 'x' })).toContain('set by the app')
    expect(checkHeaders({ 'Proxy-Authorization': 'x' })).toContain('set by the app')
    expect(checkHeaders({ 'Bad Name': 'x' })).toContain('not a valid header name')
    expect(checkHeaders({ A: 'line\r\nInjected: yes' })).toContain('one line')
    expect(checkHeaders({ A: 5 })).toContain('plain text')
    expect(checkHeaders(Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`H${i}`, 'x'])))).toContain('At most')
    expect(checkHeaders({ Accept: 'text/plain', 'X-Anything': 'ok' })).toBeNull()
    expect(checkHeaders(undefined)).toBeNull()
    expect(checkHeaders([])).toContain('name and value')
  })

  it('does not contact the device for a request it will not send', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    for (const fields of [
      { method: 'TRACE' },
      { method: 'GET', body: '{"a":1}' },
      { method: 'POST', body: 'x'.repeat(101 * 1024) },
      { method: 'POST', body: 5 },
      { headers: { Cookie: 'x=y' } },
      { path: 'echo' },
    ]) {
      expect(await send(client, fields)).toMatchObject({ ok: false, kind: 'invalid' })
    }
    expect(device.state.loginPosts).toHaveLength(0)
  })

  it('returns the answer’s headers and size but never the session cookies', async () => {
    device = await startMockDevice()
    const result = await send(clientFor(device), { method: 'POST', body: '{}' })
    expect(result.headers['x-mock']).toBe('yes')
    expect(result.headers['content-type']).toBe('application/json')
    expect(result.headers['set-cookie']).toBeUndefined()
    expect(result.bytes).toBeGreaterThan(10)
  })

  it('hands back a picture as an image, bytes intact', async () => {
    device = await startMockDevice()
    const result = await send(clientFor(device), { path: '/preview/pic.jpeg' })
    expect(result).toMatchObject({ ok: true, status: 200, bytes: 15 })
    expect(result.image.type).toBe('image/jpeg')
    expect([...Buffer.from(result.image.base64, 'base64')]).toEqual([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x80, 0x81, 0xfe, 0xff])
    expect(result.text).toBeUndefined()
    expect(result.data).toBeUndefined()
  })
})

describe('form-data uploads', () => {
  const send = (client, fields) => client.request({ ip: '127.0.0.1', path: '/echo', method: 'POST', ...creds, ...fields })
  const program = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x80, 0x0d, 0x0a, 0x2d, 0x2d])
  const form = [
    { key: 'UploadedFilePath', type: 'text', value: '/data/web/tmp/programload/slot1' },
    { key: 'RequestPayload', type: 'text', value: '{"Device":{"Programs":{}}}' },
    { key: 'UploadedFile', type: 'file', fileName: 'Testing.lpz', data: program },
  ]

  it('sends text and file parts as multipart/form-data with the file bytes intact', async () => {
    device = await startMockDevice()
    const result = await send(clientFor(device), { form })
    expect(result.ok).toBe(true)
    const echoed = device.state.echoes[0]
    const type = echoed.headers['content-type']
    expect(type).toMatch(/^multipart\/form-data; boundary=/)
    expect(echoed.headers.origin).toBe('https://127.0.0.1')
    expect(echoed.buffer.includes(Buffer.from(program))).toBe(true)
    expect(Number(echoed.headers['content-length'])).toBe(echoed.buffer.length)
    expect(echoed.buffer.toString('latin1')).toContain('name="RequestPayload"\r\n\r\n{"Device":{"Programs":{}}}')
  })

  it('builds the parts the way a browser does', () => {
    const { body, contentType } = buildMultipart([...form, { key: 'odd"name', type: 'text', value: 'x' }])
    const boundary = contentType.split('boundary=')[1]
    const text = body.toString('latin1')
    expect(text.startsWith(`--${boundary}\r\n`)).toBe(true)
    expect(text.endsWith(`--${boundary}--\r\n`)).toBe(true)
    expect(text).toContain('Content-Disposition: form-data; name="UploadedFilePath"\r\n\r\n/data/web/tmp/programload/slot1\r\n')
    expect(text).toContain('name="UploadedFile"; filename="Testing.lpz"\r\nContent-Type: application/octet-stream\r\n\r\n')
    expect(text).toContain('name="odd%22name"')
    expect(body.includes(Buffer.from(program))).toBe(true)
  })

  it('overrides a Content-Type header, because only the form knows its boundary', async () => {
    device = await startMockDevice()
    const result = await send(clientFor(device), { form, headers: { 'Content-Type': 'application/json' } })
    expect(result.ok).toBe(true)
    expect(device.state.echoes[0].headers['content-type']).toMatch(/^multipart\/form-data; boundary=/)
  })

  it('refuses a form it cannot send, without contacting the device', async () => {
    device = await startMockDevice()
    const client = clientFor(device)
    for (const fields of [
      { form: [] },
      { form: [{ key: 'f', type: 'file', fileName: 'a.lpz' }] },
      { form: [{ key: '', type: 'text', value: 'x' }] },
      { form: [{ key: 'k', type: 'number', value: 1 }] },
      { form: 'nope' },
      { method: 'GET', form },
      { form: [{ key: 'big', type: 'file', fileName: 'big.bin', data: new Uint8Array(51 * 1024 * 1024) }] },
    ]) {
      expect(await send(client, fields)).toMatchObject({ ok: false, kind: 'invalid' })
    }
    expect(device.state.loginPosts).toHaveLength(0)
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
