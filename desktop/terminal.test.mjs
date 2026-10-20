import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { Server } = require('ssh2')
const { createTerminalManager, parseUnitInfo, parseCommandList, fingerprint, stripAnsi } = require('./terminal.cjs')

// What a DM-NAX-8ZSA printed in the screenshots.
const HOSTNAME_OUTPUT = 'Host Name: Crestron-DM-NAX-8ZSA-2121CRO00284'
const VER_OUTPUT = [
  'DM-NAX-8ZSA [v3.1.0103.18484 (Aug 20 2025), #91A1011C] @E-00107ff42077',
  'Build: Aug 20 2025  (579300)',
  'Updater: 3.1.0103.18484',
  'Bootloader: 0.04.00',
  'CCUI Version: 1.a11.15122b2f',
  'PUF: 3.1.0103.18484',
  'Forced Auth Mode: True',
].join('\r\n')

let hostKeys
beforeAll(() => {
  const make = () => crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs1', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey
  hostKeys = [make(), make()]
})

/** A pretend control console: a banner, a prompt, echo of what is typed, and a few commands. */
const HELP_ALL = [
  '8021XAUthenticate        Administrator       Enable/Disable 802.1x Authentication.',
  'ADDMaster                Administrator       Add a master to the control system.',
  'HELP                     Operator            Display help.',
  'HOSTname                 Administrator       Display/Set the host name.',
  'VER                      Operator            Display version information.',
].join('\r\n')

function startConsole({ keyIndex = 0, port = 0, user = 'admin', password = 'secret', prompt = 'DM-MOCK', silent = false, verDelayMs = 0, maxShells = Infinity } = {}) {
  const state = { windows: [], typed: [], connections: 0, ended: 0, shells: 0 }
  const clients = new Set()
  const server = new Server({ hostKeys: [hostKeys[keyIndex]] }, (client) => {
    state.connections++
    clients.add(client)
    client.on('error', () => {}) // a client that walks away (for example one that refuses our key) is not a problem
    client.on('authentication', (ctx) => (ctx.method === 'password' && ctx.username === user && ctx.password === password ? ctx.accept() : ctx.reject(['password'])))
    client.on('close', () => state.ended++)
    client.on('ready', () => {
      client.on('session', (accept, reject) => {
        if (state.shells >= maxShells) return reject()
        state.shells++
        const session = accept()
        session.on('pty', (ok, _reject, info) => {
          state.windows.push({ cols: info.cols, rows: info.rows })
          ok()
        })
        session.on('window-change', (ok, _reject, info) => {
          state.windows.push({ cols: info.cols, rows: info.rows })
          ok?.()
        })
        session.on('shell', (ok) => {
          const stream = ok()
          if (!silent) stream.write(`\r\n${prompt} Control Console\r\n\r\n${prompt}>`)
          let line = ''
          stream.on('data', (data) => {
            for (const ch of data.toString()) {
              if (ch !== '\r') {
                line += ch
                stream.write(ch) // the device echoes what is typed
                continue
              }
              state.typed.push(line)
              const reply =
                line === 'hostname'
                  ? HOSTNAME_OUTPUT
                  : line === 'ver -v'
                    ? VER_OUTPUT
                    : line === 'help all'
                      ? HELP_ALL
                      : line === 'help'
                        ? 'HELP [ALL|DEV|ETHER]'
                        : line
                          ? `Unknown Parameter: ${line.toUpperCase()}`
                          : ''
              const answer = () => stream.write(`\r\n${reply}${reply ? '\r\n' : ''}\r\n${prompt}>`)
              if (line === 'ver -v' && verDelayMs) setTimeout(answer, verDelayMs)
              else answer()
              line = ''
            }
          })
        })
      })
    })
  })
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () =>
      resolve({
        state,
        port: server.address().port,
        /** The unit drops every connection (a reboot, say). */
        kick: () => clients.forEach((client) => client.end()),
        close: () => {
          clients.forEach((client) => client.end())
          return new Promise((done) => server.close(done))
        },
      }),
    )
  })
}

let consoles = []
let manager
let knownHostsFile
afterEach(async () => {
  manager?.closeAll()
  await Promise.all(consoles.map((c) => c.close()))
  consoles = []
  if (knownHostsFile) fs.rmSync(path.dirname(knownHostsFile), { recursive: true, force: true })
  knownHostsFile = undefined
})

const mockConsole = async (options) => {
  const c = await startConsole(options)
  consoles.push(c)
  return c
}
const newManager = (c, options = {}) => {
  knownHostsFile ??= path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hosts-')), 'known-hosts.json')
  manager = createTerminalManager({ port: c.port, allowLoopback: true, knownHostsFile, ...options })
  return manager
}

/** Collects what a session sends to the page, and lets a test wait for something to arrive. */
function listener() {
  const messages = []
  const waiters = []
  const emit = (message) => {
    messages.push(message)
    for (const w of [...waiters]) w()
  }
  const text = () => Buffer.concat(messages.filter((m) => m.type === 'data').map((m) => m.data)).toString('utf8')
  const until = (check, ms = 4000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out. Got: ${JSON.stringify(text())} ${JSON.stringify(messages.filter((m) => m.type !== 'data'))}`)), ms)
      const test = () => {
        if (check()) {
          clearTimeout(timer)
          waiters.splice(waiters.indexOf(test), 1)
          resolve()
        }
      }
      waiters.push(test)
      test()
    })
  return { emit, messages, text, until }
}

const creds = { ip: '127.0.0.1', username: 'admin', password: 'secret' }

describe('reading the unit’s details', () => {
  it('finds the host name, firmware and PUF in the real console output', () => {
    expect(parseUnitInfo({ hostnameOutput: `hostname\r\n${HOSTNAME_OUTPUT}\r\n\r\nDM-NAX-8ZSA>`, versionOutput: VER_OUTPUT })).toEqual({
      hostname: 'Crestron-DM-NAX-8ZSA-2121CRO00284',
      firmware: 'v3.1.0103.18484',
      puf: '3.1.0103.18484',
    })
  })

  it('leaves out what it cannot find', () => {
    expect(parseUnitInfo({})).toEqual({})
    expect(parseUnitInfo({ versionOutput: 'something else entirely' })).toEqual({})
    expect(parseUnitInfo({ versionOutput: 'DM-NVX-384C v7.4.0255.22319 built' })).toEqual({ firmware: 'v7.4.0255.22319' })
  })

  it('lists the console’s commands from the output of help all', () => {
    const help = ['help all', HELP_ALL, '', 'DM-NAX-8ZSA>', 'Not a command line', '  ', 'ADDMaster   Administrator   duplicate'].join('\r\n')
    expect(parseCommandList(help)).toEqual(['8021XAUthenticate', 'ADDMaster', 'HELP', 'HOSTname', 'VER'])
    expect(parseCommandList('')).toEqual([])
    expect(parseCommandList(undefined)).toEqual([])
  })

  it('writes a key fingerprint the way OpenSSH does and strips colour codes', () => {
    expect(fingerprint(Buffer.from('abc').toString('hex'))).toBe('SHA256:YWJj')
    expect(stripAnsi('\x1b[1;32mDM-X>\x1b[0m')).toBe('DM-X>')
  })
})

describe('opening a terminal', () => {
  it('connects and shows only the unit’s own text; the details are read on a hidden shell', async () => {
    const c = await mockConsole()
    const page = listener()
    const result = await newManager(c).open({ ...creds, cols: 100, rows: 30 }, page.emit)
    expect(result).toMatchObject({ ok: true })
    expect(result.newHostKey).toMatch(/^SHA256:/)

    await page.until(() => page.messages.some((m) => m.type === 'commands'))
    expect(page.messages.find((m) => m.type === 'info')).toMatchObject({ hostname: 'Crestron-DM-NAX-8ZSA-2121CRO00284', firmware: 'v3.1.0103.18484', puf: '3.1.0103.18484' })
    expect(page.messages.find((m) => m.type === 'commands').commands).toEqual(['8021XAUthenticate', 'ADDMaster', 'HELP', 'HOSTname', 'VER'])
    // The terminal itself saw the welcome text and nothing of what the hidden shell did.
    expect(page.text()).toContain('DM-MOCK Control Console')
    expect(page.text().trimEnd().endsWith('DM-MOCK>')).toBe(true)
    expect(page.text()).not.toContain('hostname')
    expect(page.text()).not.toContain('Host Name')
    expect(c.state.typed).toEqual(['hostname', 'ver -v', 'help all'])
    expect(c.state.windows[0]).toEqual({ cols: 100, rows: 30 })
    expect(c.state.shells).toBe(2)
  })

  it('never holds back what is typed, even while a slow unit is still answering the hidden shell', async () => {
    const c = await mockConsole({ verDelayMs: 700 })
    const page = listener()
    const { id } = await newManager(c).open(creds, page.emit)
    await page.until(() => page.text().includes('DM-MOCK>'))
    manager.write(id, 'help\r') // straight away: the details are still being read
    await page.until(() => page.text().includes('HELP [ALL|DEV|ETHER]'), 500)
    expect(page.messages.some((m) => m.type === 'info')).toBe(false)
    await page.until(() => page.messages.some((m) => m.type === 'info'))
  })

  it('then behaves like a plain terminal: keystrokes go in, the unit’s reply comes out', async () => {
    const c = await mockConsole()
    const page = listener()
    const { id } = await newManager(c).open(creds, page.emit)
    await page.until(() => page.messages.some((m) => m.type === 'info'))
    manager.write(id, 'help\r')
    await page.until(() => page.text().includes('HELP [ALL|DEV|ETHER]'))
    manager.write(id, 'foo\r')
    await page.until(() => page.text().includes('Unknown Parameter: FOO'))
  })

  it('uses the id the page chose, and makes one up when it is not usable', async () => {
    const c = await mockConsole()
    const m = newManager(c)
    const chosen = crypto.randomUUID()
    expect((await m.open({ ...creds, id: chosen }, () => {})).id).toBe(chosen)
    expect((await m.open({ ...creds, id: chosen }, () => {})).id).not.toBe(chosen) // already in use
    expect((await m.open({ ...creds, id: 'not an id' }, () => {})).id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('passes a window resize on to the unit', async () => {
    const c = await mockConsole()
    const page = listener()
    const { id } = await newManager(c).open({ ...creds, cols: 80, rows: 24 }, page.emit)
    manager.resize(id, 132, 40)
    await new Promise((r) => setTimeout(r, 300))
    // Only the terminal's own shell is resized; the hidden one keeps its wide window.
    expect(c.state.windows.filter((w) => w.cols === 132 && w.rows === 40)).toHaveLength(1)
    expect(c.state.windows).toContainEqual({ cols: 200, rows: 50 })
  })

  it('closing a terminal ends the connection, hidden shell included, and writing to it afterwards does nothing', async () => {
    const c = await mockConsole()
    const page = listener()
    const { id } = await newManager(c).open(creds, page.emit)
    manager.close(id)
    await new Promise((r) => setTimeout(r, 200))
    expect(c.state.ended).toBe(1)
    expect(() => manager.write(id, 'x')).not.toThrow()
  })

  it('reports it when the unit closes the connection', async () => {
    const c = await mockConsole()
    const page = listener()
    await newManager(c).open(creds, page.emit)
    c.kick()
    await page.until(() => page.messages.some((m) => m.type === 'closed'), 5000)
    expect(page.messages.find((m) => m.type === 'closed').reason).toMatch(/closed|lost/)
  })

  it('still works as a terminal when the unit prints no prompt, and the card gets no details', async () => {
    const c = await mockConsole({ silent: true })
    const page = listener()
    const { id } = await newManager(c, { bannerTimeoutMs: 300 }).open(creds, page.emit)
    await page.until(() => page.messages.some((m) => m.type === 'info'))
    expect(page.messages.find((m) => m.type === 'info')).toEqual({ type: 'info', id })
    expect(page.messages.some((m) => m.type === 'commands')).toBe(false)
    manager.write(id, 'help\r')
    await page.until(() => page.text().includes('HELP [ALL|DEV|ETHER]'))
  })

  it('still works as a terminal when the unit will not open a second shell, and the card gets no details', async () => {
    const c = await mockConsole({ maxShells: 1 })
    const page = listener()
    const { id } = await newManager(c).open(creds, page.emit)
    await page.until(() => page.messages.some((m) => m.type === 'info'))
    expect(page.messages.find((m) => m.type === 'info')).toEqual({ type: 'info', id })
    manager.write(id, 'help\r')
    await page.until(() => page.text().includes('HELP [ALL|DEV|ETHER]'))
    expect(page.text()).toContain('DM-MOCK Control Console')
  })

  it('gives the page a partial card when a command is slow, without ever blocking the terminal', async () => {
    const c = await mockConsole({ verDelayMs: 600 })
    const page = listener()
    await newManager(c, { commandTimeoutMs: 150 }).open(creds, page.emit)
    await page.until(() => page.messages.some((m) => m.type === 'info'))
    expect(page.messages.find((m) => m.type === 'info')).toMatchObject({ hostname: 'Crestron-DM-NAX-8ZSA-2121CRO00284' })
    expect(page.messages.find((m) => m.type === 'info').firmware).toBeUndefined()
  })
})

describe('when it cannot connect', () => {
  it('says so for a wrong password', async () => {
    const c = await mockConsole()
    const result = await newManager(c).open({ ...creds, password: 'nope' }, () => {})
    expect(result).toEqual({ ok: false, error: 'Login refused: wrong username or password.' })
  })

  it('says so when the unit is not listening on SSH', async () => {
    const c = await mockConsole()
    await c.close()
    const result = await newManager(c).open(creds, () => {})
    expect(result.ok).toBe(false)
    expect(result.error).toContain('refused the connection on SSH')
  })

  it('refuses addresses outside the private network and missing logins, without connecting', async () => {
    const c = await mockConsole()
    const m = newManager(c, { allowLoopback: false })
    expect((await m.open(creds, () => {})).ok).toBe(false)
    expect((await m.open({ ...creds, ip: '8.8.8.8' }, () => {})).error).toContain('IPv4 address')
    const lenient = newManager(c)
    expect((await lenient.open({ ...creds, username: '' }, () => {})).error).toContain('username and password')
    expect(c.state.connections).toBe(0)
  })

  it('limits how many terminals are open at once', async () => {
    const c = await mockConsole()
    const m = newManager(c)
    for (let i = 0; i < 12; i++) expect((await m.open(creds, () => {})).ok).toBe(true)
    expect((await m.open(creds, () => {})).error).toContain('At most 12')
  }, 30_000)
})

describe('host keys', () => {
  it('remembers a unit’s key the first time and accepts the same key afterwards', async () => {
    const c = await mockConsole()
    const m = newManager(c)
    const first = await m.open(creds, () => {})
    expect(first.newHostKey).toMatch(/^SHA256:/)
    m.closeAll()
    const second = await m.open(creds, () => {})
    expect(second.ok).toBe(true)
    expect(second.newHostKey).toBeUndefined()
    expect(Object.keys(JSON.parse(fs.readFileSync(knownHostsFile, 'utf8')))).toEqual([`127.0.0.1:${c.port}`])
  })

  it('refuses a different key for the same unit, and accepts it once the old one is forgotten', async () => {
    const first = await mockConsole({ keyIndex: 0 })
    const m = newManager(first)
    expect((await m.open(creds, () => {})).ok).toBe(true)
    m.closeAll()
    const port = first.port
    await first.close()
    consoles = []
    const replaced = await startConsole({ keyIndex: 1, port })
    consoles.push(replaced)

    const refused = await m.open(creds, () => {})
    expect(refused).toMatchObject({ ok: false, hostKeyChanged: true })
    expect(refused.fingerprint).toMatch(/^SHA256:/)
    expect(refused.error).toContain('not the one seen before')

    m.forgetHost('127.0.0.1')
    expect((await m.open(creds, () => {})).ok).toBe(true)
  })

  it('works without a file, remembering for the session only', async () => {
    const c = await mockConsole()
    manager = createTerminalManager({ port: c.port, allowLoopback: true })
    expect((await manager.open(creds, () => {})).newHostKey).toMatch(/^SHA256:/)
    manager.closeAll()
    expect((await manager.open(creds, () => {})).newHostKey).toBeUndefined()
  })
})
